const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { env } = require('../config/env');

/** 404 handler for unmatched routes - placed after all routers. */
function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler (FR-20.6). Converts any thrown error into the
 * standard { success, statusCode, message } shape and NEVER leaks stack
 * traces or internal details in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  // Normalize common non-ApiError failures into ApiError so the response
  // shape is always consistent, without leaking driver/library internals.
  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      error = ApiError.badRequest('Validation failed', error.errors);
    } else if (error.code === 11000) {
      error = ApiError.conflict('Duplicate value violates a unique constraint');
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest('Invalid identifier format');
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Invalid or expired token');
    } else {
      error = ApiError.internal(env.isProd ? 'Internal server error' : error.message);
    }
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
  }

  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(!env.isProd && err.stack ? { stack: err.stack } : {}), // stack only outside production
  });
}

module.exports = { notFoundHandler, errorHandler };
