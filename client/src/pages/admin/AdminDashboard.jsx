import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Ban, Megaphone } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Loader from '../../components/ui/Loader.jsx';

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

  if (loading) return <Loader label="Loading stats…" />;
  if (!stats) return <Card>Couldn't load stats.</Card>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Users" value={stats.users} tint="bg-brand-50 text-brand-600" />
        <Stat icon={Ban} label="Banned" value={stats.banned} tint="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
