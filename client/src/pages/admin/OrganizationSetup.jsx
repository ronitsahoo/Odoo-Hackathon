import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';

/**
 * Organization setup (admin-only). Hosts three sub-tabs:
 * Departments, Categories, Employee. The "+ Add" button dispatches a custom
 * event that the active tab listens for to open its create modal.
 */
const tabCls = ({ isActive }) =>
  `-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'border-brand-600 text-brand-700'
      : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

export default function OrganizationSetup() {
  const { pathname } = useLocation();

  // Determine which tab is active to dispatch the right add event.
  function handleAdd() {
    if (pathname.includes('departments')) {
      window.dispatchEvent(new Event('org:add-department'));
    } else if (pathname.includes('categories')) {
      window.dispatchEvent(new Event('org:add-category'));
    }
    // Employee tab doesn't have a create action from here.
  }

  // Only show "+ Add" on departments and categories tabs.
  const showAdd = pathname.includes('departments') || pathname.includes('categories');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Building2 size={24} /> Organization setup
        </h1>
        <p className="text-sm text-slate-500">Manage the people and structure behind AssetFlow.</p>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1">
          <NavLink to="departments" className={tabCls}>
            Departments
          </NavLink>
          <NavLink to="categories" className={tabCls}>
            Categories
          </NavLink>
          <NavLink to="employees" className={tabCls}>
            Employee
          </NavLink>
        </div>
        {showAdd && (
          <Button size="sm" onClick={handleAdd} className="mb-1">
            <Plus size={14} /> Add
          </Button>
        )}
      </div>

      <Outlet />
    </div>
  );
}
