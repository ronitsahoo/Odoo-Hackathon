import mongoose from 'mongoose';

/**
 * Transfer: a request to move an allocated asset from its current holder to a
 * new requester.
 * Direct re-allocation of an already-allocated asset is blocked; it must go
 * through this approval flow instead.
 */
const transferSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    fromHolder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toRequester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Reallocated'],
      default: 'Requested',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const Transfer = mongoose.model('Transfer', transferSchema);
