import { useEffect } from 'react';
import { PackageSearch } from 'lucide-react';
import { useItemStore } from '../store/itemStore.js';
import { useSocket } from '../hooks/useSocket.js';
import SearchFilterBar from '../components/SearchFilterBar.jsx';
import ItemCard from '../components/ItemCard.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

// Adjust to the problem statement's real categories at start-hour.
const CATEGORIES = ['Question', 'Clothing', 'Bug', 'Booking', 'Other'];

/**
 * Public browse page: approved items with search/filter/sort/pagination.
 * Real-time: item:created/updated/deleted keep the grid live across tabs — an
 * admin approving an item elsewhere makes it appear here without a refresh.
 */
export default function Home() {
  const {
    items, page, pages, filters, loading, error,
    setFilters, setPage, fetchItems, _upsert, _remove,
  } = useItemStore();

  // Refetch whenever filters or page change.
  useEffect(() => {
    fetchItems();
  }, [filters, page, fetchItems]);

  // Live grid updates. Only reflect items that belong on the public list
  // (approved); anything else is removed if present.
  useSocket('item:created', (item) => {
    if (item.status === 'approved') _upsert(item);
  });
  useSocket('item:updated', (item) => {
    if (item.status === 'approved') _upsert(item);
    else _remove(item._id);
  });
  useSocket('item:deleted', ({ id }) => _remove(id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Browse</h1>
        <p className="text-sm text-slate-500">
          Discover what the community has shared. Live-updating in real time.
        </p>
      </div>

      <SearchFilterBar filters={filters} onChange={setFilters} categories={CATEGORIES} />

      {loading ? (
        <Loader label="Loading items…" />
      ) : error ? (
        <EmptyState title="Couldn't load items" hint={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No items found"
          hint="Try a different search, or be the first to create one."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
