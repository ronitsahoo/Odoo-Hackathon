import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import * as maintenance from '../controllers/maintenance.controller.js';

const router = Router();

const STATUSES = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved', 'Rejected'];

// Any authenticated user can view the board + raise a request.
router.get('/', protect, maintenance.listMaintenance);
router.post(
  '/',
  protect,
  upload.single('photo'),
  body('asset').notEmpty().withMessage('Asset is required'),
  body('issue').trim().notEmpty().withMessage('Issue is required'),
  validate,
  maintenance.createMaintenance
);

// Only managers/admins move cards through the workflow.
router.patch(
  '/:id/status',
  protect,
  requireRole('asset_manager', 'admin'),
  body('status').isIn(STATUSES).withMessage('Invalid status'),
  validate,
  maintenance.updateMaintenanceStatus
);

export default router;
