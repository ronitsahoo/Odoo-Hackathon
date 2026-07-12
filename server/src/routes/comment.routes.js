import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as comment from '../controllers/comment.controller.js';

/**
 * Top-level comment actions (by comment id). Creation + listing live under
 * /api/items/:itemId/comments in item.routes.js.
 */
const router = Router();

router.post('/:id/vote', protect, comment.voteComment);
router.patch('/:id/accept', protect, comment.acceptComment);
router.delete('/:id', protect, comment.deleteComment);

export default router;
