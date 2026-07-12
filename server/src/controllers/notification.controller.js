import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitNotification } from '../sockets/index.js';

/**
 * Map a domain event type to a Screen-10 notification category. Callers pass a
 * readable domain type ('allocation', 'transfer', 'overdue', 'booking', …);
 * this collapses it to the stored enum (info | alert | approval | booking) so
 * the tabs (All · Alerts · Approvals · Bookings) group correctly and the
 * Notification schema's enum validation never rejects the write.
 */
const TYPE_CATEGORY = {
  info: 'info',
  alert: 'alert',
  approval: 'approval',
  booking: 'booking',
  // domain aliases
  allocation: 'info', // "asset assigned/returned" → general
  overdue: 'alert',
  audit: 'alert',
  transfer: 'approval',
  maintenance: 'approval',
  broadcast: 'info',
};

/**
 * Create a notification and push it to the recipient's socket room in one call.
 * Reused by every module's side-effects — import this instead of duplicating
 * the create+emit dance.
 */
export async function notify({ user, type = 'info', message, link = '' }) {
  const category = TYPE_CATEGORY[type] || 'info';
  const notification = await Notification.create({ user, type: category, message, link });
  emitNotification(user.toString(), notification);
  return notification;
}

/** GET /api/notifications -> current user's notifications, newest first, with optional type filter. */
export const listNotifications = asyncHandler(async (req, res) => {
  const { type } = req.query; // 'all', 'alert', 'approval', 'booking' or undefined
  
  const filter = { user: req.user._id };
  // If type is provided and not 'all', filter by that type
  if (type && type !== 'all') {
    filter.type = type;
  }
  
  const notifications = await Notification.find(filter)
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
