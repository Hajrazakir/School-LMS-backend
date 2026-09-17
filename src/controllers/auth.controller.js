const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { User, School } = require('../models');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
} = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const { recordAudit } = require('../services/audit.service');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { env } = require('../config/env');

const cookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: 'strict',
};

function issueTokenCookies(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return { accessToken, refreshToken };
}

/**
 * FR-1.2: Only Super Admin / School Admin can create accounts.
 * Public self-registration is intentionally NOT exposed on any route.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role, schoolId } = req.body;
  const creator = req.user; // set by verifyJWT - this route is admin-protected

  if (creator.role === 'school_admin' && role === 'super_admin') {
    throw ApiError.forbidden('School Admin cannot create a Super Admin account');
  }

  const targetSchool = creator.role === 'super_admin' ? schoolId : creator.school;
  if (role !== 'super_admin' && !targetSchool) {
    throw ApiError.badRequest('schoolId is required for this role');
  }
  if (targetSchool) {
    const school = await School.findById(targetSchool);
    if (!school) throw ApiError.badRequest('Invalid schoolId');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = new User({
    fullName,
    email,
    phone,
    role,
    school: targetSchool || undefined,
    createdBy: creator._id,
  });
  await user.setPassword(password);

  const rawToken = generateRawToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await user.save();
  await sendVerificationEmail(user, rawToken);

  await recordAudit({
    req,
    school: targetSchool,
    user: creator._id,
    role: creator.role,
    action: 'USER_CREATED',
    module: 'auth',
    newValue: { createdUserId: user._id, role: user.role, email: user.email },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { user }, 'Account created. A verification email has been sent.'));
});

/** FR-1.5: Email must be verified before the account can log in. */
const verifyEmail = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  const user = await User.findById(userId).select(
    '+emailVerificationTokenHash +emailVerificationExpires'
  );
  if (!user || !user.emailVerificationTokenHash) {
    throw ApiError.badRequest('Invalid or already-used verification link');
  }
  if (user.emailVerificationExpires < new Date()) {
    throw ApiError.badRequest('Verification link has expired');
  }
  if (hashToken(token) !== user.emailVerificationTokenHash) {
    throw ApiError.badRequest('Invalid verification link');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Email verified successfully. You can now log in.'));
});

/** FR-1.1, NFR-7: login issues JWT pair; locks account after repeated failures. */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    '+passwordHash +failedLoginAttempts +lockUntil'
  );

  // Constant-shaped error regardless of which check fails, to avoid
  // leaking whether an email exists.
  const invalidCreds = () => ApiError.unauthorized('Invalid email or password');

  if (!user) throw invalidCreds();

  if (user.isLocked()) {
    throw ApiError.tooManyRequests(
      `Account temporarily locked due to repeated failed logins. Try again after ${user.lockUntil.toISOString()}.`
    );
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= env.login.maxAttempts) {
      user.lockUntil = new Date(Date.now() + env.login.lockoutMinutes * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    await recordAudit({ req, school: user.school, user: user._id, role: user.role, action: 'LOGIN_FAILED', module: 'auth' });
    throw invalidCreds();
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Your account has been deactivated. Contact your school administrator.');
  }
  if (!user.isEmailVerified) {
    throw ApiError.unauthorized('Please verify your email before logging in.');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const { accessToken, refreshToken } = issueTokenCookies(res, user);

  await recordAudit({ req, school: user.school, user: user._id, role: user.role, action: 'LOGIN_SUCCESS', module: 'auth' });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user, accessToken, refreshToken },
      'Login successful'
    )
  );
});

/** FR-1.9: silent access-token renewal while the refresh token is valid. */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incoming) throw ApiError.unauthorized('Refresh token missing');

  let decoded;
  try {
    decoded = verifyRefreshToken(incoming);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid session');
  if ((user.tokenVersion || 0) !== decoded.tokenVersion) {
    throw ApiError.unauthorized('Session has been invalidated, please log in again');
  }

  const { accessToken, refreshToken } = issueTokenCookies(res, user);
  return res.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, 'Token refreshed'));
});

