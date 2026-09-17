const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const { User } = require('../models');

/**
 * Verifies the JWT access token from the Authorization header (or cookie),
 * loads the user, and rejects if the token is stale (tokenVersion mismatch -
 * e.g. after logout-all, password change, or admin deactivation) or the
 * account is deactivated.
 */
const verifyJWT = asyncHandler(async (req, _res, next) => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  const token = headerToken || req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized('Access token missing');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }
  if (!user.isActive) {
    throw ApiError.unauthorized('Account has been deactivated');
  }
  if ((user.tokenVersion || 0) !== decoded.tokenVersion) {
    throw ApiError.unauthorized('Session has been invalidated, please log in again');
  }

  req.user = user; // full doc (minus select:false fields) available downstream
  next();
});

/**
 * Role-based access control (FR-1.7). Usage: authorizeRoles('school_admin', 'super_admin')
 */
const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

module.exports = { verifyJWT, authorizeRoles };
