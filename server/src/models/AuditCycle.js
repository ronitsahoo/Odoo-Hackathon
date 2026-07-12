import mongoose from 'mongoose';

/**
 * AuditCycle: a physical-verification cycle over a scope (a department or a
 * location). On creation, `items` is auto-populated by snapshotting every
 * in-scope asset's expected location; auditors then mark each. Closing the
 * cycle applies the discrepancies (confirmed Missing → asset Lost).
 */
const auditItemSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    expectedLocation: { type: String, default: '' },
    mark: {
      type: String,
      enum: ['Pending', 'Verified', 'Missing', 'Damaged'],
      default: 'Pending',
    },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const auditCycleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    scopeType: { type: String, enum: ['department', 'location'], required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    location: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    auditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    items: { type: [auditItemSchema], default: [] },
  },
  { timestamps: true }
);

export const AuditCycle = mongoose.model('AuditCycle', auditCycleSchema);
