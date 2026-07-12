import { AuditCycle } from '../models/AuditCycle.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from './notification.controller.js';
import { logActivity } from '../utils/activityLogger.js';
import { emitAssetUpdated } from '../sockets/index.js';

const POP = [
  { path: 'department', select: 'name' },
  { path: 'auditors', select: 'name email' },
  { path: 'items.asset', select: 'name assetTag status location' },
];

/**
 * POST /api/audits — admin only. Creates a cycle and auto-populates `items`
 * from the assets in scope (a department, or a location string), snapshotting
 * each asset's current location as the expected location.
 */
export const createAudit = asyncHandler(async (req, res) => {
  const { title, scopeType, department, location, startDate, endDate, auditors = [] } = req.body;
  if (!['department', 'location'].includes(scopeType)) {
    throw new ApiError(400, 'scopeType must be "department" or "location"');
  }

  // Resolve in-scope assets.
  const scopeFilter = scopeType === 'department' ? { department } : { location };
  const assets = await Asset.find(scopeFilter).select('location');

  const items = assets.map((a) => ({
    asset: a._id,
    expectedLocation: a.location || '',
    mark: 'Pending',
    note: '',
  }));

  let cycle = await AuditCycle.create({
    title,
    scopeType,
    department: scopeType === 'department' ? department : null,
    location: scopeType === 'location' ? location : null,
    startDate: startDate || null,
    endDate: endDate || null,
    auditors,
    items,
  });
  cycle = await cycle.populate(POP);

  res.status(201).json({ success: true, data: { cycle } });
});

/** GET /api/audits — list cycles. */
export const listAudits = asyncHandler(async (req, res) => {
  const cycles = await AuditCycle.find()
    .populate('department', 'name')
    .populate('auditors', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { cycles } });
});

/** GET /api/audits/:id — cycle detail with items. */
export const getAudit = asyncHandler(async (req, res) => {
  const cycle = await AuditCycle.findById(req.params.id).populate(POP);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  res.json({ success: true, data: { cycle } });
});

/** PATCH /api/audits/:id/items/:assetId — an assigned auditor/admin sets a mark. */
export const markItem = asyncHandler(async (req, res) => {
  const { mark, note = '' } = req.body;
  if (!['Verified', 'Missing', 'Damaged', 'Pending'].includes(mark)) {
    throw new ApiError(400, 'Invalid mark');
  }

  const cycle = await AuditCycle.findById(req.params.id);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  if (cycle.status === 'Closed') throw new ApiError(400, 'Audit cycle is closed');

  // Only an assigned auditor or an admin may mark.
  const isAuditor = cycle.auditors.some((a) => a.toString() === req.user._id.toString());
  if (!isAuditor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only assigned auditors can mark items');
  }

  const item = cycle.items.find((i) => i.asset.toString() === req.params.assetId);
  if (!item) throw new ApiError(404, 'Asset not in this cycle');
  item.mark = mark;
  item.note = note;
  await cycle.save();
  await cycle.populate(POP);

  res.json({ success: true, data: { cycle } });
});

/** GET /api/audits/:id/discrepancies — the auto discrepancy report (Missing/Damaged). */
export const getDiscrepancies = asyncHandler(async (req, res) => {
  const cycle = await AuditCycle.findById(req.params.id).populate('items.asset', 'name assetTag');
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  const discrepancies = cycle.items.filter((i) => ['Missing', 'Damaged'].includes(i.mark));
  res.json({ success: true, data: { discrepancies } });
});

/**
 * PATCH /api/audits/:id/close — admin locks the cycle and applies discrepancies:
 * confirmed Missing → asset.status = 'Lost' (guarded); Damaged → flag condition.
 */
export const closeAudit = asyncHandler(async (req, res) => {
  const cycle = await AuditCycle.findById(req.params.id).populate('items.asset', 'name assetTag');
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  if (cycle.status === 'Closed') throw new ApiError(400, 'Audit cycle already closed');

  const admins = await User.find({ role: 'admin' }).select('_id');
  const flagged = cycle.items.filter((i) => ['Missing', 'Damaged'].includes(i.mark));

  for (const item of flagged) {
    const asset = item.asset;
    if (!asset) continue;

    if (item.mark === 'Missing') {
      // Guarded transition: a Missing asset becomes Lost (unless already terminal).
      const updated = await Asset.findOneAndUpdate(
        { _id: asset._id, status: { $nin: ['Lost', 'Retired', 'Disposed'] } },
        { $set: { status: 'Lost' } },
        { new: true }
      );
      if (updated) {
        await updated.populate(['category', 'department']);
        emitAssetUpdated(updated);
      }
    } else if (item.mark === 'Damaged') {
      await Asset.findByIdAndUpdate(asset._id, { $set: { condition: 'Damaged (audit)' } });
    }

    // Alert + activity per flagged item.
    const summary = `Audit discrepancy flagged: ${asset.assetTag} ${item.mark.toLowerCase()}`;
    await Promise.all(
      admins.map((u) => notify({ user: u._id, type: 'audit', message: summary, link: '/audit' }))
    );
    await logActivity({
      actor: req.user._id,
      action: 'audit.discrepancy',
      summary,
      entityType: 'Asset',
      entityId: asset._id,
    });
  }

  cycle.status = 'Closed';
  await cycle.save();
  await cycle.populate(POP);

  res.json({ success: true, data: { cycle, flaggedCount: flagged.length } });
});
