import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, Plus, User, Shield, Users, ShieldCheck, Megaphone, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

/**
 * Mobile drawer navigation (hidden on md+, where the Navbar carries the links).
 * Role-aware: admin links only render for admins.
 */
export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuthStore();

  const item = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-white p-4 shadow-xl transition-transform md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-bold text-slate-900">Menu</span>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1" onClick={onClose}>
          <NavLink to="/" className={item} end>
            <Home size={18} /> Browse
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className={item}>
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
              <NavLink to="/items/new" className={item}>
                <Plus size={18} /> Create item
              </NavLink>
              <NavLink to="/profile" className={item}>
                <User size={18} /> Profile
              </NavLink>
            </>
          )}

          {isAdmin() && (
            <>
              <div className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Admin
              </div>
              <NavLink to="/admin" className={item} end>
                <Shield size={18} /> Dashboard
              </NavLink>
              <NavLink to="/admin/moderation" className={item}>
                <ShieldCheck size={18} /> Moderation
              </NavLink>
              <NavLink to="/admin/users" className={item}>
                <Users size={18} /> Users
              </NavLink>
              <NavLink to="/admin/broadcast" className={item}>
                <Megaphone size={18} /> Broadcast
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
