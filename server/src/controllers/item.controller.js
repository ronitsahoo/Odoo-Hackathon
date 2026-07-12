import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.middleware.js';
import {
  emitItemCreated,
  emitItemUpdated,
  emitItemDeleted,
} from '../sockets/index.js';

/**
 * ============================================================================
 * REFERENCE FEATURE — clone this controller to add a new resource.
 * ============================================================================
 * This file is the canonical CRUD + search + vote + real-time controller.
 * Copy it, swap `Item` for your model, and keep the shape:
 *   - list(): text search + category/status filter + sort + pagination
 *   - ownership check via isOwnerOrAdmin() before edit/delete
 *   - socket emit on every mutation so lists update live
 * ============================================================================
 */

const OWNER_FIELDS = 'name avatar role';

/** True if the requester owns the item or is an admin. */
function isOwnerOrAdmin(item, user) {
  return user && (item.owner.toString() === user._id.toString() || user.role === 'admin');
}

/**
 * GET /api/items
 * Query: search, category, status, sort, page, limit.
 * Guests / non-owners only ever see `approved` items; admins may pass any status.
 * Returns { items, total, page, pages }.
 */
export const listItems = asyncHandler(async (req, res) => {
  const { search = '', category = '', status = '', sort = 'new', mine = '' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const filter = {};

  // Only admins can browse non-approved items via the status filter.
  // "mine=true" lets a logged-in user see their own items in any status.
  if (mine === 'true' && req.user) {
    filter.owner = req.user._id;
    if (status) filter.status = status;
  } else if (req.user?.role === 'admin' && status) {
    filter.status = status;
  } else {
    filter.status = 'approved';
  }

  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const sortMap = {
    new: { createdAt: -1 },
    old: { createdAt: 1 },
    top: { 'upvotes.0': -1, createdAt: -1 }, // simple popularity proxy
    rating: { ratingAvg: -1, createdAt: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.new;

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate('owner', OWNER_FIELDS)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { items, total, page, pages: Math.ceil(total / limit) || 1 },
  });
});

/** GET /api/items/:id -> single item with owner populated. */
export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!item) throw new ApiError(404, 'Item not found');

  // Hide non-approved items from anyone but the owner/admin.
  if (item.status !== 'approved' && !isOwnerOrAdmin(item, req.user)) {
    throw new ApiError(404, 'Item not found');
  }
  res.json({ success: true, data: { item } });
});

/** POST /api/items -> create (defaults to status 'pending'). */
export const createItem = asyncHandler(async (req, res) => {
  const { title, description, category, tags, location } = req.body;

  const item = await Item.create({
    title,
    description,
    category,
    tags: normalizeTags(tags),
    images: (req.files || []).map(toPublicPath),
    location: parseLocation(location),
    owner: req.user._id,
  });

  await item.populate('owner', OWNER_FIELDS);
  emitItemCreated(item); // live: appears in owner dashboards / admin queue
  res.status(201).json({ success: true, data: { item } });
});

/** PUT /api/items/:id -> update (owner or admin). */
export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new ApiError(403, 'Not allowed to edit this item');

  const { title, description, category, tags, location, removeImages } = req.body;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (category !== undefined) item.category = category;
  if (tags !== undefined) item.tags = normalizeTags(tags);
  if (location !== undefined) item.location = parseLocation(location);

  // Drop any images the client asked to remove, then append new uploads.
  if (removeImages) {
    const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
    item.images = item.images.filter((p) => !toRemove.includes(p));
  }
  if (req.files?.length) item.images.push(...req.files.map(toPublicPath));

  await item.save();
  await item.populate('owner', OWNER_FIELDS);
  emitItemUpdated(item);
  res.json({ success: true, data: { item } });
});

/** DELETE /api/items/:id -> delete (owner or admin). */
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new ApiError(403, 'Not allowed to delete this item');

  await item.deleteOne();
  emitItemDeleted(item._id);
  res.json({ success: true, data: { id: item._id } });
});

/**
 * POST /api/items/:id/vote  body { value: 1 | -1 }
 * Toggles the user's vote. Voting the same way again removes it; voting the
 * other way moves it. Returns fresh counts + the caller's current vote.
 */
export const voteItem = asyncHandler(async (req, res) => {
  const { value } = req.body; // validated to 1 | -1
  const userId = req.user._id.toString();

  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');

  const up = item.upvotes.map((id) => id.toString());
  const down = item.downvotes.map((id) => id.toString());
  const hadUp = up.includes(userId);
  const hadDown = down.includes(userId);

  // Remove any existing vote first, then re-apply unless it was a toggle-off.
  item.upvotes = item.upvotes.filter((id) => id.toString() !== userId);
  item.downvotes = item.downvotes.filter((id) => id.toString() !== userId);

  if (value === 1 && !hadUp) item.upvotes.push(req.user._id);
  if (value === -1 && !hadDown) item.downvotes.push(req.user._id);

  await item.save();
  await item.populate('owner', OWNER_FIELDS);
  emitItemUpdated(item);

  const myVote = item.upvotes.some((id) => id.toString() === userId)
    ? 1
    : item.downvotes.some((id) => id.toString() === userId)
    ? -1
    : 0;

  res.json({
    success: true,
    data: {
      upvoteCount: item.upvotes.length,
      downvoteCount: item.downvotes.length,
      score: item.upvotes.length - item.downvotes.length,
      myVote,
      item,
    },
  });
});

// --- helpers ---------------------------------------------------------------

/** Accept tags as an array or a comma-separated string; trim + dedupe. */
function normalizeTags(tags) {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : String(tags).split(',');
  return [...new Set(arr.map((t) => t.trim()).filter(Boolean))];
}

/** Accept location as an object or a JSON string; null out empty coords. */
function parseLocation(location) {
  if (!location) return { lat: null, lng: null };
  const loc = typeof location === 'string' ? safeJson(location) : location;
  return {
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
  };
}

function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
