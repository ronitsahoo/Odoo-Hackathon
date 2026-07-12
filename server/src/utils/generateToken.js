import jwt from 'jsonwebtoken';

/**
 * Sign a JWT for a user id. Expiry is configurable via JWT_EXPIRES_IN (default 7d).
 */
export function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
