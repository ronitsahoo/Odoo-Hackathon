import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import * as asset from '../controllers/asset.controller.js';

/**
 * Asset routes.
 * Reads: any authenticated user (protect).
 * Writes: asset_manager or admin only (requireRole).
 */
const router = Router();

const assetCreateRules = [
  body('name').trim().notEmpty().withMessage('Asset name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

const assetUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Asset name is required'),
  body('category').optional().trim().notEmpty().withMessage('Category is required'),
];

// --- Asset collection ---
router.get('/', protect, asset.listAssets);
router.post(
  '/',
  protect,
  requireRole('asset_manager', 'admin'),
  upload.array('photos', 10),
  assetCreateRules,
  validate,
  asset.createAsset
);

// --- Single asset ---
router.get('/:id', protect, asset.getAsset);
router.patch(
  '/:id',
  protect,
  requireRole('asset_manager', 'admin'),
  upload.array('photos', 10),
  assetUpdateRules,
  validate,
  asset.updateAsset
);

export default router;
