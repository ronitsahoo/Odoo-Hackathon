import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarClock, Wrench, AlertCircle, Activity } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { relativeTime } from '../utils/timeUtils.js';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';

/**
 * Dashboard (Screen 2, Module 6) — AssetFlow post-login landing page.
 * Shows 6 KPI cards, overdue banner, quick actions, and recent activity feed.
 * Updates live via socket events.
 */
export default function Dashboard() {
  const { summary, loading, fetchSummary, updateKPI, prependActivity } = useDashboardStore();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Subscribe to real-time updates (asset/allocation/maintenance events)
  useSocket('asset:created', () => updateKPI('assetsAvailable', 1));
  useSocket('asset:updated', (asset) => {
    // Recalculate KPI deltas based on status change (simplified)
    fetchSummary();
  });
  useSocket('maintenance:created', () => fetchSummary());
  useSocket('maintenance:updated', () => fetchSummary());
  useSocket('booking:created', () => fetchSummary());
  useSocket('booking:updated', () => fetchSummary());
  useSocket('activity:new', () => fetchSummary());

  if (loading || !summary) {
    return <Loader label="Loading dashboard..." />;
  }

  const { counts, overdueReturns, recentActivity } = summary;

  return (
    <div className="space-y-8">
      {/* Overdue Banner */}
      {overdueReturns.count > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={24} className="shrink-0" />
          <div>
            <h3 className="font-semibold">Overdue Returns</h3>
            <p className="text-sm">
              {overdueReturns.count} asset{overdueReturns.count > 1 ? 's' : ''} overdue for return
              — flagged for follow-up
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <section>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Today's Overview</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Available" value={counts.assetsAvailable} color="text-green-600" />
          <KpiCard title="Allocated" value={counts.assetsAllocated} color="text-brand-600" />
          <KpiCard title="Maintenance" value={counts.maintenanceToday} color="text-orange-600" />
          <KpiCard title="Active Bookings" value={counts.activeBookings} color="text-slate-600" />
          <KpiCard title="Pending Transfers" value={counts.pendingTransfers} color="text-blue-600" />
          <KpiCard title="Upcoming Returns" value={counts.upcomingReturns} color="text-purple-600" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quick Actions */}
        <section className="lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link to="/assets/register">
              <Card className="flex cursor-pointer items-center gap-3 transition hover:bg-slate-50">
                <div className="rounded-full bg-brand-100 p-2 text-brand-600">
                  <Plus size={20} />
                </div>
                <span className="font-medium">Register Asset</span>
              </Card>
            </Link>
            <Link to="/booking">
              <Card className="flex cursor-pointer items-center gap-3 transition hover:bg-slate-50">
                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                  <CalendarClock size={20} />
                </div>
                <span className="font-medium">Book Resource</span>
              </Card>
            </Link>
            <Link to="/maintenance">
              <Card className="flex cursor-pointer items-center gap-3 transition hover:bg-slate-50">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                  <Wrench size={20} />
                </div>
                <span className="font-medium">Raise Request</span>
              </Card>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Activity</h2>
          <Card className="min-h-[250px]">
            {recentActivity.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-slate-500">
                <Activity size={48} className="mb-2 text-slate-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((log) => (
                  <li key={log._id} className="flex items-start justify-between gap-3 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600">
                        <Activity size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{log.summary}</p>
                        <p className="text-xs text-slate-500">by {log.actor}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {relativeTime(log.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <Card className="flex flex-col items-center justify-center p-4 text-center">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </span>
    </Card>
  );
}
