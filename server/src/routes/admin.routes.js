import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as admin from '../controllers/admin.controller.js';

/** Every route here requires an authenticated admin. */
const router = Router();
router.use(protect, requireRole('admin'));

router.get('/stats', admin.getStats);

// User management moved to /api/users in Module 1 (role/status admin API).

router.get('/moderation', admin.listModerationQueue);
router.patch(
  '/items/:id/moderate',
  body('status').isIn(['approved', 'rejected']),
  validate,
  admin.moderateItem
);
router.delete('/items/:id', admin.adminDeleteItem);

router.post(
  '/broadcast',
  body('message').trim().notEmpty().withMessage('Message is required'),
  validate,
  admin.broadcast
);

export default router;
