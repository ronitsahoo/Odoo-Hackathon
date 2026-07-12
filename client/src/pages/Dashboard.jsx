import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Inbox, Send } from 'lucide-react';
import api, { apiError } from '../api/axios.js';
import { useAuthStore } from '../store/authStore.js';
import { useRequestStore } from '../store/requestStore.js';
import { useSocket } from '../hooks/useSocket.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ItemCard from '../components/ItemCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

/**
 * Logged-in user's hub: their own items (any status) + incoming/outgoing
 * requests with live status transitions. When a request is accepted elsewhere,
 * its badge flips here in real time via a refetch on the notification event.
 */
export default function Dashboard() {
  const { user } = useAuthStore();
  const { incoming, outgoing, loading, fetchRequests, updateStatus } = useRequestStore();

  const [myItems, setMyItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [tab, setTab] = useState('incoming');

  async function loadItems() {
    setItemsLoading(true);
    try {
      const { data } = await api.get('/items', { params: { mine: true, limit: 50 } });
      setMyItems(data.data.items);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    fetchRequests();
  }, [fetchRequests]);

  // Live: any notification (request transition, moderation) refreshes the
  // relevant lists so the dashboard stays accurate without a manual reload.
  useSocket('notification:new', () => {
    fetchRequests();
    loadItems();
  });

  async function transition(id, status) {
    try {
      await updateStatus(id, status);
      toast.success(`Request ${status}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div className="space-y-8">
      {/* My items */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My items</h1>
          <Link to="/items/new">
            <Button size="sm">
              <Plus size={16} /> New item
            </Button>
          </Link>
        </div>

        {itemsLoading ? (
          <Loader label="Loading your items…" />
        ) : myItems.length === 0 ? (
          <EmptyState
            title="You haven't created anything yet"
            hint="Create your first item — it'll appear here with its moderation status."
            action={
              <Link to="/items/new">
                <Button size="sm">
                  <Plus size={16} /> Create item
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myItems.map((item) => (
              <ItemCard key={item._id} item={item} showStatus />
            ))}
          </div>
        )}
      </section>

      {/* Requests */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">Requests</h2>

        <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <TabButton active={tab === 'incoming'} onClick={() => setTab('incoming')}>
            <Inbox size={15} /> Incoming ({incoming.length})
          </TabButton>
          <TabButton active={tab === 'outgoing'} onClick={() => setTab('outgoing')}>
            <Send size={15} /> Outgoing ({outgoing.length})
          </TabButton>
        </div>

        {loading ? (
          <Loader label="Loading requests…" />
        ) : (
          <div className="space-y-3">
            {(tab === 'incoming' ? incoming : outgoing).map((r) => (
              <RequestRow
                key={r._id}
                request={r}
                mine={tab}
                userId={user._id}
                onTransition={transition}
              />
            ))}
            {(tab === 'incoming' ? incoming : outgoing).length === 0 && (
              <EmptyState
                title={`No ${tab} requests`}
                hint={
                  tab === 'incoming'
                    ? 'Requests others send on your items show up here.'
                    : 'Requests you send on other items show up here.'
                }
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

/** One request with role-aware action buttons for legal transitions. */
function RequestRow({ request, mine, onTransition }) {
  const isIncoming = mine === 'incoming'; // I am the item owner
  const { status } = request;

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link to={`/items/${request.item?._id}`} className="font-medium text-slate-800 hover:underline">
          {request.item?.title || 'Item'}
        </Link>
        <p className="text-sm text-slate-500">
          {isIncoming ? `From ${request.fromUser?.name}` : `To ${request.toUser?.name}`}
          {request.message ? ` — “${request.message}”` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={status} />

        {/* Owner actions */}
        {isIncoming && status === 'pending' && (
          <>
            <Button size="sm" variant="success" onClick={() => onTransition(request._id, 'accepted')}>
              Accept
            </Button>
            <Button size="sm" variant="danger" onClick={() => onTransition(request._id, 'rejected')}>
              Reject
            </Button>
          </>
        )}

        {/* Sender actions */}
        {!isIncoming && status === 'pending' && (
          <Button size="sm" variant="secondary" onClick={() => onTransition(request._id, 'cancelled')}>
            Cancel
          </Button>
        )}

        {/* Either party can complete an accepted request */}
        {status === 'accepted' && (
          <Button size="sm" onClick={() => onTransition(request._id, 'completed')}>
            Mark completed
          </Button>
        )}
      </div>
    </Card>
  );
}
