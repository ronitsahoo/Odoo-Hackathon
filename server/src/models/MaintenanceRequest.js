import mongoose from 'mongoose';

/**
 * MaintenanceRequest: a repair/service ticket on an asset (Module 5).
 * Cloned from the Request workflow pattern; drives the kanban board.
 * Flow: Pending -> Approved -> Technician Assigned -> In Progress -> Resolved
 *       (Pending -> Rejected is a dead end). Approving/resolving flips the
 *       underlying asset's status (Under Maintenance / Available).
 */
const maintenanceRequestSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: String, required: true, maxlength: 500 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    photo: { type: String, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Free-text technician name fallback (seed/mockup uses e.g. "R Varma").
    technicianName: { type: String, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
