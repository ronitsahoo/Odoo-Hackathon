import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Shield } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';

/** Users table: ban/unban + role change. Admins can't ban themselves (server-guarded). */
export default function AdminUsers() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.data.users);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleBan(u) {
    try {
      const { data } = await api.patch(`/admin/users/${u._id}/ban`, { isBanned: !u.isBanned });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data.user : x)));
      toast.success(data.data.user.isBanned ? 'User banned' : 'User unbanned');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function toggleRole(u) {
    const role = u.role === 'admin' ? 'user' : 'admin';
    try {
      const { data } = await api.patch(`/admin/users/${u._id}/role`, { role });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data.user : x)));
      toast.success(`Role set to ${role}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (loading) return <Loader label="Loading users…" />;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Users size={24} /> Users
      </h1>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="inline-flex items-center gap-1">
                      {u.name}
                      {u.role === 'admin' && <Shield size={13} className="text-brand-600" />}
                      {u._id === me._id && <span className="text-xs text-slate-400">(you)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <Badge color="bg-red-100 text-red-700">banned</Badge>
                    ) : (
                      <Badge color="bg-emerald-100 text-emerald-700">active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleRole(u)} disabled={u._id === me._id}>
                        {u.role === 'admin' ? 'Make user' : 'Make admin'}
                      </Button>
                      <Button
                        size="sm"
                        variant={u.isBanned ? 'success' : 'danger'}
                        onClick={() => toggleBan(u)}
                        disabled={u._id === me._id}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
