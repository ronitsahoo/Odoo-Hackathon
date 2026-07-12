import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Gate a route by role. Assumes `protect` ran first so req.user exists.
 * Usage: router.get('/admin', protect, requireRole('admin'), handler)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Insufficient permissions'));
  }
  next();
};

/**
 * Optional auth: attach req.user if a valid token is present, otherwise
 * continue as a guest. Lets the same GET route serve guests and users.
 * A banned user is treated as a guest here (they simply can't act on writes).
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (user && !user.isBanned) req.user = user;
  } catch {
    // Ignore bad tokens on optional routes — just proceed as guest.
  }
  next();
});
