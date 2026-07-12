import { AssetCategory } from '../models/AssetCategory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/categories — any authenticated user. */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await AssetCategory.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { categories } });
});

/** POST /api/categories — admin only. */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, customFields, status } = req.body;
  const category = await AssetCategory.create({ name, customFields: customFields || [], status });
  res.status(201).json({ success: true, data: { category } });
});

/** PATCH /api/categories/:id — admin only. Edit + status toggle. */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const { name, customFields, status } = req.body;
  if (name !== undefined) category.name = name;
  if (customFields !== undefined) category.customFields = customFields;
  if (status !== undefined) category.status = status;

  await category.save();
  res.json({ success: true, data: { category } });
});
