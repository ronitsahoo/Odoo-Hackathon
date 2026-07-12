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

router.get('/users', admin.listUsers);
router.patch('/users/:id/ban', body('isBanned').isBoolean(), validate, admin.setBan);
router.patch('/users/:id/role', body('role').isIn(['user', 'admin']), validate, admin.setRole);

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
