import mongoose from 'mongoose';

/**
 * Allocation: one custody record of an asset by a holder.
 * A new active record is created on allocate/transfer-approve; it is marked
 * 'returned' on return or when custody moves on via a transfer.
 */
const allocationSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    holder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    holderDept: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allocatedDate: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date, default: null },
    returnedDate: { type: Date, default: null },
    checkInCondition: { type: String, default: null },
    checkInNotes: { type: String, default: null },
    status: { type: String, enum: ['active', 'returned'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const Allocation = mongoose.model('Allocation', allocationSchema);
