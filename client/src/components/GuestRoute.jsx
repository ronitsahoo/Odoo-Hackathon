import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

/**
 * Guard for auth pages (login/register). An already-authenticated user is sent
 * to the dashboard so they never see the login shell while signed in.
 */
export default function GuestRoute({ children }) {
  const { user, token, initialized } = useAuthStore();
  if (!initialized) return null;
  if (token && user) return <Navigate to="/" replace />;
  return children;
}
