import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, X, ShieldCheck } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Loader from '../../components/ui/Loader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/**
 * Moderation queue: pending items with approve/reject. Approving emits
 * item:updated, so the item appears on the public Home instantly and the
 * owner gets a real-time notification.
 */
export default function AdminModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get('/admin/moderation');
      setItems(data.data.items);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // New pending items arrive live.
  useSocket('item:created', (item) => {
    if (item.status === 'pending') setItems((prev) => [...prev, item]);
  });

  async function moderate(id, status) {
    try {
      await api.patch(`/admin/items/${id}/moderate`, { status });
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success(`Item ${status}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (loading) return <Loader label="Loading queue…" />;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <ShieldCheck size={24} /> Moderation queue
      </h1>

      {items.length === 0 ? (
        <EmptyState title="Queue is clear" hint="No items are waiting for approval." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item._id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link to={`/items/${item._id}`} className="font-medium text-slate-800 hover:underline">
                  {item.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {item.category} · by {item.owner?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => moderate(item._id, 'approved')}>
                  <Check size={15} /> Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => moderate(item._id, 'rejected')}>
                  <X size={15} /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
