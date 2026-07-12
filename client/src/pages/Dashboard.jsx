import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ArrowLeftRight, Wrench, AlertCircle, Plus, CalendarClock } from 'lucide-react';
import api from '../api/axios.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    available: 0,
    allocated: 0,
    maintenance: 0,
    activeBookings: 0, // Placeholder
    pendingTransfers: 0,
    upcomingReturns: 0,
  });
  const [overdueAllocations, setOverdueAllocations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch data concurrently where possible
        const [
          { data: assetsRes },
          { data: allocationsRes },
          { data: maintenanceRes },
          { data: transfersRes }
        ] = await Promise.all([
          api.get('/assets'),
          api.get('/allocations'),
          api.get('/maintenance'),
          api.get('/transfers')
        ]);

        const assets = assetsRes.data.assets || [];
        const allocations = allocationsRes.data.allocations || [];
        const maintenanceReqs = maintenanceRes.data.requests || [];
        const transfers = transfersRes.data.transfers || [];

        // Compute KPIs
        const available = assets.filter(a => a.status === 'Available').length;
        const allocated = assets.filter(a => a.status === 'Allocated').length;
        const maintenance = assets.filter(a => a.status === 'Under Maintenance').length;
        
        const pendingTransfers = transfers.filter(t => t.status === 'Pending').length;
        
        const now = new Date();
        const activeAllocations = allocations.filter(a => a.status === 'active');
        const upcomingReturns = activeAllocations.filter(a => {
          if (!a.expectedReturnDate) return false;
          const returnDate = new Date(a.expectedReturnDate);
          return returnDate > now && (returnDate - now) < 7 * 24 * 60 * 60 * 1000; // Next 7 days
        }).length;

        const overdue = activeAllocations.filter(a => {
          if (!a.expectedReturnDate) return false;
          return new Date(a.expectedReturnDate) < now;
        });

        setStats({
          available,
          allocated,
          maintenance,
          activeBookings: 0, // Bookings not yet built
          pendingTransfers,
          upcomingReturns,
        });

        setOverdueAllocations(overdue);

        // Build a mock recent activity list from allocations and maintenance
        const activity = [];
        allocations.slice(0, 3).forEach(a => {
          activity.push({
            id: `alloc-${a._id}`,
            title: `Asset Allocated: ${a.asset?.name}`,
            date: new Date(a.allocatedDate || a.createdAt),
            type: 'allocation'
          });
        });
        maintenanceReqs.slice(0, 3).forEach(m => {
          activity.push({
            id: `maint-${m._id}`,
            title: `Maintenance Logged: ${m.asset?.name}`,
            date: new Date(m.createdAt),
            type: 'maintenance'
          });
        });
        
        activity.sort((a, b) => b.date - a.date);
        setRecentActivity(activity.slice(0, 5));

      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Loader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Overdue Banner */}
      {overdueAllocations.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
          <AlertCircle size={24} className="shrink-0" />
          <div>
            <h3 className="font-bold">Overdue Returns</h3>
            <p className="text-sm">You have {overdueAllocations.length} asset(s) that are past their expected return date.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <section>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Today's Overview</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Available" value={stats.available} color="text-green-600" />
          <KpiCard title="Allocated" value={stats.allocated} color="text-brand-600" />
          <KpiCard title="Maintenance" value={stats.maintenance} color="text-orange-600" />
          <KpiCard title="Active Bookings" value={stats.activeBookings} color="text-slate-600" />
          <KpiCard title="Pending Transfers" value={stats.pendingTransfers} color="text-blue-600" />
          <KpiCard title="Upcoming Returns" value={stats.upcomingReturns} color="text-purple-600" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quick Actions */}
        <section className="lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link to="/assets/register">
              <Card className="flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer">
                <div className="rounded-full bg-brand-100 p-2 text-brand-600">
                  <Plus size={20} />
                </div>
                <span className="font-medium">Register Asset</span>
              </Card>
            </Link>
            <Link to="/booking">
              <Card className="flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer">
                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                  <CalendarClock size={20} />
                </div>
                <span className="font-medium">Book Resource</span>
              </Card>
            </Link>
            <Link to="/maintenance">
              <Card className="flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer">
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
              <div className="flex h-full flex-col items-center justify-center text-slate-500 py-10">
                <p>No recent activity found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((act) => (
                  <li key={act.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                        {act.type === 'allocation' ? <ArrowLeftRight size={16} /> : <Wrench size={16} />}
                      </div>
                      <span className="font-medium text-slate-800">{act.title}</span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {act.date.toLocaleDateString()}
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
