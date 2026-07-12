import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const profileRules = [
  body('name').optional().trim().isLength({ min: 1, max: 60 }),
  body('bio').optional().isLength({ max: 300 }),
  body('isPublic').optional().isBoolean(),
];

router.post('/register', registerRules, validate, auth.register);
router.post('/login', loginRules, validate, auth.login);
router.get('/me', protect, auth.me);
router.patch('/profile', protect, profileRules, validate, auth.updateProfile);

export default router;
