import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as allocation from '../controllers/allocation.controller.js';

const router = Router();

// Managers/heads/admins allocate + return; any authenticated user can read history.
const canManage = requireRole('asset_manager', 'dept_head', 'admin');

router.get('/overdue', protect, allocation.getOverdue);
router.get('/asset/:assetId', protect, allocation.getAssetAllocations);

router.post(
  '/',
  protect,
  canManage,
  body('asset').notEmpty().withMessage('Asset is required'),
  body('holder').notEmpty().withMessage('Holder is required'),
  validate,
  allocation.allocate
);

router.post('/:assetId/return', protect, canManage, allocation.returnAsset);

export default router;
