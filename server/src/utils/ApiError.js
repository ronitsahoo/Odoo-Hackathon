/**
 * Typed error carrying an HTTP status code so the central error handler
 * can respond with the right status without guessing.
 * Usage: throw new ApiError(404, 'Item not found');
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}
