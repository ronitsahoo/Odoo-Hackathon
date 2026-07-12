import mongoose from 'mongoose';

/**
 * Notification: an in-app message for a single user.
 * Created on request transitions and admin broadcasts, then pushed live to the
 * recipient's `user:<id>` socket room so the navbar bell updates instantly.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Type maps to Screen 10 tabs: alert, approval, booking, info (default/general)
    // info = general notifications; alert = overdue/audit; approval = maintenance/transfer; booking = resource bookings
    type: { type: String, enum: ['info', 'alert', 'approval', 'booking'], default: 'info', index: true },
    message: { type: String, required: true },
    link: { type: String, default: '' }, // client route to open on click
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
