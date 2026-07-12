import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

/** Gate a route by authentication. Redirects guests to /login. */
export default function ProtectedRoute({ children }) {
  const { token, user, initialized } = useAuthStore();
  const location = useLocation();

  // Wait for loadUser() to resolve so we don't flash the login page.
  if (!initialized) return null;
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
