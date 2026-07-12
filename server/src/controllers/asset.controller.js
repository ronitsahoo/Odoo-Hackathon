import { Asset } from '../models/Asset.js';
import { AssetCategory } from '../models/AssetCategory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.middleware.js';
import { getNextAssetTag } from '../models/Counter.js';
import { emitAssetCreated, emitAssetUpdated } from '../sockets/index.js';

/**
 * Asset controller — cloned from item.controller.js and adapted for Module 3.
 * Handles CRUD + search/filter/pagination for the asset directory.
 */

/**
 * GET /api/assets
 * Query: search (matches tag/serial/name or treats as scanned QR),
 *        category, status, department, sort, page, limit.
 * Returns { assets, total, page, pages }.
 */
export const listAssets = asyncHandler(async (req, res) => {
  const {
    search = '',
    category = '',
    status = '',
    department = '',
    sort = 'new',
  } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = {};

  // Search: try exact match on assetTag first (QR scan), otherwise text search
  if (search) {
    const trimmed = search.trim();
    // Check if it looks like an asset tag (AF-XXXX)
    if (/^AF-\d{4}$/i.test(trimmed)) {
      filter.assetTag = trimmed.toUpperCase();
    } else {
      filter.$text = { $search: trimmed };
    }
  }

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (department) filter.department = department;

  const sortMap = {
    new: { createdAt: -1 },
    old: { createdAt: 1 },
    tag: { assetTag: 1 },
    cost: { acquisitionCost: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.new;

  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .populate('category', 'name')
      .populate('department', 'name')
      .populate('currentHolder', 'name email')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit),
    Asset.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { assets, total, page, pages: Math.ceil(total / limit) || 1 },
  });
});

/**
 * GET /api/assets/:id -> single asset with full details + history
 */
export const getAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id)
    .populate('category', 'name customFields')
    .populate('department', 'name')
    .populate('currentHolder', 'name email avatar')
    .populate('allocationHistory.user', 'name email')
    .populate('maintenanceHistory.performedBy', 'name email');

  if (!asset) throw new ApiError(404, 'Asset not found');

  res.json({ success: true, data: { asset } });
});

/**
 * POST /api/assets -> register a new asset (asset_manager/admin only)
 * Auto-assigns the next assetTag from the Counter; defaults to Available.
 */
export const createAsset = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    serialNumber,
    acquisitionDate,
    acquisitionCost,
    condition,
    location,
    department,
    isBookable,
    customFieldValues,
  } = req.body;

  // Generate the next asset tag atomically
  const assetTag = await getNextAssetTag();

  // Parse customFieldValues if sent as JSON string
  let parsedCustomFields = {};
  if (customFieldValues) {
    parsedCustomFields =
      typeof customFieldValues === 'string'
        ? safeJson(customFieldValues)
        : customFieldValues;
  }

  const asset = await Asset.create({
    name,
    category,
    assetTag,
    serialNumber: serialNumber || '',
    acquisitionDate: acquisitionDate || null,
    acquisitionCost: acquisitionCost ? Number(acquisitionCost) : 0,
    condition: condition || '',
    location: location || '',
    department: department || null,
    isBookable: isBookable === 'true' || isBookable === true,
    photos: (req.files || []).map(toPublicPath),
    customFieldValues: parsedCustomFields,
    status: 'Available', // new assets enter as Available
  });

  await asset.populate(['category', 'department']);
  emitAssetCreated(asset); // live directory update
  res.status(201).json({ success: true, data: { asset } });
});

/**
 * PATCH /api/assets/:id -> edit asset fields (asset_manager/admin only)
 * Not a workflow transition — status changes via allocate/maintain/etc.
 */
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const {
    name,
    category,
    serialNumber,
    acquisitionDate,
    acquisitionCost,
    condition,
    location,
    department,
    isBookable,
    customFieldValues,
    removePhotos,
  } = req.body;

  if (name !== undefined) asset.name = name;
  if (category !== undefined) asset.category = category;
  if (serialNumber !== undefined) asset.serialNumber = serialNumber;
  if (acquisitionDate !== undefined) asset.acquisitionDate = acquisitionDate || null;
  if (acquisitionCost !== undefined) asset.acquisitionCost = Number(acquisitionCost) || 0;
  if (condition !== undefined) asset.condition = condition;
  if (location !== undefined) asset.location = location;
  if (department !== undefined) asset.department = department || null;
  if (isBookable !== undefined) asset.isBookable = isBookable === 'true' || isBookable === true;

  // Update custom field values (merge)
  if (customFieldValues) {
    const parsed =
      typeof customFieldValues === 'string' ? safeJson(customFieldValues) : customFieldValues;
    asset.customFieldValues = new Map({ ...Object.fromEntries(asset.customFieldValues), ...parsed });
  }

  // Handle photo removal + new uploads
  if (removePhotos) {
    const toRemove = Array.isArray(removePhotos) ? removePhotos : [removePhotos];
    asset.photos = asset.photos.filter((p) => !toRemove.includes(p));
  }
  if (req.files?.length) asset.photos.push(...req.files.map(toPublicPath));

  await asset.save();
  await asset.populate(['category', 'department', 'currentHolder']);
  emitAssetUpdated(asset);
  res.json({ success: true, data: { asset } });
});

// --- Helpers ---------------------------------------------------------------

function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
