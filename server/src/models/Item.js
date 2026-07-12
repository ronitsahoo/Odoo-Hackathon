import mongoose from 'mongoose';

/**
 * ============================================================================
 * REFERENCE FEATURE — clone this pattern to add a new resource.
 * ============================================================================
 * Item is the generic "core resource" of the template. Every past Odoo problem
 * statement has one central thing users create, browse, search and moderate:
 *   StackIt   -> Question        Skill Swap -> Skill listing
 *   ReWear    -> Clothing item   QuickDesk  -> Support ticket
 *   CivicTrack-> Issue report    QuickCourt -> Venue/court
 *   Expenses  -> Expense claim
 *
 * To make a new resource: copy this file, rename the model + fields, then copy
 * item.controller.js / item.routes.js / itemStore.js and the Item pages.
 * Keep the shape (owner ref, status enum, votes, text index, timestamps) — the
 * middleware, sockets and admin moderation all rely on it.
 * ============================================================================
 */
const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true }, // may hold sanitized HTML (rich text)
    category: { type: String, required: true, trim: true, index: true },
    tags: [{ type: String, trim: true }],
    images: [{ type: String }], // stored upload paths, e.g. /uploads/xxx.jpg
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Status workflow shared by every theme: pending -> approved | rejected.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Social signals. We store userIds (not just counts) so a vote can toggle
    // and a user can't double-vote.
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Optional star rating aggregate (kept denormalized for cheap sorting).
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Optional geo (CivicTrack / QuickCourt). Nullable by default.
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// Compound index for the common "approved items, newest first" list query.
itemSchema.index({ status: 1, createdAt: -1 });
// Full-text search across the fields SearchFilterBar targets.
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Convenience virtuals so the client never has to count arrays itself.
itemSchema.virtual('upvoteCount').get(function () {
  return this.upvotes?.length || 0;
});
itemSchema.virtual('downvoteCount').get(function () {
  return this.downvotes?.length || 0;
});
itemSchema.virtual('score').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

export const Item = mongoose.model('Item', itemSchema);
