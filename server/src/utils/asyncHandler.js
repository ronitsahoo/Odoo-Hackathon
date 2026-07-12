/**
 * Wrap an async route handler so any thrown/rejected error is forwarded
 * to Express's error middleware instead of crashing the process.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
