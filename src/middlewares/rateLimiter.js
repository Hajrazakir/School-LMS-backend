const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

/** Applied to /auth/login, /auth/forgot-password, etc. (FR-20.2, NFR-7 support) */
const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMin * 60 * 1000,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many attempts, please try again later.' },
});

/** Applied to payment-initiation and webhook endpoints (FR-20.2) */
const paymentLimiter = rateLimit({
  windowMs: env.rateLimit.paymentWindowMin * 60 * 1000,
  max: env.rateLimit.paymentMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many payment requests, please slow down.' },
});

/** General-purpose lighter limiter for the rest of the API. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, paymentLimiter, generalLimiter };
