import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useNotificationStore } from '../../store/notificationStore.js';
import { useSocket } from '../../hooks/useSocket.js';

/**
 * App shell: navbar + mobile sidebar + routed page content.
 * Also the single place we subscribe to the user's live notification stream —
 * when `notification:new` arrives, push it into the store so the bell updates.
 */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const addLive = useNotificationStore((s) => s.addLive);

  // One global subscription for real-time notifications (bell increments live).
  useSocket('notification:new', (n) => addLive(n), [user?._id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onMenu={() => setMenuOpen(true)} />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
