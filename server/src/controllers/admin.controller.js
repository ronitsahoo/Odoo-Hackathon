import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';

export const getStats = asyncHandler(async (req, res) => {
  const [users, banned] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      banned,
    },
  });
});

export const broadcast = asyncHandler(async (req, res) => {
  const { message, link = '' } = req.body;
  const users = await User.find().select('_id');

  await Promise.all(
    users.map((u) => notify({ user: u._id, type: 'broadcast', message, link }))
  );

  res.status(201).json({ success: true, data: { count: users.length } });
});
