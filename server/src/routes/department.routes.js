import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as departments from '../controllers/department.controller.js';

const router = Router();

// Any authenticated user can list (for dropdowns in Screens 4 & 5).
router.get('/', protect, departments.getDepartments);

// Admin-only writes.
router.post(
  '/',
  protect,
  requireRole('admin'),
  body('name').trim().notEmpty().withMessage('Department name is required'),
  validate,
  departments.createDepartment
);

router.patch(
  '/:id',
  protect,
  requireRole('admin'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  validate,
  departments.updateDepartment
);

export default router;
