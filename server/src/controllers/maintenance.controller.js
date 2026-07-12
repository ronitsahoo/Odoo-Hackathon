import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.middleware.js';
import { notify } from './notification.controller.js';
import { logActivity } from '../utils/activityLogger.js';
import {
  emitMaintenanceCreated,
  emitMaintenanceUpdated,
  emitAssetUpdated,
} from '../sockets/index.js';

/**
 * ============================================================================
 * MAINTENANCE WORKFLOW — kanban board.
 * Legal transitions (a small pure map, easy to read in a viva):
 *   Pending             -> Approved | Rejected
 *   Approved            -> Technician Assigned
 *   Technician Assigned -> In Progress
 *   In Progress         -> Resolved
 * Approving/Resolving flips the underlying asset status (guarded).
 * ============================================================================
 */
const TRANSITIONS = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Technician Assigned'],
  'Technician Assigned': ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: [],
  Rejected: [],
};

const POP = [
  { path: 'asset', select: 'name assetTag status' },
  { path: 'raisedBy', select: 'name email' },
];

/** Notify every asset_manager + admin. */
async function notifyManagers(message) {
  const managers = await User.find({ role: { $in: ['asset_manager', 'admin'] } }).select('_id');
  await Promise.all(
    managers.map((u) => notify({ user: u._id, type: 'maintenance', message, link: '/maintenance' }))
  );
}

/** GET /api/maintenance?status=&asset=&mine= -> flat list (frontend groups into columns). */
export const listMaintenance = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.asset) filter.asset = req.query.asset;
  if (req.query.mine === 'true') filter.raisedBy = req.user._id; // "My requests"
  const requests = await MaintenanceRequest.find(filter).populate(POP).sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
});

/** POST /api/maintenance -> raise a Pending request (any authenticated user). */
export const createMaintenance = asyncHandler(async (req, res) => {
  const { asset: assetId, issue, priority = 'medium' } = req.body;

  const asset = await Asset.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');

  let request = await MaintenanceRequest.create({
    asset: assetId,
    raisedBy: req.user._id,
    issue,
    priority,
    photo: req.file ? toPublicPath(req.file) : null,
  });
  request = await request.populate(POP);

  await notifyManagers(
    `Maintenance raised on "${asset.name}" (${asset.assetTag}): ${issue}`
  );
  await logActivity({
    actor: req.user._id,
    action: 'maintenance.raised',
    summary: `Maintenance raised for ${asset.assetTag} — ${issue}`,
    entityType: 'MaintenanceRequest',
    entityId: request._id,
  });
  emitMaintenanceCreated(request);

  res.status(201).json({ success: true, data: { request } });
});

/**
 * PATCH /api/maintenance/:id/status  body { status, technician? }
 * asset_manager/admin only. Enforces the transition map + runs asset side-effects.
 */
export const updateMaintenanceStatus = asyncHandler(async (req, res) => {
  const { status: next, technician } = req.body;

  const request = await MaintenanceRequest.findById(req.params.id).populate(POP);
  if (!request) throw new ApiError(404, 'Maintenance request not found');

  // Legal transition check.
  if (!TRANSITIONS[request.status]?.includes(next)) {
    throw new ApiError(400, `Cannot move ${request.status} → ${next}`);
  }

  request.status = next;
  if (next === 'Technician Assigned') {
    request.technicianName = technician || request.technicianName || null;
  }
  if (next === 'Approved') request.approvedBy = req.user._id;

  // --- Asset side-effects (guarded) ---
  const assetId = request.asset._id;
  if (next === 'Approved') {
    // Drop the asset out of the allocation pool.
    const asset = await Asset.findOneAndUpdate(
      { _id: assetId, status: { $ne: 'Under Maintenance' } },
      { $set: { status: 'Under Maintenance' } },
      { new: true }
    );
    if (asset) {
      asset.maintenanceHistory.push(historyRow(request, 'Approved', req.user));
      await asset.save();
      await asset.populate(['category', 'department']);
      emitAssetUpdated(asset);
    }
    await notify({
      user: request.raisedBy._id,
      type: 'maintenance',
      message: `Your maintenance request for "${request.asset.name}" (${request.asset.assetTag}) was approved`,
      link: '/maintenance',
    });
  } else if (next === 'Resolved') {
    request.resolvedAt = new Date();
    const asset = await Asset.findByIdAndUpdate(
      assetId,
      { $set: { status: 'Available' } },
      { new: true }
    );
    if (asset) {
      asset.maintenanceHistory.push(historyRow(request, 'Resolved', req.user));
      await asset.save();
      await asset.populate(['category', 'department']);
      emitAssetUpdated(asset);
    }
    await notify({
      user: request.raisedBy._id,
      type: 'maintenance',
      message: `"${request.asset.name}" (${request.asset.assetTag}) maintenance resolved — asset is Available again`,
      link: '/maintenance',
    });
  } else if (next === 'Rejected') {
    // No asset change.
    await notify({
      user: request.raisedBy._id,
      type: 'maintenance',
      message: `Your maintenance request for "${request.asset.name}" (${request.asset.assetTag}) was rejected`,
      link: '/maintenance',
    });
  }

  await request.save();
  await logActivity({
    actor: req.user._id,
    action: `maintenance.${next.toLowerCase().replace(/\s+/g, '_')}`,
    summary: `Maintenance ${request.asset.assetTag} → ${next}${request.technicianName ? ` (tech: ${request.technicianName})` : ''}`,
    entityType: 'MaintenanceRequest',
    entityId: request._id,
  });
  emitMaintenanceUpdated(request);

  res.json({ success: true, data: { request } });
});

/** Denormalized maintenanceHistory row (names inline so the panel needs no populate). */
function historyRow(request, status, actor) {
  return {
    date: new Date(),
    status,
    issue: request.issue,
    technician: request.technicianName || null,
    by: actor._id,
    byName: actor.name,
  };
}
