import { Request } from '../models/Request.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';

/**
 * ============================================================================
 * REQUEST WORKFLOW — the universal user-to-user interaction.
 * ============================================================================
 * Maps to swaps (Skill Swap), bookings (QuickCourt), ticket assignment
 * (QuickDesk) and approvals (Expenses). Every status transition creates a
 * Notification for the counterparty and pushes it live to their user:<id> room.
 *
 * Allowed transitions:
 *   sender  : pending -> cancelled ; accepted -> completed
 *   owner   : pending -> accepted | rejected ; accepted -> completed
 * ============================================================================
 */

const POP = [
  { path: 'item', select: 'title status owner' },
  { path: 'fromUser', select: 'name avatar' },
  { path: 'toUser', select: 'name avatar' },
];

/** POST /api/requests  body { itemId, message, meta } -> open a request. */
export const createRequest = asyncHandler(async (req, res) => {
  const { itemId, message = '', meta = {} } = req.body;

  const item = await Item.findById(itemId);
  if (!item) throw new ApiError(404, 'Item not found');

  const senderId = req.user._id.toString();
  if (item.owner.toString() === senderId) {
    throw new ApiError(400, 'You cannot send a request on your own item');
  }

  // Avoid duplicate open requests from the same user on the same item.
  const existing = await Request.findOne({
    item: item._id,
    fromUser: req.user._id,
    status: 'pending',
  });
  if (existing) throw new ApiError(409, 'You already have a pending request on this item');

  let request = await Request.create({
    item: item._id,
    fromUser: req.user._id,
    toUser: item.owner,
    message,
    meta,
  });
  request = await request.populate(POP);

  await notify({
    user: item.owner,
    type: 'request',
    message: `${req.user.name} sent a request on "${item.title}"`,
    link: `/dashboard`,
  });

  res.status(201).json({ success: true, data: { request } });
});

/** GET /api/requests?box=incoming|outgoing -> requests for the current user. */
export const listRequests = asyncHandler(async (req, res) => {
  const { box = 'incoming' } = req.query;
  const filter =
    box === 'outgoing' ? { fromUser: req.user._id } : { toUser: req.user._id };

  const requests = await Request.find(filter).populate(POP).sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
});

/**
 * PATCH /api/requests/:id  body { status } -> transition a request.
 * Authorization + legality of the transition are enforced per role.
 */
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // validated to the enum
  const request = await Request.findById(req.params.id).populate(POP);
  if (!request) throw new ApiError(404, 'Request not found');

  const userId = req.user._id.toString();
  const isOwner = request.toUser._id.toString() === userId; // item owner / approver
  const isSender = request.fromUser._id.toString() === userId;
  if (!isOwner && !isSender) throw new ApiError(403, 'Not your request');

  const allowed = legalTransition(request.status, status, { isOwner, isSender });
  if (!allowed) throw new ApiError(400, `Cannot change ${request.status} -> ${status}`);

  request.status = status;
  await request.save();

  // Notify the *other* party of the change.
  const counterparty = isOwner ? request.fromUser._id : request.toUser._id;
  await notify({
    user: counterparty,
    type: 'request',
    message: `Request on "${request.item.title}" was ${status}`,
    link: `/dashboard`,
  });

  res.json({ success: true, data: { request } });
});

/**
 * Which transitions each party may perform. Returning true = allowed.
 * Kept as a small pure function so it's trivial to read in a code review.
 */
function legalTransition(current, next, { isOwner, isSender }) {
  const rules = {
    pending: {
      accepted: isOwner,
      rejected: isOwner,
      cancelled: isSender,
    },
    accepted: {
      completed: isOwner || isSender,
      cancelled: isSender,
    },
  };
  return Boolean(rules[current]?.[next]);
}
