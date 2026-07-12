import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import * as item from '../controllers/item.controller.js';
import * as comment from '../controllers/comment.controller.js';

/**
 * REFERENCE routes — clone this file for a new resource.
 * Note: reads use optionalAuth (guests allowed); writes use protect.
 * `upload.array('images', 5)` parses multipart BEFORE validation runs.
 */
const router = Router();

const itemRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 140 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

const voteRules = [
  body('value').isIn([1, -1, '1', '-1']).withMessage('Vote value must be 1 or -1'),
];

const commentRules = [body('body').trim().notEmpty().withMessage('Comment cannot be empty')];

// --- Item collection ---
router.get('/', optionalAuth, item.listItems);
router.post('/', protect, upload.array('images', 5), itemRules, validate, item.createItem);

// --- Single item ---
router.get('/:id', optionalAuth, item.getItem);
router.put('/:id', protect, upload.array('images', 5), itemRules, validate, item.updateItem);
router.delete('/:id', protect, item.deleteItem);
router.post('/:id/vote', protect, voteRules, validate, (req, res, next) => {
  req.body.value = Number(req.body.value); // normalize "1" -> 1
  next();
}, item.voteItem);

// --- Comments nested under an item ---
router.get('/:itemId/comments', comment.listComments);
router.post('/:itemId/comments', protect, commentRules, validate, comment.createComment);

export default router;
