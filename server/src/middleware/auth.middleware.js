import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Require a valid JWT. Loads the user onto req.user or 401s.
 * Banned users are rejected here with 403 so a token alone can't act.
 */
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'User no longer exists');
  if (user.isBanned) throw new ApiError(403, 'Your account has been banned');
  // Re-check status every request so mid-session deactivation takes effect.
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account deactivated — contact an admin');
  }

  req.user = user;
  next();
});
