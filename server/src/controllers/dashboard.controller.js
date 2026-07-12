import { Asset } from '../models/Asset.js';
import { Allocation } from '../models/Allocation.js';
import { Transfer } from '../models/Transfer.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Booking } from '../models/Booking.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/dashboard/summary — role-aware.
 *   admin / asset_manager → org-wide KPIs
 *   dept_head            → department-scoped KPIs + dept pending approvals
 *   employee             → their allocated assets, their raised requests, their returns
 * All roles get the shared 6 KPI counts + overdue detail + recent activity, but
 * the numbers are scoped to what that role should see.
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nearFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { role, _id: uid, department: dept } = req.user;

  // Asset scope per role.
  const assetScope = {};
  if (role === 'dept_head') assetScope.department = dept || null;
  else if (role === 'employee') assetScope.currentHolder = uid;

  const [
    scopedAssets,
    activeAllocations,
    maintenanceRequests,
    activeBookings,
    recentActivity,
  ] = await Promise.all([
    Asset.find(assetScope).populate('category', 'name').populate('department', 'name').populate('currentHolder', 'name'),
    Allocation.find({ status: 'active' })
      .populate('asset', 'name assetTag department')
      .populate('holder', 'name')
      .populate('holderDept', 'name'),
    MaintenanceRequest.find({}).populate('asset', 'name assetTag department'),
    Booking.countDocuments({ status: { $ne: 'Cancelled' }, endTime: { $gte: now } }),
    ActivityLog.find({}).sort({ createdAt: -1 }).limit(8).populate('actor', 'name'),
  ]);

  // Scope allocations to what this role should see.
  const inScopeAlloc = (a) => {
    if (role === 'employee') return String(a.holder?._id) === String(uid);
    if (role === 'dept_head') return String(a.asset?.department) === String(dept);
    return true;
  };
  const myAllocations = activeAllocations.filter(inScopeAlloc);

  // KPI counts (scoped assets).
  const assetsAvailable = scopedAssets.filter((a) => a.status === 'Available').length;
  const assetsAllocated = scopedAssets.filter((a) => a.status === 'Allocated').length;
  const assetsUnderMaintenance = scopedAssets.filter((a) => a.status === 'Under Maintenance').length;
  const requestsMovedToday = maintenanceRequests.filter((mr) => mr.updatedAt >= todayStart).length;
  const maintenanceToday = Math.max(assetsUnderMaintenance, role === 'admin' || role === 'asset_manager' ? requestsMovedToday : 0);

  // Pending transfers: org-wide for managers; dept/self scoped otherwise.
  let pendingTransfers;
  if (role === 'admin' || role === 'asset_manager') {
    pendingTransfers = await Transfer.countDocuments({ status: 'Requested' });
  } else if (role === 'dept_head') {
    const deptAssetIds = scopedAssets.map((a) => a._id);
    pendingTransfers = await Transfer.countDocuments({ status: 'Requested', asset: { $in: deptAssetIds } });
  } else {
    pendingTransfers = await Transfer.countDocuments({ status: 'Requested', $or: [{ fromHolder: uid }, { toRequester: uid }] });
  }

  const upcomingReturns = myAllocations.filter((a) => {
    if (!a.expectedReturnDate) return false;
    const d = new Date(a.expectedReturnDate);
    return d > now && d <= nearFuture;
  });

  const overdueReturns = myAllocations
    .filter((a) => a.expectedReturnDate && new Date(a.expectedReturnDate) < now)
    .map((a) => ({
      _id: a._id,
      asset: a.asset,
      holder: a.holder,
      holderDept: a.holderDept,
      expectedReturnDate: a.expectedReturnDate,
      daysOverdue: Math.floor((now - new Date(a.expectedReturnDate)) / (1000 * 60 * 60 * 24)),
    }));

  const activities = recentActivity.map((log) => ({
    _id: log._id,
    actor: log.actor?.name || 'Unknown',
    action: log.action,
    summary: log.summary,
    createdAt: log.createdAt,
  }));

  // "Self" block for EVERY role: assets assigned to me + my own open requests,
  // so even an admin sees their personal parameters on the one dashboard.
  const [selfAssets, selfMaint, selfTransfers] = await Promise.all([
    Asset.find({ currentHolder: uid }).select('name assetTag status'),
    MaintenanceRequest.countDocuments({ raisedBy: uid, status: { $nin: ['Resolved', 'Rejected'] } }),
    Transfer.countDocuments({ $or: [{ fromHolder: uid }, { toRequester: uid }], status: 'Requested' }),
  ]);
  const self = {
    assets: selfAssets.map((a) => ({ _id: a._id, name: a.name, assetTag: a.assetTag, status: a.status })),
    openRequests: selfMaint + selfTransfers,
  };

  // Role-specific "mine" block.
  const mine = {};
  if (role === 'employee') {
    mine.assets = scopedAssets.map((a) => ({ _id: a._id, name: a.name, assetTag: a.assetTag, status: a.status, category: a.category }));
    const [myMaint, myTransfers] = await Promise.all([
      MaintenanceRequest.find({ raisedBy: uid }).populate('asset', 'name assetTag').sort({ createdAt: -1 }).limit(10),
      Transfer.find({ $or: [{ fromHolder: uid }, { toRequester: uid }] }).populate('asset', 'name assetTag').sort({ createdAt: -1 }).limit(10),
    ]);
    mine.maintenanceRequests = myMaint;
    mine.transferRequests = myTransfers;
  } else if (role === 'dept_head') {
    mine.assets = scopedAssets.map((a) => ({ _id: a._id, name: a.name, assetTag: a.assetTag, status: a.status, currentHolder: a.currentHolder }));
    const deptAssetIds = scopedAssets.map((a) => a._id);
    mine.pendingApprovals = await MaintenanceRequest.countDocuments({ status: 'Pending', asset: { $in: deptAssetIds } });
  }

  res.json({
    success: true,
    data: {
      role,
      counts: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns: upcomingReturns.length,
      },
      overdueReturns: { count: overdueReturns.length, list: overdueReturns },
      upcomingReturnsList: upcomingReturns,
      recentActivity: activities,
      mine,
      self,
    },
  });
});
