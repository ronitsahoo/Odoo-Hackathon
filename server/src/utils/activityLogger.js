import { ActivityLog } from '../models/ActivityLog.js';
import { emitActivity } from '../sockets/index.js';

/**
 * Small helper to log activity from controllers and push a live
 * signal so the dashboard Recent Activity feed refreshes.
 * Usage: await logActivity({ actor, action, summary, entityType, entityId })
 */
export async function logActivity({ actor, action, summary, entityType, entityId }) {
  try {
    const log = await ActivityLog.create({ actor, action, summary, entityType, entityId });
    try {
      emitActivity({ _id: log._id, action, summary, createdAt: log.createdAt });
    } catch {
      // sockets may not be initialized (e.g. during seed) — ignore.
    }
  } catch (err) {
    // Activity logging is non-critical; never block the main operation.
    console.error('[logActivity] Failed to log activity:', err.message);
  }
}
