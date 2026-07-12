import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, CalendarClock, Wrench, AlertCircle, Activity, ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { relativeTime } from '../utils/timeUtils.js';
import api, { apiError } from '../api/axios.js';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

/**
 * Dashboard (Screen 2) — role-aware. admin/asset_manager see org KPIs;
 * dept_head sees department-scoped KPIs; employee sees their assets + requests.
 * KPI cards link to the relevant filtered screens; the overdue banner drills down.
 */
export default function Dashboard() {
  const { user } = useAuthStore();
  const { summary, loading, fetchSummary } = useDashboardStore();
  const [showOverdue, setShowOverdue] = useState(false);
  const [bcOpen, setBcOpen] = useState(false);
  const [bcMsg, setBcMsg] = useState('');
  const [bcSending, setBcSending] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  async function sendBroadcast() {
    if (!bcMsg.trim()) return toast.error('Message is required');
    setBcSending(true);
    try {
      const { data } = await api.post('/admin/broadcast', { message: bcMsg });
      toast.success(`Sent to ${data.data.count} users`);
      setBcMsg('');
      setBcOpen(false);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBcSending(false);
    }
  }

  useSocket('asset:updated', () => fetchSummary());
  useSocket('asset:created', () => fetchSummary());
  useSocket('maintenance:created', () => fetchSummary());
  useSocket('maintenance:updated', () => fetchSummary());
  useSocket('booking:created', () => fetchSummary());
  useSocket('booking:updated', () => fetchSummary());
  useSocket('activity:new', () => fetchSummary());

  if (loading || !summary) return <Loader label="Loading dashboard..." />;

  const { counts, overdueReturns, recentActivity, mine = {}, self = {}, role } = summary;
  const isManager = role === 'admin' || role === 'asset_manager';
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-8">
      {/* Overdue banner + drill-down */}
      {overdueReturns.count > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <button className="flex w-full items-center gap-3" onClick={() => setShowOverdue((v) => !v)}>
            <AlertCircle size={24} className="shrink-0" />
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Overdue Returns</h3>
              <p className="text-sm">{overdueReturns.count} asset{overdueReturns.count > 1 ? 's' : ''} overdue for return — flagged for follow-up</p>
            </div>
            {showOverdue ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showOverdue && (
            <ul className="mt-3 space-y-1 border-t border-red-200 pt-3 text-sm">
              {overdueReturns.list.map((o) => (
                <li key={o._id} className="flex justify-between">
                  <span>{o.asset?.assetTag} — {o.asset?.name} · held by {o.holder?.name}</span>
                  <span className="font-medium">{o.daysOverdue}d overdue</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* KPI cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Today's Overview</h1>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setBcOpen(true)}>
              <Megaphone size={16} /> Broadcast
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi to="/assets?status=Available" title={isManager ? 'Available' : 'My Available'} value={counts.assetsAvailable} color="text-green-600" />
          <Kpi to="/assets?status=Allocated" title={isManager ? 'Allocated' : 'My Allocated'} value={counts.assetsAllocated} color="text-brand-600" />
          <Kpi to="/maintenance" title="Maintenance" value={counts.maintenanceToday} color="text-orange-600" />
          <Kpi to="/booking" title="Active Bookings" value={counts.activeBookings} color="text-slate-600" />
          <Kpi to="/allocation" title="Pending Transfers" value={counts.pendingTransfers} color="text-blue-600" />
          <Kpi to="#" title="Upcoming Returns" value={counts.upcomingReturns} color="text-purple-600" onClick={() => setShowOverdue(true)} />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          {isManager && <QuickAction to="/assets/register" icon={Plus} label="Register Asset" tint="bg-brand-100 text-brand-600" />}
          <QuickAction to="/booking" icon={CalendarClock} label="Book Resource" tint="bg-blue-100 text-blue-600" />
          <QuickAction to="/maintenance" icon={Wrench} label="Raise Request" tint="bg-orange-100 text-orange-600" />
        </div>
      </section>

      {/* Employee: My Assets + My Requests */}
      {role === 'employee' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="My Assets" empty="No assets allocated to you">
            {mine.assets?.map((a) => (
              <Link key={a._id} to={`/assets/${a._id}`} className="flex items-center justify-between py-2 text-sm hover:text-brand-600">
                <span><span className="font-mono text-xs text-slate-500">{a.assetTag}</span> {a.name}</span>
                <StatusBadge status={a.status} />
              </Link>
            ))}
          </Panel>
          <Panel title="My Requests" empty="You haven't raised any requests">
            {[...(mine.maintenanceRequests || []).map((r) => ({ ...r, kind: 'Maintenance' })),
              ...(mine.transferRequests || []).map((r) => ({ ...r, kind: 'Transfer' }))].map((r) => (
              <div key={r._id} className="flex items-center justify-between py-2 text-sm">
                <span>{r.kind}: {r.asset?.assetTag} {r.issue ? `— ${r.issue}` : ''}</span>
                <span className="text-xs text-slate-500">{r.status}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {/* Dept head: department assets */}
      {role === 'dept_head' && (
        <Panel title={`Department Assets${mine.pendingApprovals ? ` · ${mine.pendingApprovals} pending approval(s)` : ''}`} empty="No assets in your department">
          {mine.assets?.map((a) => (
            <Link key={a._id} to={`/assets/${a._id}`} className="flex items-center justify-between py-2 text-sm hover:text-brand-600">
              <span><span className="font-mono text-xs text-slate-500">{a.assetTag}</span> {a.name} {a.currentHolder ? `· ${a.currentHolder.name}` : ''}</span>
              <StatusBadge status={a.status} />
            </Link>
          ))}
        </Panel>
      )}

      {/* Managers/admins: their own assigned assets + self open requests */}
      {isManager && (
        <Panel title={`My Assets${self.openRequests ? ` · ${self.openRequests} open request(s)` : ''}`} empty="No assets assigned to you">
          {(self.assets || []).map((a) => (
            <Link key={a._id} to={`/assets/${a._id}`} className="flex items-center justify-between py-2 text-sm hover:text-brand-600">
              <span><span className="font-mono text-xs text-slate-500">{a.assetTag}</span> {a.name}</span>
              <StatusBadge status={a.status} />
            </Link>
          ))}
        </Panel>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Activity</h2>
        <Card className="min-h-[180px]">
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Activity size={40} className="mb-2 text-slate-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((log) => (
                <li key={log._id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600"><Activity size={14} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{log.summary}</p>
                      <p className="text-xs text-slate-500">by {log.actor}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{relativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Broadcast modal (admin) */}
      <Modal
        open={bcOpen}
        onClose={() => setBcOpen(false)}
        title="Broadcast to all users"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBcOpen(false)}>Cancel</Button>
            <Button onClick={sendBroadcast} loading={bcSending}><Megaphone size={16} /> Send</Button>
          </>
        }
      >
        <Textarea
          label="Announcement"
          value={bcMsg}
          onChange={(e) => setBcMsg(e.target.value)}
          placeholder="e.g. Scheduled maintenance tonight at 10pm."
        />
      </Modal>
    </div>
  );
}

function Kpi({ to, title, value, color, onClick }) {
  const inner = (
    <Card className="flex flex-col items-center justify-center p-4 text-center transition hover:shadow-md">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</span>
    </Card>
  );
  if (onClick) return <button onClick={onClick} className="text-left">{inner}</button>;
  return <Link to={to}>{inner}</Link>;
}

function QuickAction({ to, icon: Icon, label, tint }) {
  return (
    <Link to={to}>
      <Card className="flex cursor-pointer items-center gap-3 transition hover:bg-slate-50">
        <div className={`rounded-full p-2 ${tint}`}><Icon size={20} /></div>
        <span className="font-medium">{label}</span>
      </Card>
    </Link>
  );
}

function Panel({ title, children, empty }) {
  const hasChildren = Array.isArray(children) ? children.flat().filter(Boolean).length > 0 : !!children;
  return (
    <Card>
      <h2 className="mb-2 font-semibold text-slate-800">{title}</h2>
      {hasChildren ? <div className="divide-y divide-slate-100">{children}</div> : <p className="py-4 text-sm text-slate-400">{empty}</p>}
    </Card>
  );
}
