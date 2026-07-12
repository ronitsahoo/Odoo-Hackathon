import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Search } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useDepartmentStore } from '../../store/departmentStore.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { input } from '../../lib/ui.js';

// Roles an admin may assign, with human labels + badge colours.
const ASSIGNABLE = [
  { value: 'employee', label: 'Employee' },
  { value: 'dept_head', label: 'Dept Head' },
  { value: 'asset_manager', label: 'Asset Manager' },
];
const ROLE_LABEL = {
  employee: 'Employee',
  dept_head: 'Dept Head',
  asset_manager: 'Asset Manager',
  admin: 'Admin',
};
const ROLE_COLOR = {
  admin: 'bg-brand-100 text-brand-700',
  asset_manager: 'bg-indigo-100 text-indigo-700',
  dept_head: 'bg-amber-100 text-amber-700',
  employee: 'bg-slate-100 text-slate-600',
};

/**
 * Admin-only employee directory: search/filter users, promote via the role
 * API, and activate/deactivate accounts. The admin's own row is locked
 * (the server enforces this too).
 */
export default function EmployeeDirectory() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: '', status: '', department: '' });
  const { departments: allDepartments, fetchDepartments } = useDepartmentStore();

  async function load() {
    try {
      // Send only non-empty filters so the list query stays clean.
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get('/users', { params });
      setUsers(data.data.users);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch whenever a filter changes (small dataset — no debounce needed).
  useEffect(() => {
    load();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function setFilter(patch) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  async function changeRole(u, role) {
    try {
      const { data } = await api.patch(`/users/${u._id}/role`, { role });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data.user : x)));
      toast.success(`${u.name} is now ${ROLE_LABEL[role]}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function toggleStatus(u) {
    const status = u.status === 'active' ? 'inactive' : 'active';
    try {
      const { data } = await api.patch(`/users/${u._id}/status`, { status });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data.user : x)));
      toast.success(status === 'active' ? 'Account activated' : 'Account deactivated');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function changeDepartment(u, departmentId) {
    try {
      const { data } = await api.patch(`/users/${u._id}/department`, {
        department: departmentId || null,
      });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data.user : x)));
      toast.success(departmentId ? 'Department assigned' : 'Department cleared');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  // Departments arrive in Module 2; derive filter options from loaded users.
  const departments = Array.from(
    new Map(
      users
        .filter((u) => u.department)
        .map((u) => [u.department._id || u.department, u.department])
    ).values()
  );

  return (
    <div className="space-y-4">
      {/* Search + filters (all hit the list query) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${input} pl-9`}
            placeholder="Search name or email…"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
        <select
          className={`${input} sm:w-44`}
          value={filters.role}
          onChange={(e) => setFilter({ role: e.target.value })}
        >
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={`${input} sm:w-40`}
          value={filters.status}
          onChange={(e) => setFilter({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className={`${input} sm:w-44`}
          value={filters.department}
          onChange={(e) => setFilter({ department: e.target.value })}
          disabled={departments.length === 0}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d._id || d} value={d._id || d}>
              {d.name || '—'}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader label="Loading users…" />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isMe = u._id === me._id;
                  return (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          {u.name}
                          {u.role === 'admin' && <Shield size={13} className="text-brand-600" />}
                          {isMe && <span className="text-xs text-slate-400">(you)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className={`${input} w-40`}
                          value={u.department?._id || ''}
                          disabled={isMe}
                          onChange={(e) => changeDepartment(u, e.target.value)}
                          title="Assign department"
                        >
                          <option value="">— None —</option>
                          {allDepartments
                            .filter((d) => d.status === 'active')
                            .map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role] || u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.status === 'active' ? (
                          <Badge color="bg-emerald-100 text-emerald-700">active</Badge>
                        ) : (
                          <Badge color="bg-red-100 text-red-700">inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Promote/demote — the only place role changes. */}
                          <select
                            className={`${input} w-40`}
                            value={ASSIGNABLE.some((r) => r.value === u.role) ? u.role : ''}
                            disabled={isMe || u.role === 'admin'}
                            onChange={(e) => changeRole(u, e.target.value)}
                            title={u.role === 'admin' ? "Admins can't be changed here" : 'Change role'}
                          >
                            {u.role === 'admin' && <option value="">Admin</option>}
                            {ASSIGNABLE.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant={u.status === 'active' ? 'danger' : 'success'}
                            onClick={() => toggleStatus(u)}
                            disabled={isMe}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No users match those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
