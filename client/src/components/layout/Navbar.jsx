import { Link, useNavigate } from 'react-router-dom';
import { Menu, Plus, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import NotificationBell from '../NotificationBell.jsx';
import { btn } from '../../lib/ui.js';

/**
 * Top bar. Primary navigation lives in the Sidebar now; this keeps the brand,
 * the mobile menu toggle, and per-user actions (create / bell / profile).
 * `onMenu` opens the mobile sidebar drawer.
 */
export default function Navbar({ onMenu }) {
  const { user, logout, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6 lg:px-8">
        {/* Mobile menu toggle */}
        <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 md:hidden">
          <Menu size={20} />
        </button>

        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/images/assetflow-logo.png" 
            alt="AssetFlow" 
            className="h-20 md:h-24"
          />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>

              <NotificationBell />
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100"
              >
                <Avatar user={user} />
                <span className="hidden text-sm font-medium text-slate-700 lg:inline">
                  {user.name}
                </span>
                {isAdmin() && <Shield size={14} className="text-brand-600" />}
              </Link>
              <button onClick={handleLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                Log in
              </Link>
              <Link to="/register" className={`${btn.base} ${btn.primary} ${btn.sm}`}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Round avatar with initial fallback. */
function Avatar({ user }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
      {user.name?.[0]?.toUpperCase() || <UserIcon size={14} />}
    </span>
  );
}
