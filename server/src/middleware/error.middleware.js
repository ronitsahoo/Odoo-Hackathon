import { ApiError } from '../utils/ApiError.js';

/** 404 handler for any unmatched route. Registered before the error handler. */
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central error handler. Always the LAST middleware mounted.
 * Normalizes everything to the { success:false, message, errors? } envelope.
 */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Friendlier messages for common Mongoose errors.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already in use`;
  }

  if (statusCode >= 500) console.error('✗ Server error:', err);

  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });
};
