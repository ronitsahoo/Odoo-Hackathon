import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as report from '../controllers/report.controller.js';

/** Reports are for managers/admins. */
const router = Router();
router.use(protect, requireRole('asset_manager', 'admin'));

router.get('/utilization-by-department', report.utilizationByDepartment);
router.get('/maintenance-frequency', report.maintenanceFrequency);
router.get('/maintenance-by-group', report.maintenanceByGroup);
router.get('/booking-heatmap', report.bookingHeatmap);
router.get('/audit-discrepancies', report.auditDiscrepancies);
router.get('/most-used', report.mostUsed);
router.get('/idle', report.idleAssets);
router.get('/attention', report.attention);
router.get('/export', report.exportCsv);

export default router;
