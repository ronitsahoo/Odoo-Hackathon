import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken } from '../utils/generateToken.js';

/** POST /api/auth/register -> create account + return token. */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'That email is already registered');

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  res.status(201).json({ success: true, data: { user, token } });
});

/** POST /api/auth/login -> verify credentials + return token. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // password has select:false, so pull it explicitly for the compare.
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  if (user.isBanned) throw new ApiError(403, 'Your account has been banned');

  const token = generateToken(user._id);
  res.json({ success: true, data: { user, token } });
});

/** GET /api/auth/me -> the current user (from the token). */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

/** PATCH /api/auth/profile -> edit own profile. */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, isPublic, avatar } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (isPublic !== undefined) user.isPublic = isPublic;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.json({ success: true, data: { user } });
});
