import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as audit from '../controllers/audit.controller.js';

const router = Router();

router.get('/', protect, audit.listAudits);
router.post(
  '/',
  protect,
  requireRole('admin'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('scopeType').isIn(['department', 'location']).withMessage('Invalid scope type'),
  validate,
  audit.createAudit
);

router.get('/:id', protect, audit.getAudit);
router.get('/:id/discrepancies', protect, audit.getDiscrepancies);

// An assigned auditor (or admin) marks items; controller enforces the auditor check.
router.patch(
  '/:id/items/:assetId',
  protect,
  body('mark').isIn(['Verified', 'Missing', 'Damaged', 'Pending']).withMessage('Invalid mark'),
  validate,
  audit.markItem
);

router.patch('/:id/close', protect, requireRole('admin'), audit.closeAudit);

export default router;
