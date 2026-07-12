import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAssetStore } from '../../store/assetStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import { btn, input } from '../../lib/ui.js';
import Loader from '../../components/ui/Loader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Select from '../../components/ui/Select.jsx';
import api from '../../api/axios.js';

/**
 * Assets directory (Module 3 Screen 4): search + filters + table + register button.
 * Shows Tag · Name · Category · Status · Location. Row click → detail.
 */
export default function Assets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const canManage = user?.role === 'asset_manager' || user?.role === 'admin';
  const canScope = user?.role === 'employee' || user?.role === 'dept_head';

  const {
    assets,
    total,
    page,
    pages,
    filters,
    loading,
    error,
    setFilters,
    setPage,
    fetchAssets,
    _upsert,
    _remove,
  } = useAssetStore();

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  // Local search text, debounced into the store filter so we don't refetch per keystroke.
  const [searchText, setSearchText] = useState(filters.search);
  const debounceRef = useRef(null);

  // Fetch categories and departments for filters
  useEffect(() => {
    async function loadOptions() {
      try {
        const [catRes, deptRes] = await Promise.all([
          api.get('/categories'),
          api.get('/departments'),
        ]);
        setCategories(catRes.data.data.categories.filter((c) => c.status === 'active'));
        setDepartments(deptRes.data.data.departments.filter((d) => d.status === 'active'));
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, []);

  // Apply status/category filters passed via URL (e.g. from dashboard KPI links).
  useEffect(() => {
    const patch = {};
    if (searchParams.get('status')) patch.status = searchParams.get('status');
    if (searchParams.get('category')) patch.category = searchParams.get('category');
    if (searchParams.get('mine')) patch.mine = searchParams.get('mine');
    if (Object.keys(patch).length) setFilters(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch assets when filters or page changes
  useEffect(() => {
    fetchAssets();
  }, [filters, page, fetchAssets]);

  // Debounce the search box (300ms) into the store filter.
  function onSearchChange(value) {
    setSearchText(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilters({ search: value.trim() }), 300);
  }

  // Socket: live updates
  useSocket('asset:created', (asset) => _upsert(asset), [user?._id]);
  useSocket('asset:updated', (asset) => _upsert(asset), [user?._id]);
  useSocket('asset:deleted', ({ id }) => _remove(id), [user?._id]);

  const statusOptions = [
    'Available',
    'Allocated',
    'Reserved',
    'Under Maintenance',
    'Lost',
    'Retired',
    'Disposed',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} {total === 1 ? 'asset' : 'assets'} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canScope && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={filters.mine === 'true'}
                onChange={(e) => setFilters({ mine: e.target.checked ? 'true' : '' })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              {user?.role === 'dept_head' ? 'My department' : 'My assets'}
            </label>
          )}
          {canManage && (
            <button
              onClick={() => navigate('/assets/register')}
              className={`${btn.base} ${btn.primary} ${btn.md}`}
            >
              <Plus size={18} /> Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search by tag, serial, or QR code..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${input} pl-10`}
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select
          value={filters.category}
          onChange={(e) => setFilters({ category: e.target.value })}
          options={[
            { value: '', label: 'All Categories' },
            ...categories.map((c) => ({ value: c._id, label: c.name })),
          ]}
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          options={[
            { value: '', label: 'All Statuses' },
            ...statusOptions.map((s) => ({ value: s, label: s })),
          ]}
        />
        <Select
          value={filters.department}
          onChange={(e) => setFilters({ department: e.target.value })}
          options={[
            { value: '', label: 'All Departments' },
            ...departments.map((d) => ({ value: d._id, label: d.name })),
          ]}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Loader />}

      {/* Table or empty state */}
      {!loading && assets.length === 0 && (
        <EmptyState
          title="No assets found"
          message={
            filters.search || filters.category || filters.status || filters.department
              ? 'Try adjusting your filters'
              : 'Register your first asset to get started'
          }
        />
      )}

      {!loading && assets.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tag
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr
                    key={asset._id}
                    onClick={() => navigate(`/assets/${asset._id}`)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                      {asset.assetTag}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{asset.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {asset.category?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status} type="asset" />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {asset.location || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
