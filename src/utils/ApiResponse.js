/**
 * Standard success response shape. Every successful controller response
 * should use this so the frontend can rely on one consistent contract:
 * { success, statusCode, message, data }
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
