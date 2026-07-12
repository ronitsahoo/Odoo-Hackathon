import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

/**
 * Gate a route by role. Pass one or more allowed roles:
 *   <RoleRoute roles={['admin']}>        (multi-role, preferred)
 *   <RoleRoute role="admin">             (single, back-compat)
 * Defaults to admin-only. Non-matching users go Home; guests go to /login.
 */
export default function RoleRoute({ role, roles, children }) {
  const { user, initialized } = useAuthStore();
  const allowed = roles ?? (role ? [role] : ['admin']);

  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