/** FR-1.9: invalidate refresh token on logout by clearing cookies. tokenVersion bump = logout-all-devices. */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/** Invalidates ALL active sessions for this user immediately (used after deactivation, password change, or user request). */
const logoutAllDevices = asyncHandler(async (req, res) => {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  return res.status(200).json(new ApiResponse(200, null, 'Logged out of all devices'));
});

/** FR-1.4: request a password reset link, valid 30 minutes, single use. */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return a generic success message - never reveal whether the email exists.
  if (user) {
    const rawToken = generateRawToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min (FR-1.4)
    user.passwordResetUsed = false;
    await user.save();
    await sendPasswordResetEmail(user, rawToken);
    await recordAudit({ req, school: user.school, user: user._id, role: user.role, action: 'PASSWORD_RESET_REQUESTED', module: 'auth' });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'If that email exists, a password reset link has been sent.'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;

  const user = await User.findById(userId).select(
    '+passwordResetTokenHash +passwordResetExpires +passwordResetUsed'
  );
  if (!user || !user.passwordResetTokenHash) {
    throw ApiError.badRequest('Invalid or expired reset link');
  }
  if (user.passwordResetUsed) {
    throw ApiError.badRequest('This reset link has already been used');
  }
  if (user.passwordResetExpires < new Date()) {
    throw ApiError.badRequest('Reset link has expired');
  }
  if (hashToken(token) !== user.passwordResetTokenHash) {
    throw ApiError.badRequest('Invalid reset link');
  }

  await user.setPassword(newPassword);
  user.passwordResetUsed = true;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // force re-login everywhere
  await user.save();

  await recordAudit({ req, school: user.school, user: user._id, role: user.role, action: 'PASSWORD_RESET_COMPLETED', module: 'auth' });

  return res.status(200).json(new ApiResponse(200, null, 'Password has been reset. Please log in again.'));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  await user.setPassword(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await recordAudit({ req, school: user.school, user: user._id, role: user.role, action: 'PASSWORD_CHANGED', module: 'auth' });

  return res.status(200).json(new ApiResponse(200, null, 'Password changed. Please log in again.'));
});

/** FR-1.6: activate/deactivate/delete any user account; deactivation revokes active sessions. */
const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  const target = await User.findById(userId);
  if (!target) throw ApiError.notFound('User not found');

  if (req.user.role === 'school_admin' && String(target.school) !== String(req.user.school)) {
    throw ApiError.forbidden('Cannot manage users outside your school');
  }

  const oldValue = { isActive: target.isActive };
  target.isActive = isActive;
  if (!isActive) {
    target.tokenVersion = (target.tokenVersion || 0) + 1; // revoke active sessions immediately
  }
  await target.save();

  await recordAudit({
    req,
    school: target.school,
    user: req.user._id,
    role: req.user.role,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    module: 'auth',
    oldValue,
    newValue: { isActive },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { user: target }, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const target = await User.findById(userId);
  if (!target) throw ApiError.notFound('User not found');

  if (req.user.role === 'school_admin' && String(target.school) !== String(req.user.school)) {
    throw ApiError.forbidden('Cannot manage users outside your school');
  }

  await target.deleteOne();

  await recordAudit({
    req,
    school: target.school,
    user: req.user._id,
    role: req.user.role,
    action: 'USER_DELETED',
    module: 'auth',
    oldValue: { userId: target._id, email: target.email, role: target.role },
  });

  return res.status(200).json(new ApiResponse(200, null, 'User deleted'));
});

/** FR-1.8: every user can update their own profile fields + image. */
const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { user: req.user }, 'Current user'));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  const user = req.user;

  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  return res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

/** FR-1.8: replace profile image, stored on Cloudinary; deletes the old asset. */
const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const user = req.user;
  const oldPublicId = user.profileImage?.publicId;

  const { url, publicId } = await uploadBufferToCloudinary(
    req.file.buffer,
    `school-lms/profile-images/${user._id}`
  );

  user.profileImage = { url, publicId };
  await user.save();

  if (oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return res.status(200).json(new ApiResponse(200, { user }, 'Profile image updated'));
});

module.exports = {
  registerUser,
  verifyEmail,
  login,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  changePassword,
  setUserActiveStatus,
  deleteUser,
  getMe,
  updateProfile,
  updateProfileImage,
};
