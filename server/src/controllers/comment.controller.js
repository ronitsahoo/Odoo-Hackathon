import { Comment } from '../models/Comment.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitCommentCreated, emitCommentUpdated } from '../sockets/index.js';

const AUTHOR_FIELDS = 'name avatar role';

/** GET /api/items/:itemId/comments -> threaded list for an item. */
export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ item: req.params.itemId })
    .populate('author', AUTHOR_FIELDS)
    .sort({ isAccepted: -1, createdAt: 1 }); // accepted answer floats to top
  res.json({ success: true, data: { comments } });
});

/** POST /api/items/:itemId/comments -> add a comment/answer/reply. */
export const createComment = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.itemId);
  if (!item) throw new ApiError(404, 'Item not found');

  const comment = await Comment.create({
    item: item._id,
    author: req.user._id,
    parent: req.body.parent || null,
    body: req.body.body,
  });

  await comment.populate('author', AUTHOR_FIELDS);
  emitCommentCreated(comment); // live thread update for everyone viewing the item
  res.status(201).json({ success: true, data: { comment } });
});

/** POST /api/comments/:id/vote  body { value: 1 } -> toggle an upvote. */
export const voteComment = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const had = comment.upvotes.some((id) => id.toString() === userId);
  comment.upvotes = had
    ? comment.upvotes.filter((id) => id.toString() !== userId)
    : [...comment.upvotes, req.user._id];

  await comment.save();
  await comment.populate('author', AUTHOR_FIELDS);
  emitCommentUpdated(comment);
  res.json({ success: true, data: { comment } });
});

/**
 * PATCH /api/comments/:id/accept -> mark this comment as the accepted answer.
 * Only the parent Item's owner (or an admin) may accept, and only one comment
 * per item stays accepted.
 */
export const acceptComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const item = await Item.findById(comment.item);
  if (!item) throw new ApiError(404, 'Item not found');

  const canAccept =
    item.owner.toString() === req.user._id.toString() || req.user.role === 'admin';
  if (!canAccept) throw new ApiError(403, 'Only the item owner can accept an answer');

  // Clear any previously accepted answer on this item, then set this one.
  await Comment.updateMany({ item: item._id }, { isAccepted: false });
  comment.isAccepted = true;
  await comment.save();
  await comment.populate('author', AUTHOR_FIELDS);

  emitCommentUpdated(comment);
  res.json({ success: true, data: { comment } });
});

/** DELETE /api/comments/:id -> author or admin. */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const canDelete =
    comment.author.toString() === req.user._id.toString() || req.user.role === 'admin';
  if (!canDelete) throw new ApiError(403, 'Not allowed to delete this comment');

  await comment.deleteOne();
  emitCommentUpdated({ _id: comment._id, item: comment.item, deleted: true });
  res.json({ success: true, data: { id: comment._id } });
});
