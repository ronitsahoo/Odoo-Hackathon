import mongoose from 'mongoose';

/**
 * Request: the universal user-to-user interaction on an Item.
 * ONE module maps to every theme's core transaction:
 *   Skill Swap -> swap request      QuickCourt -> booking
 *   QuickDesk  -> ticket assignment Expenses   -> approval request
 *   ReWear     -> redeem/borrow
 *
 * Flow: fromUser sends -> toUser (the Item owner) accepts/rejects ->
 *       sender may cancel -> either may mark completed.
 * `meta` (Mixed) holds theme-specific payload: slot times, points, amount, etc.
 */
const requestSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Request = mongoose.model('Request', requestSchema);
