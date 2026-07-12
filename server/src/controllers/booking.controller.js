import { Booking } from '../models/Booking.js';
import { Asset } from '../models/Asset.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';
import { logActivity } from '../utils/activityLogger.js';
import { emitBookingCreated, emitBookingUpdated } from '../sockets/index.js';

const POP = [
  { path: 'resource', select: 'name assetTag isBookable' },
  { path: 'bookedBy', select: 'name email' },
];

/** Derive the display status from the clock (stored status wins if Cancelled). */
function withDisplay(b) {
  const o = b.toObject ? b.toObject() : b;
  const now = Date.now();
  let displayStatus = o.status;
  if (o.status !== 'Cancelled') {
    if (now < new Date(o.startTime)) displayStatus = 'Upcoming';
    else if (now <= new Date(o.endTime)) displayStatus = 'Ongoing';
    else displayStatus = 'Completed';
  }
  return { ...o, displayStatus };
}

/** GET /api/bookings?resource=&date= -> list (optionally for one resource/day). */
export const listBookings = asyncHandler(async (req, res) => {
  const { resource, date } = req.query;
  const filter = {};
  if (resource) filter.resource = resource;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    // Any booking that overlaps the chosen day.
    filter.startTime = { $lt: end };
    filter.endTime = { $gt: start };
  }
  const bookings = await Booking.find(filter).populate(POP).sort({ startTime: 1 });
  res.json({ success: true, data: { bookings: bookings.map(withDisplay) } });
});

/**
 * POST /api/bookings -> reserve a slot.
 * Graded rule: reject if any non-cancelled booking on the same resource overlaps
 * (existingStart < newEnd && existingEnd > newStart) -> 409.
 */
export const createBooking = asyncHandler(async (req, res) => {
  const { resource: resourceId, purpose = '', startTime, endTime } = req.body;

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!(start < end)) throw new ApiError(400, 'End time must be after start time');

  const resource = await Asset.findById(resourceId);
  if (!resource) throw new ApiError(404, 'Resource not found');
  if (!resource.isBookable) throw new ApiError(400, 'This asset is not bookable');

  // Overlap guard.
  const clash = await Booking.findOne({
    resource: resourceId,
    status: { $ne: 'Cancelled' },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (clash) throw new ApiError(409, 'Time slot overlaps an existing booking');

  let booking = await Booking.create({
    resource: resourceId,
    bookedBy: req.user._id,
    purpose,
    startTime: start,
    endTime: end,
  });
  booking = await booking.populate(POP);

  const slot = `${fmtTime(start)} to ${fmtTime(end)}`;
  await notify({
    user: req.user._id,
    type: 'booking',
    message: `Booking confirmed: ${resource.name} (${resource.assetTag}) — ${slot}`,
    link: '/booking',
  });
  await logActivity({
    actor: req.user._id,
    action: 'booking.created',
    summary: `${resource.name} ${resource.assetTag} — booking confirmed — ${slot}`,
    entityType: 'Booking',
    entityId: booking._id,
  });
  emitBookingCreated(withDisplay(booking));

  res.status(201).json({ success: true, data: { booking: withDisplay(booking) } });
});

/** PATCH /api/bookings/:id/cancel -> owner or manager cancels a booking. */
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(POP);
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isOwner = booking.bookedBy._id.toString() === req.user._id.toString();
  const isManager = ['asset_manager', 'admin'].includes(req.user.role);
  if (!isOwner && !isManager) throw new ApiError(403, 'Not your booking');

  booking.status = 'Cancelled';
  await booking.save();

  await notify({
    user: booking.bookedBy._id,
    type: 'booking',
    message: `Booking cancelled: ${booking.resource.name} (${booking.resource.assetTag})`,
    link: '/booking',
  });
  await logActivity({
    actor: req.user._id,
    action: 'booking.cancelled',
    summary: `${booking.resource.name} ${booking.resource.assetTag} — booking cancelled`,
    entityType: 'Booking',
    entityId: booking._id,
  });
  emitBookingUpdated(withDisplay(booking));

  res.json({ success: true, data: { booking: withDisplay(booking) } });
});

function fmtTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
