import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();
router.use(protect, requireRole('admin'));

router.get('/stats', admin.getStats);

router.post(
  '/broadcast',
  body('message').trim().notEmpty().withMessage('Message is required'),
  validate,
  admin.broadcast
);

export default router;
