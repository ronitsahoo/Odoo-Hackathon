import { NavLink, Outlet } from 'react-router-dom';
import { Building2 } from 'lucide-react';

/**
 * Organization setup (admin-only, Module 2 home). Hosts the sub-tabs for the
 * org's people and structure; the Employee tab renders the directory. Future
 * tabs (Departments, Categories) are shown disabled until those modules land.
 */
const tabCls = ({ isActive }) =>
  `-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'border-brand-600 text-brand-700'
      : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

export default function OrganizationSetup() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Building2 size={24} /> Organization setup
        </h1>
        <p className="text-sm text-slate-500">Manage the people and structure behind AssetFlow.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        <NavLink to="employees" className={tabCls}>
          Employee
        </NavLink>
        {/* Placeholders for later Module 2 work — not links, so nothing dead-links. */}
        <span className="cursor-not-allowed border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-300">
          Departments
        </span>
        <span className="cursor-not-allowed border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-300">
          Categories
        </span>
      </div>

      <Outlet />
    </div>
  );
}
