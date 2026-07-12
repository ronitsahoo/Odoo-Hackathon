import { ActivityLog } from '../models/ActivityLog.js';

/**
 * Small helper to log activity from controllers (Module 6).
 * Usage: await logActivity({ actor, action, summary, entityType, entityId })
 */
export async function logActivity({ actor, action, summary, entityType, entityId }) {
  try {
    await ActivityLog.create({ actor, action, summary, entityType, entityId });
  } catch (err) {
    // Log but don't throw — activity logging is non-critical, shouldn't block
    // the main operation if it fails.
    console.error('[logActivity] Failed to log activity:', err.message);
  }
}
