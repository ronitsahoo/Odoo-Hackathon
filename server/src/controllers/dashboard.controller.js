import { Asset } from '../models/Asset.js';
import { Allocation } from '../models/Allocation.js';
import { Transfer } from '../models/Transfer.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Booking } from '../models/Booking.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/dashboard/summary
 * Returns KPI counts + overdue allocations + recent activity for the dashboard.
 * Scoped naturally by role if easy (admin/manager see org-wide; employee sees
 * their own), else org-wide for simplicity.
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nearFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Run queries in parallel for speed
  const [
    allAssets,
    activeAllocations,
    pendingTransfers,
    maintenanceRequests,
    activeBookings,
    recentActivity,
  ] = await Promise.all([
    Asset.find({}),
    Allocation.find({ status: 'active' })
      .populate('asset', 'name assetTag')
      .populate('holder', 'name')
      .populate('holderDept', 'name'),
    Transfer.countDocuments({ status: 'Requested' }),
    MaintenanceRequest.find({}),
    // Active bookings = not cancelled and not yet ended.
    Booking.countDocuments({ status: { $ne: 'Cancelled' }, endTime: { $gte: now } }),
    ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('actor', 'name'),
  ]);

  // --- KPI Calculations ---
  const assetsAvailable = allAssets.filter((a) => a.status === 'Available').length;
  const assetsAllocated = allAssets.filter((a) => a.status === 'Allocated').length;

  // Maintenance today: assets currently Under Maintenance OR requests moved today
  const assetsUnderMaintenance = allAssets.filter((a) => a.status === 'Under Maintenance').length;
  const requestsMovedToday = maintenanceRequests.filter((mr) => {
    return mr.updatedAt >= todayStart;
  }).length;
  const maintenanceToday = Math.max(assetsUnderMaintenance, requestsMovedToday);

  // Upcoming returns: active allocations with expectedReturnDate in next 7 days
  const upcomingReturns = activeAllocations.filter((a) => {
    if (!a.expectedReturnDate) return false;
    const returnDate = new Date(a.expectedReturnDate);
    return returnDate > now && returnDate <= nearFuture;
  }).length;

  // Overdue returns: active allocations past expectedReturnDate
  const overdueReturns = activeAllocations
    .filter((a) => {
      if (!a.expectedReturnDate) return false;
      return new Date(a.expectedReturnDate) < now;
    })
    .map((a) => ({
      _id: a._id,
      asset: a.asset,
      holder: a.holder,
      holderDept: a.holderDept,
      expectedReturnDate: a.expectedReturnDate,
      daysOverdue: Math.floor((now - new Date(a.expectedReturnDate)) / (1000 * 60 * 60 * 24)),
    }));

  // --- Recent Activity ---
  const activities = recentActivity.map((log) => ({
    _id: log._id,
    actor: log.actor?.name || 'Unknown',
    action: log.action,
    summary: log.summary,
    createdAt: log.createdAt,
  }));

  res.json({
    success: true,
    data: {
      counts: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns,
      },
      overdueReturns: {
        count: overdueReturns.length,
        list: overdueReturns,
      },
      recentActivity: activities,
    },
  });
});
