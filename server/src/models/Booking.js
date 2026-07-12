import mongoose from 'mongoose';

/**
 * Booking: a time-slot reservation of a bookable resource (an Asset with
 * isBookable: true) — rooms, vehicles, projectors. Stored status is the
 * lifecycle; a display status (Upcoming/Ongoing/Completed) is derived from the
 * current time on read so we don't need a cron to advance it.
 */
const bookingSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, default: '', maxlength: 200 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
    },
    reminded: { type: Boolean, default: false }, // "starting soon" notification sent
  },
  { timestamps: true }
);

bookingSchema.index({ resource: 1, startTime: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
