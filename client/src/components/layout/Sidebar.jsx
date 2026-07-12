import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardList,
  BarChart3,
  Bell,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

/**
 * Primary AssetFlow navigation. Persistent column on md+, slide-in drawer on
 * mobile. Role-aware: admin-only items are filtered out for everyone else.
 * "Employee" is not a top-level entry — it lives as a tab inside Organization
 * setup (see pages/admin/OrganizationSetup.jsx).
 */
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/organization', label: 'Organization setup', icon: Building2, adminOnly: true },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/allocation', label: 'Allocation & Transfer', icon: ArrowLeftRight },
  { to: '/booking', label: 'Resource Booking', icon: CalendarClock },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/audit', label: 'Audit', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

/** The nav list, shared by the desktop column and the mobile drawer. */
function NavList({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1" onClick={onNavigate}>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={linkCls}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** AssetFlow wordmark used at the top of both variants. */
function Brand() {
  return (
    <div className="flex items-center">
      <img 
        src="/images/assetflow-logo.png" 
        alt="AssetFlow" 
        className="h-16"
      />
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuthStore();

  // Only signed-in users see the app nav; admin-only items are gated by role.
  const items = user ? NAV.filter((i) => !i.adminOnly || isAdmin()) : [];

  return (
    <>
      {/* Desktop: persistent column */}
      {items.length > 0 && (
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 md:block">
          <NavList items={items} />
        </aside>
      )}

      {/* Mobile: slide-in drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-white p-4 shadow-xl transition-transform md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <Brand />
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <NavList items={items} onNavigate={onClose} />
      </aside>
    </>
  );
}
