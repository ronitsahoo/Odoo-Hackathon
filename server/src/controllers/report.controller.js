import mongoose from 'mongoose';
import { Asset } from '../models/Asset.js';
import { Allocation } from '../models/Allocation.js';
import { Booking } from '../models/Booking.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { AuditCycle } from '../models/AuditCycle.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DAY = 24 * 60 * 60 * 1000;

/** GET /api/reports/utilization-by-department -> allocated vs total per dept (bar). */
export const utilizationByDepartment = asyncHandler(async (req, res) => {
  const rows = await Asset.aggregate([
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        allocated: { $sum: { $cond: [{ $eq: ['$status', 'Allocated'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
    {
      $project: {
        department: { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] },
        total: 1,
        allocated: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
  res.json({ success: true, data: { rows } });
});

/** GET /api/reports/maintenance-frequency -> requests per month (line). */
export const maintenanceFrequency = asyncHandler(async (req, res) => {
  const rows = await MaintenanceRequest.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', count: 1 } },
  ]);
  res.json({ success: true, data: { rows } });
});

/**
 * GET /api/reports/maintenance-by-group?by=asset|category
 * Maintenance request counts grouped by asset or by category (for the toggle).
 */
export const maintenanceByGroup = asyncHandler(async (req, res) => {
  const by = req.query.by === 'category' ? 'category' : 'asset';
  let rows;
  if (by === 'asset') {
    rows = await MaintenanceRequest.aggregate([
      { $group: { _id: '$asset', count: { $sum: 1 } } },
      { $lookup: { from: 'assets', localField: '_id', foreignField: '_id', as: 'a' } },
      { $project: { label: { $ifNull: [{ $arrayElemAt: ['$a.assetTag', 0] }, 'Unknown'] }, count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);
  } else {
    rows = await MaintenanceRequest.aggregate([
      { $lookup: { from: 'assets', localField: 'asset', foreignField: '_id', as: 'a' } },
      { $unwind: '$a' },
      { $group: { _id: '$a.category', count: { $sum: 1 } } },
      { $lookup: { from: 'assetcategories', localField: '_id', foreignField: '_id', as: 'c' } },
      { $project: { label: { $ifNull: [{ $arrayElemAt: ['$c.name', 0] }, 'Uncategorized'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);
  }
  res.json({ success: true, data: { by, rows } });
});

/**
 * GET /api/reports/booking-heatmap -> bookings by day-of-week × hour (peak windows).
 * Returns rows { day: 0..6 (Sun..Sat), hour: 0..23, count }.
 */
export const bookingHeatmap = asyncHandler(async (req, res) => {
  const raw = await Booking.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: { day: { $dayOfWeek: '$startTime' }, hour: { $hour: '$startTime' } },
        count: { $sum: 1 },
      },
    },
  ]);
  // $dayOfWeek is 1(Sun)..7(Sat) → normalize to 0..6.
  const rows = raw.map((r) => ({ day: r._id.day - 1, hour: r._id.hour, count: r.count }));
  res.json({ success: true, data: { rows } });
});

/** GET /api/reports/most-used -> top assets by allocation + booking + maintenance count. */
export const mostUsed = asyncHandler(async (req, res) => {
  const [allocs, books, maints, assets] = await Promise.all([
    Allocation.aggregate([{ $group: { _id: '$asset', c: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: '$resource', c: { $sum: 1 } } }]),
    MaintenanceRequest.aggregate([{ $group: { _id: '$asset', c: { $sum: 1 } } }]),
    Asset.find().select('name assetTag'),
  ]);
  const count = new Map();
  const add = (arr) => arr.forEach((r) => count.set(String(r._id), (count.get(String(r._id)) || 0) + r.c));
  add(allocs); add(books); add(maints);

  const rows = assets
    .map((a) => ({ _id: a._id, name: a.name, assetTag: a.assetTag, uses: count.get(String(a._id)) || 0 }))
    .filter((r) => r.uses > 0)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 10);
  res.json({ success: true, data: { rows } });
});

/** GET /api/reports/idle?days=30 -> assets with no allocation/booking activity in N days. */
export const idleAssets = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const cutoff = new Date(Date.now() - days * DAY);

  const [recentAllocs, recentBooks, assets] = await Promise.all([
    Allocation.find({ allocatedDate: { $gte: cutoff } }).select('asset'),
    Booking.find({ startTime: { $gte: cutoff } }).select('resource'),
    Asset.find().select('name assetTag status createdAt updatedAt'),
  ]);
  const active = new Set([
    ...recentAllocs.map((a) => String(a.asset)),
    ...recentBooks.map((b) => String(b.resource)),
  ]);

  const rows = assets
    .filter((a) => !active.has(String(a._id)))
    .map((a) => ({
      _id: a._id,
      name: a.name,
      assetTag: a.assetTag,
      status: a.status,
      idleDays: Math.floor((Date.now() - new Date(a.updatedAt || a.createdAt)) / DAY),
    }))
    .sort((a, b) => b.idleDays - a.idleDays);
  res.json({ success: true, data: { rows } });
});

/** GET /api/reports/attention -> due for maintenance (age) or nearing retirement. */
export const attention = asyncHandler(async (req, res) => {
  const assets = await Asset.find().select('name assetTag acquisitionDate maintenanceHistory status');
  const now = Date.now();
  const dueForMaintenance = [];
  const nearingRetirement = [];

  for (const a of assets) {
    const hist = a.maintenanceHistory || [];
    const last = hist.length ? new Date(hist[hist.length - 1].date) : null;
    const daysSinceMaint = last ? Math.floor((now - last) / DAY) : null;
    if (!last || daysSinceMaint > 180) {
      dueForMaintenance.push({ _id: a._id, name: a.name, assetTag: a.assetTag, daysSinceMaint });
    }
    if (a.acquisitionDate) {
      const ageYears = (now - new Date(a.acquisitionDate)) / (365 * DAY);
      if (ageYears >= 4) {
        nearingRetirement.push({ _id: a._id, name: a.name, assetTag: a.assetTag, ageYears: Math.round(ageYears * 10) / 10 });
      }
    }
  }
  res.json({ success: true, data: { dueForMaintenance, nearingRetirement } });
});

/**
 * GET /api/reports/audit-discrepancies -> flagged (Missing/Damaged) items across
 * all audit cycles, so the discrepancy report is visible on the Reports tab.
 */
export const auditDiscrepancies = asyncHandler(async (req, res) => {
  const cycles = await AuditCycle.find({})
    .populate('items.asset', 'name assetTag status')
    .populate('department', 'name')
    .sort({ updatedAt: -1 });
  const rows = [];
  for (const c of cycles) {
    for (const it of c.items) {
      if (['Missing', 'Damaged'].includes(it.mark)) {
        rows.push({
          cycle: c.title,
          cycleStatus: c.status,
          scope: c.department?.name || c.location || '—',
          assetTag: it.asset?.assetTag || '—',
          assetName: it.asset?.name || '—',
          assetStatus: it.asset?.status,
          mark: it.mark,
          expectedLocation: it.expectedLocation || '—',
          note: it.note || '',
          date: c.updatedAt,
        });
      }
    }
  }
  res.json({ success: true, data: { rows } });
});

/** GET /api/reports/export?type= -> stream the chosen report as CSV. */
export const exportCsv = asyncHandler(async (req, res) => {
  const { type = 'utilization' } = req.query;
  let headers = [];
  let rows = [];

  if (type === 'utilization') {
    const data = await Asset.aggregate([
      { $group: { _id: '$department', total: { $sum: 1 }, allocated: { $sum: { $cond: [{ $eq: ['$status', 'Allocated'] }, 1, 0] } } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $project: { department: { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] }, total: 1, allocated: 1 } },
    ]);
    headers = ['Department', 'Allocated', 'Total'];
    rows = data.map((r) => [r.department, r.allocated, r.total]);
  } else if (type === 'most-used') {
    const [allocs, books, maints, assets] = await Promise.all([
      Allocation.aggregate([{ $group: { _id: '$asset', c: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$resource', c: { $sum: 1 } } }]),
      MaintenanceRequest.aggregate([{ $group: { _id: '$asset', c: { $sum: 1 } } }]),
      Asset.find().select('name assetTag'),
    ]);
    const count = new Map();
    [allocs, books, maints].forEach((arr) => arr.forEach((r) => count.set(String(r._id), (count.get(String(r._id)) || 0) + r.c)));
    headers = ['Tag', 'Name', 'Uses'];
    rows = assets.map((a) => [a.assetTag, a.name, count.get(String(a._id)) || 0]).sort((x, y) => y[2] - x[2]);
  } else if (type === 'idle') {
    const cutoff = new Date(Date.now() - 30 * DAY);
    const [recentAllocs, recentBooks, assets] = await Promise.all([
      Allocation.find({ allocatedDate: { $gte: cutoff } }).select('asset'),
      Booking.find({ startTime: { $gte: cutoff } }).select('resource'),
      Asset.find().select('name assetTag status updatedAt createdAt'),
    ]);
    const active = new Set([...recentAllocs.map((a) => String(a.asset)), ...recentBooks.map((b) => String(b.resource))]);
    headers = ['Tag', 'Name', 'Status', 'Idle Days'];
    rows = assets.filter((a) => !active.has(String(a._id)))
      .map((a) => [a.assetTag, a.name, a.status, Math.floor((Date.now() - new Date(a.updatedAt || a.createdAt)) / DAY)]);
  } else if (type === 'maintenance') {
    const data = await MaintenanceRequest.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    headers = ['Month', 'Requests'];
    rows = data.map((r) => [r._id, r.count]);
  } else if (type === 'audit-discrepancies') {
    const cycles = await AuditCycle.find({}).populate('items.asset', 'name assetTag');
    headers = ['Cycle', 'Asset', 'Name', 'Mark', 'Expected Location'];
    rows = [];
    for (const c of cycles) {
      for (const it of c.items) {
        if (['Missing', 'Damaged'].includes(it.mark)) {
          rows.push([c.title, it.asset?.assetTag || '', it.asset?.name || '', it.mark, it.expectedLocation || '']);
        }
      }
    }
  } else {
    // Default: full asset inventory.
    const assets = await Asset.find().populate('category', 'name').populate('department', 'name');
    headers = ['Tag', 'Name', 'Category', 'Status', 'Location', 'Department'];
    rows = assets.map((a) => [a.assetTag, a.name, a.category?.name || '', a.status, a.location || '', a.department?.name || '']);
  }

  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}.csv"`);
  res.send(csv);
});
