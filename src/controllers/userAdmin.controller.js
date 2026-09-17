const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { User } = require('../models');

/** General "any role" user management (gap-analysis module 10). */
const listUsers = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const users = await User.find(filter).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { users }, 'Users fetched'));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, school: req.user.school });
  if (!user) throw ApiError.notFound('User not found');
  return res.status(200).json(new ApiResponse(200, { user }, 'User fetched'));
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, school: req.user.school });
  if (!user) throw ApiError.notFound('User not found');
  const b = req.body;

  if (b.email && b.email !== user.email) {
    const existing = await User.findOne({ email: b.email });
    if (existing) throw ApiError.conflict('Another account already uses this email');
  }
  ['fullName', 'email', 'phone'].forEach((f) => {
    if (b[f] !== undefined) user[f] = b[f];
  });
  await user.save();

  return res.status(200).json(new ApiResponse(200, { user }, 'User updated'));
});

/** Admin sets a new password directly (e.g. "forgot password" support) and revokes old sessions. */
const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, school: req.user.school });
  if (!user) throw ApiError.notFound('User not found');

  await user.setPassword(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidates existing tokens
  user.passwordResetUsed = false;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Password reset'));
});

/** Activate/deactivate any account; deactivating also revokes existing sessions. */
const setStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, school: req.user.school });
  if (!user) throw ApiError.notFound('User not found');

  user.isActive = req.body.isActive;
  if (!req.body.isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.status(200).json(new ApiResponse(200, { user }, `User ${req.body.isActive ? 'activated' : 'deactivated'}`));
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, school: req.user.school });
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');

  await user.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'User deleted'));
});

module.exports = { listUsers, getUser, updateUser, resetPassword, setStatus, deleteUser };