/**
 * Standard application error. Throw this from controllers/services instead
 * of a generic Error so the centralized error middleware (FR-20.6) can
 * return a consistent, safe response shape.
 */
class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
  static notImplemented(message = 'Not implemented yet') {
    return new ApiError(501, message);
  }
}

module.exports = ApiError;
