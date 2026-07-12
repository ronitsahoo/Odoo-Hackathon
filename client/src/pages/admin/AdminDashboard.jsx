import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, Clock, Repeat, Ban, ShieldCheck, Megaphone } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Loader from '../../components/ui/Loader.jsx';

/**
 * Admin overview: genuinely-computed stat cards + quick links.
 * Re-fetches stats on any item/notification socket event so the numbers stay
 * live as users act (e.g. pending-moderation count drops on approval).
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.data);
    } catch (err) {
      apiError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Keep the dashboard live.
  useSocket('item:created', load);
  useSocket('item:updated', load);
  useSocket('item:deleted', load);

  if (loading) return <Loader label="Loading stats…" />;
  if (!stats) return <Card>Couldn't load stats.</Card>;

  const items = stats.items || {};
  const requests = stats.requests || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Users" value={stats.users} tint="bg-brand-50 text-brand-600" />
        <Stat icon={Ban} label="Banned" value={stats.banned} tint="bg-red-50 text-red-600" />
        <Stat
          icon={Clock}
          label="Pending moderation"
          value={stats.pendingModeration}
          tint="bg-amber-50 text-amber-600"
        />
        <Stat
          icon={Package}
          label="Approved items"
          value={items.approved || 0}
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Package size={18} /> Items by status
          </h3>
          <BreakdownBar data={items} keys={['pending', 'approved', 'rejected']} />
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Repeat size={18} /> Requests by status
          </h3>
          <BreakdownBar
            data={requests}
            keys={['pending', 'accepted', 'rejected', 'cancelled', 'completed']}
          />
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink to="/admin/moderation" icon={ShieldCheck} title="Moderation queue" hint="Approve or reject pending items" />
        <QuickLink to="/admin/organization" icon={Users} title="Organization setup" hint="Employee directory: promote roles, activate / deactivate" />
        <QuickLink to="/admin/broadcast" icon={Megaphone} title="Broadcast" hint="Notify every user at once" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <Card className="flex items-center gap-3">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? 0}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

/** Tiny inline "bar chart" so the breakdown reads at a glance without a chart lib. */
function BreakdownBar({ data, keys }) {
  const total = keys.reduce((sum, k) => sum + (data[k] || 0), 0) || 1;
  const colors = {
    pending: 'bg-amber-400',
    approved: 'bg-emerald-500',
    accepted: 'bg-emerald-500',
    rejected: 'bg-red-400',
    cancelled: 'bg-slate-300',
    completed: 'bg-brand-500',
  };
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {keys.map((k) =>
          data[k] ? (
            <div
              key={k}
              className={colors[k] || 'bg-slate-300'}
              style={{ width: `${((data[k] || 0) / total) * 100}%` }}
              title={`${k}: ${data[k]}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${colors[k] || 'bg-slate-300'}`} />
            {k}: {data[k] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, hint }) {
  return (
    <Link to={to}>
      <Card className="h-full transition hover:shadow-md">
        <Icon className="mb-2 text-brand-600" size={22} />
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{hint}</p>
      </Card>
    </Link>
  );
}
