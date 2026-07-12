import mongoose from 'mongoose';

/**
 * ActivityLog: audit trail of asset lifecycle events.
 * Populated by allocation/transfer/maintenance controllers so the dashboard
 * Recent Activity feed and full audit log have data without extra queries.
 */
const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // e.g. 'asset.allocated', 'maintenance.approved'
    summary: { type: String, required: true }, // human-readable: "Laptop AF-0114 allocated to Priya Shah — Engineering"
    entityType: { type: String, required: true }, // 'Asset', 'Allocation', 'Transfer', 'MaintenanceRequest'
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Index for recent activity queries (newest first)
activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
