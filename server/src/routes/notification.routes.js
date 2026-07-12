import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as notification from '../controllers/notification.controller.js';

const router = Router();

router.get('/', protect, notification.listNotifications);
router.patch('/read-all', protect, notification.markAllRead);
router.patch('/:id/read', protect, notification.markRead);

export default router;
