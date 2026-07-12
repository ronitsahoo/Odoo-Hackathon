import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ASSIGNABLE } from '../utils/roles.js';
import * as users from '../controllers/user.controller.js';

/** Every route here requires an authenticated admin. */
const router = Router();
router.use(protect, requireRole('admin'));

router.get('/', users.listUsers);

router.patch(
  '/:id/role',
  body('role').isIn(ASSIGNABLE).withMessage('Invalid role'),
  validate,
  users.setRole
);

router.patch(
  '/:id/status',
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status'),
  validate,
  users.setStatus
);

router.patch(
  '/:id/department',
  body('department').optional({ values: 'null' }),
  validate,
  users.assignDepartment
);

export default router;
