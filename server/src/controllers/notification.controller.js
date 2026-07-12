import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitNotification } from '../sockets/index.js';

/**
 * Create a notification and push it to the recipient's socket room in one call.
 * Reused by the request workflow and admin broadcasts — import this instead of
 * duplicating the create+emit dance.
 */
export async function notify({ user, type = 'info', message, link = '' }) {
  const notification = await Notification.create({ user, type, message, link });
  emitNotification(user.toString(), notification);
  return notification;
}

/** GET /api/notifications -> current user's notifications, newest first. */
export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, data: { notifications, unread } });
});

/** PATCH /api/notifications/:id/read -> mark one read. */
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.json({ success: true, data: { notification } });
});

/** PATCH /api/notifications/read-all -> mark all read. */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, data: { ok: true } });
});
