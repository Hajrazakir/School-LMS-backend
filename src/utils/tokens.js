const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../config/env');

/** Short-lived access token carrying identity + role for RBAC checks (FR-1.1, FR-1.7). */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

/** Long-lived refresh token, used only to mint new access tokens (FR-1.1, FR-1.9). */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiry }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/**
 * One-time, time-boxed tokens for email verification / password reset.
 * We store only a SHA-256 hash of the raw token in the DB, mirroring the
 * refresh-token pattern, so a DB leak alone can't be used to reset accounts.
 */
function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
};
