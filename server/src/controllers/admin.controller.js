import { User } from '../models/User.js';
import { Item } from '../models/Item.js';
import { Request } from '../models/Request.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';
import { emitItemUpdated, emitItemDeleted } from '../sockets/index.js';

/** GET /api/admin/stats -> numbers for the dashboard stat cards. */
export const getStats = asyncHandler(async (req, res) => {
  const [users, banned, itemsByStatus, requestsByStatus, pendingModeration] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    Item.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Item.countDocuments({ status: 'pending' }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      banned,
      pendingModeration,
      items: toCountMap(itemsByStatus),
      requests: toCountMap(requestsByStatus),
    },
  });
});

/** GET /api/admin/users -> all users (for the management table). */
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { users } });
});

/** PATCH /api/admin/users/:id/ban  body { isBanned } -> ban/unban. */
export const setBan = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot ban yourself');
  }
  user.isBanned = Boolean(req.body.isBanned);
  await user.save();
  res.json({ success: true, data: { user } });
});

/** PATCH /api/admin/users/:id/role  body { role } -> change role. */
export const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.role = role;
  await user.save();
  res.json({ success: true, data: { user } });
});

/** GET /api/admin/moderation -> the queue of pending items. */
export const listModerationQueue = asyncHandler(async (req, res) => {
  const items = await Item.find({ status: 'pending' })
    .populate('owner', 'name avatar')
    .sort({ createdAt: 1 });
  res.json({ success: true, data: { items } });
});

/** PATCH /api/admin/items/:id/moderate  body { status } -> approve/reject. */
export const moderateItem = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(status)) throw new ApiError(400, 'Invalid status');

  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');

  item.status = status;
  await item.save();
  await item.populate('owner', 'name avatar role');

  emitItemUpdated(item); // live: appears on/disappears from public Home instantly
  await notify({
    user: item.owner._id,
    type: 'moderation',
    message: `Your item "${item.title}" was ${status}`,
    link: `/items/${item._id}`,
  });

  res.json({ success: true, data: { item } });
});

/** DELETE /api/admin/items/:id -> admin hard-delete of any item. */
export const adminDeleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  await item.deleteOne();
  emitItemDeleted(item._id);
  res.json({ success: true, data: { id: item._id } });
});

/**
 * POST /api/admin/broadcast  body { message, link } -> notify every user.
 * Inserts one Notification per user and pushes each live.
 */
export const broadcast = asyncHandler(async (req, res) => {
  const { message, link = '' } = req.body;
  const users = await User.find().select('_id');

  // Fan out; notify() handles the socket push per recipient.
  await Promise.all(
    users.map((u) => notify({ user: u._id, type: 'broadcast', message, link }))
  );

  res.status(201).json({ success: true, data: { count: users.length } });
});

// --- helpers ---------------------------------------------------------------

/** Turn an aggregate [{_id:'pending',count:3}] into { pending: 3 }. */
function toCountMap(rows) {
  return rows.reduce((acc, r) => {
    acc[r._id] = r.count;
    return acc;
  }, {});
}
