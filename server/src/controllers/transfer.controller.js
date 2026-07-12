import { Transfer } from '../models/Transfer.js';
import { Allocation } from '../models/Allocation.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';
import { logActivity } from '../utils/activityLogger.js';
import { emitAssetUpdated } from '../sockets/index.js';

/**
 * ============================================================================
 * TRANSFER — request to move an allocated asset to a new holder.
 * Cloned from the Request workflow. Approval reassigns custody atomically:
 * the Transfer row flips Requested -> Reallocated in one guarded update so a
 * request can't be approved twice.
 * ============================================================================
 */

const POP = [
  { path: 'asset', select: 'name assetTag status' },
  { path: 'fromHolder', select: 'name email' },
  { path: 'toRequester', select: 'name email' },
  { path: 'approvedBy', select: 'name' },
];

/** Notify every asset_manager + admin that a request needs approval. */
async function notifyApprovers(message) {
  const approvers = await User.find({ role: { $in: ['asset_manager', 'admin'] } }).select('_id');
  await Promise.all(
    approvers.map((u) => notify({ user: u._id, type: 'transfer', message, link: '/allocation' }))
  );
}

/** POST /api/transfers  body { asset, toRequester, reason } — any authenticated user. */
export const createTransfer = asyncHandler(async (req, res) => {
  const { asset: assetId, toRequester, reason = '' } = req.body;

  const asset = await Asset.findById(assetId).populate('currentHolder', 'name');
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (asset.status !== 'Allocated' || !asset.currentHolder) {
    throw new ApiError(400, 'Transfers apply only to an allocated asset');
  }

  let transfer = await Transfer.create({
    asset: asset._id,
    fromHolder: asset.currentHolder._id,
    toRequester,
    reason,
    status: 'Requested',
  });
  transfer = await transfer.populate(POP);

  await notifyApprovers(
    `Transfer requested for "${asset.name}" (${asset.assetTag}) by ${req.user.name}`
  );

  res.status(201).json({ success: true, data: { transfer } });
});

/**
 * PATCH /api/transfers/:id/approve — asset_manager/dept_head/admin.
 * Atomically claims the request (Requested -> Reallocated) then reassigns custody.
 */
export const approveTransfer = asyncHandler(async (req, res) => {
  // Guard against double-approval: only the first approver flips it.
  const transfer = await Transfer.findOneAndUpdate(
    { _id: req.params.id, status: 'Requested' },
    { $set: { status: 'Reallocated', approvedBy: req.user._id } },
    { new: true }
  ).populate(POP);
  if (!transfer) throw new ApiError(409, 'Transfer already handled or not found');

  const asset = await Asset.findById(transfer.asset._id);
  if (!asset) throw new ApiError(404, 'Asset not found');

  // Close the old holder's active allocation.
  await Allocation.updateMany(
    { asset: asset._id, status: 'active' },
    { $set: { status: 'returned', returnedDate: new Date() } }
  );

  // Open a new active allocation for the requester (custody carries over).
  await Allocation.create({
    asset: asset._id,
    holder: transfer.toRequester._id,
    holderDept: asset.department || null,
    allocatedBy: req.user._id,
    allocatedDate: new Date(),
    expectedReturnDate: asset.expectedReturnDate || null,
  });

  asset.currentHolder = transfer.toRequester._id;
  asset.allocationHistory.push({
    action: 'transferred',
    date: new Date(),
    from: transfer.fromHolder._id,
    fromName: transfer.fromHolder.name,
    to: transfer.toRequester._id,
    toName: transfer.toRequester.name,
    by: req.user._id,
    byName: req.user.name,
  });
  await asset.save();
  await asset.populate(['category', 'department', 'currentHolder']);

  // Notify both parties.
  await notify({
    user: transfer.toRequester._id,
    type: 'transfer',
    message: `Transfer approved — "${asset.name}" (${asset.assetTag}) is now allocated to you`,
    link: '/allocation',
  });
  await notify({
    user: transfer.fromHolder._id,
    type: 'transfer',
    message: `"${asset.name}" (${asset.assetTag}) was transferred to ${transfer.toRequester.name}`,
    link: '/allocation',
  });
  await logActivity({
    actor: req.user._id,
    action: 'asset.transferred',
    summary: `${asset.name} ${asset.assetTag} transferred from ${transfer.fromHolder.name} to ${transfer.toRequester.name}`,
    entityType: 'Transfer',
    entityId: transfer._id,
  });
  emitAssetUpdated(asset);

  res.json({ success: true, data: { transfer, asset } });
});

/** PATCH /api/transfers/:id/reject — asset_manager/dept_head/admin. */
export const rejectTransfer = asyncHandler(async (req, res) => {
  const transfer = await Transfer.findOneAndUpdate(
    { _id: req.params.id, status: 'Requested' },
    { $set: { status: 'Rejected', approvedBy: req.user._id } },
    { new: true }
  ).populate(POP);
  if (!transfer) throw new ApiError(409, 'Transfer already handled or not found');

  await notify({
    user: transfer.toRequester._id,
    type: 'transfer',
    message: `Your transfer request for "${transfer.asset.name}" (${transfer.asset.assetTag}) was rejected`,
    link: '/allocation',
  });

  res.json({ success: true, data: { transfer } });
});

/** GET /api/transfers?status=&mine= -> list transfers (approvals, or the caller's own). */
export const listTransfers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  // "My requests": transfers I raised or that target me.
  if (req.query.mine === 'true') {
    filter.$or = [{ toRequester: req.user._id }, { fromHolder: req.user._id }];
  }
  const transfers = await Transfer.find(filter).populate(POP).sort({ createdAt: -1 });
  res.json({ success: true, data: { transfers } });
});
