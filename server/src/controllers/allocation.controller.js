import { Allocation } from '../models/Allocation.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';
import { emitAssetUpdated } from '../sockets/index.js';

/**
 * ============================================================================
 * ALLOCATION — assign / return custody of an asset (Module 4).
 * The allocate path uses an ATOMIC findOneAndUpdate guard so an asset can only
 * be allocated while it is 'Available'. This is the conflict heart of AssetFlow:
 * two concurrent allocations can never both win.
 * ============================================================================
 */

/** POST /api/allocations  body { asset, holder, holderDept?, expectedReturnDate? } */
export const allocate = asyncHandler(async (req, res) => {
  const { asset: assetId, holder: holderId, holderDept, expectedReturnDate } = req.body;

  const holder = await User.findById(holderId);
  if (!holder) throw new ApiError(404, 'Holder (user) not found');
  const dept = holderDept || holder.department || null;

  // --- Atomic conflict guard: only succeeds if the asset is Available. ---
  const asset = await Asset.findOneAndUpdate(
    { _id: assetId, status: 'Available' },
    {
      $set: {
        status: 'Allocated',
        currentHolder: holderId,
        expectedReturnDate: expectedReturnDate || null,
      },
    },
    { new: true }
  );

  // Guard failed: either the asset doesn't exist or isn't Available anymore.
  if (!asset) {
    const existing = await Asset.findById(assetId)
      .populate('currentHolder', 'name')
      .populate('department', 'name');
    if (!existing) throw new ApiError(404, 'Asset not found');
    const who = existing.currentHolder?.name || 'someone';
    const where = existing.department?.name || 'no dept';
    throw new ApiError(
      409,
      `Already allocated to ${who} (${where}) — direct re-allocation is blocked; submit a transfer request`
    );
  }

  // Record the custody + append a denormalized history row (names inline so the
  // history panel needs no extra populate).
  await Allocation.create({
    asset: asset._id,
    holder: holderId,
    holderDept: dept,
    allocatedBy: req.user._id,
    allocatedDate: new Date(),
    expectedReturnDate: expectedReturnDate || null,
  });

  const deptName = dept ? (await Department.findById(dept).select('name'))?.name || null : null;

  asset.allocationHistory.push({
    action: 'allocated',
    date: new Date(),
    holder: holderId,
    holderName: holder.name,
    dept,
    deptName,
    by: req.user._id,
    byName: req.user.name,
  });
  await asset.save();
  await asset.populate(['category', 'department', 'currentHolder']);

  await notify({
    user: holderId,
    type: 'allocation',
    message: `You were allocated "${asset.name}" (${asset.assetTag})`,
    link: '/allocation',
  });
  emitAssetUpdated(asset);

  res.status(201).json({ success: true, data: { asset } });
});

/** POST /api/allocations/:assetId/return  body { checkInCondition, checkInNotes } */
export const returnAsset = asyncHandler(async (req, res) => {
  const { checkInCondition = null, checkInNotes = null } = req.body;
  const { assetId } = req.params;

  const asset = await Asset.findById(assetId).populate('currentHolder', 'name');
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (asset.status !== 'Allocated') {
    throw new ApiError(400, 'Only an allocated asset can be returned');
  }

  // Close the active allocation record.
  const allocation = await Allocation.findOne({ asset: asset._id, status: 'active' });
  if (allocation) {
    allocation.status = 'returned';
    allocation.returnedDate = new Date();
    allocation.checkInCondition = checkInCondition;
    allocation.checkInNotes = checkInNotes;
    await allocation.save();
  }

  const holderName = asset.currentHolder?.name || 'holder';
  asset.allocationHistory.push({
    action: 'returned',
    date: new Date(),
    holder: asset.currentHolder?._id || null,
    holderName,
    condition: checkInCondition,
    notes: checkInNotes,
    by: req.user._id,
    byName: req.user.name,
  });

  // Free the asset.
  const returnedFrom = asset.currentHolder?._id;
  asset.status = 'Available';
  asset.currentHolder = null;
  asset.expectedReturnDate = null;
  await asset.save();
  await asset.populate(['category', 'department']);

  if (returnedFrom) {
    await notify({
      user: returnedFrom,
      type: 'allocation',
      message: `"${asset.name}" (${asset.assetTag}) was returned and is now Available`,
      link: '/allocation',
    });
  }
  emitAssetUpdated(asset);

  res.json({ success: true, data: { asset } });
});

/** GET /api/allocations/asset/:assetId -> allocation history for one asset. */
export const getAssetAllocations = asyncHandler(async (req, res) => {
  const allocations = await Allocation.find({ asset: req.params.assetId })
    .populate('holder', 'name email')
    .populate('holderDept', 'name')
    .populate('allocatedBy', 'name')
    .sort({ createdAt: -1 });

  const now = Date.now();
  const withFlags = allocations.map((a) => ({
    ...a.toObject(),
    isOverdue:
      a.status === 'active' && a.expectedReturnDate && new Date(a.expectedReturnDate) < now,
  }));

  res.json({ success: true, data: { allocations: withFlags } });
});

/** GET /api/allocations/overdue -> active allocations past their return date. */
export const getOverdue = asyncHandler(async (req, res) => {
  const allocations = await Allocation.find({
    status: 'active',
    expectedReturnDate: { $ne: null, $lt: new Date() },
  })
    .populate('asset', 'name assetTag status')
    .populate('holder', 'name email')
    .populate('holderDept', 'name')
    .sort({ expectedReturnDate: 1 });

  const withFlags = allocations.map((a) => ({ ...a.toObject(), isOverdue: true }));
  res.json({ success: true, data: { allocations: withFlags } });
});
