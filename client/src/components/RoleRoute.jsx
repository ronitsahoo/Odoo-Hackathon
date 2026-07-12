import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

/** Gate a route by role (default 'admin'). Non-matching users go Home. */
export default function RoleRoute({ role = 'admin', children }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}
