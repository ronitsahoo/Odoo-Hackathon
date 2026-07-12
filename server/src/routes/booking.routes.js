import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import * as booking from '../controllers/booking.controller.js';

const router = Router();

// Any authenticated user can view + book resources.
router.get('/', protect, booking.listBookings);
router.post(
  '/',
  protect,
  body('resource').notEmpty().withMessage('Resource is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  validate,
  booking.createBooking
);
router.patch('/:id/cancel', protect, booking.cancelBooking);

export default router;
