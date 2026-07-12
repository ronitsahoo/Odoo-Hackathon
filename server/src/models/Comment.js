import mongoose from 'mongoose';

/**
 * Comment: a threaded response attached to an Item.
 * Maps to: StackIt answers, QuickDesk ticket replies, ReWear item questions.
 * `isAccepted` marks the chosen answer (owner-or-admin only) — used by Q&A themes.
 * `parent` enables one level of nesting (reply-to-reply); null = top-level.
 */
const commentSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    body: { type: String, required: true }, // sanitized HTML from the rich text editor
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ item: 1, createdAt: 1 });

commentSchema.virtual('upvoteCount').get(function () {
  return this.upvotes?.length || 0;
});
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

export const Comment = mongoose.model('Comment', commentSchema);
