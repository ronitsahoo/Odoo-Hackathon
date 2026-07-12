import mongoose from 'mongoose';
import { Asset } from '../models/Asset.js';
import { Allocation } from '../models/Allocation.js';
import { Booking } from '../models/Booking.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
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
