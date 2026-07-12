import { Search } from 'lucide-react';
import { input } from '../lib/ui.js';

/**
 * Search box + category filter + sort dropdown. Controlled by itemStore filters.
 * `categories` and `statuses` are optional; pass statuses only for admin views.
 */
export default function SearchFilterBar({
  filters,
  onChange,
  categories = [],
  statuses = null,
  sorts = [
    { value: 'new', label: 'Newest' },
    { value: 'old', label: 'Oldest' },
    { value: 'top', label: 'Most upvoted' },
  ],
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${input} pl-9`}
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      {categories.length > 0 && (
        <select
          className={`${input} sm:w-44`}
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {statuses && (
        <select
          className={`${input} sm:w-40`}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      <select
        className={`${input} sm:w-40`}
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value })}
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
