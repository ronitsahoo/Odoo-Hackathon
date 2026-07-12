/**
 * Single source of truth for user roles.
 * ROLES = every stored role (privilege ascends left→right).
 * ASSIGNABLE = roles an admin may grant via the directory; 'admin' is
 * intentionally excluded so admin can only be created by seeding.
 */
export const ROLES = ['employee', 'dept_head', 'asset_manager', 'admin'];
export const ASSIGNABLE = ['employee', 'dept_head', 'asset_manager'];
