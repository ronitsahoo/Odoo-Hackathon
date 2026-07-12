import express from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/dashboard/summary -> dashboard KPIs + overdue + recent activity
router.get('/summary', protect, getDashboardSummary);

export default router;
