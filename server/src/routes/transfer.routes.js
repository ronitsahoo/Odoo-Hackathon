import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as transfer from '../controllers/transfer.controller.js';

const router = Router();

const canApprove = requireRole('asset_manager', 'dept_head', 'admin');

router.get('/', protect, transfer.listTransfers);

// Any authenticated user may request a transfer on an allocated asset.
router.post(
  '/',
  protect,
  body('asset').notEmpty().withMessage('Asset is required'),
  body('toRequester').notEmpty().withMessage('Requester is required'),
  validate,
  transfer.createTransfer
);

router.patch('/:id/approve', protect, canApprove, transfer.approveTransfer);
router.patch('/:id/reject', protect, canApprove, transfer.rejectTransfer);

export default router;
