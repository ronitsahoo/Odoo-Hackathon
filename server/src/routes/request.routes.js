import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import * as request from '../controllers/request.controller.js';

const router = Router();

const createRules = [
  body('itemId').notEmpty().withMessage('itemId is required').isMongoId(),
  body('message').optional().isLength({ max: 500 }),
];

const statusRules = [
  body('status')
    .isIn(['accepted', 'rejected', 'cancelled', 'completed'])
    .withMessage('Invalid target status'),
];

router.get('/', protect, request.listRequests);
router.post('/', protect, createRules, validate, request.createRequest);
router.patch('/:id', protect, statusRules, validate, request.updateRequestStatus);

export default router;
