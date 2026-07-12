import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, AlertTriangle, Plus } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useAuditStore } from '../../store/auditStore.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { input, label as labelCls } from '../../lib/ui.js';

const MARK_COLOR = {
  Pending: 'bg-slate-100 text-slate-600',
  Verified: 'bg-emerald-100 text-emerald-700',
  Missing: 'bg-red-100 text-red-700',
  Damaged: 'bg-amber-100 text-amber-700',
};

/** Audit: pick/create a cycle, mark items, view discrepancies, close. */
export default function Audit() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { cycles, current, loading, fetchCycles, fetchCycle, createCycle, markItem, closeCycle } = useAuditStore();

  const [selectedId, setSelectedId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ title: '', department: '', auditors: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCycles();
    api.get('/departments').then(({ data }) => setDepartments(data.data.departments)).catch(() => {});
    api.get('/users/list').then(({ data }) => setUsers(data.data.users)).catch(() => {});
  }, [fetchCycles]);

  useEffect(() => {
    if (selectedId) fetchCycle(selectedId);
  }, [selectedId, fetchCycle]);

  // Default to the first cycle when the list loads.
  useEffect(() => {
    if (!selectedId && cycles[0]) setSelectedId(cycles[0]._id);
  }, [cycles, selectedId]);

  const canMark = current && (isAdmin || current.auditors?.some((a) => a._id === user?._id));
  const discrepancies = (current?.items || []).filter((i) => ['Missing', 'Damaged'].includes(i.mark));

  async function handleMark(assetId, mark) {
    try {
      await markItem(current._id, assetId, mark, '');
      toast.success(`Marked ${mark}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function handleClose() {
    try {
      const { flaggedCount } = await closeCycle(current._id);
      toast.success(`Cycle closed — ${flaggedCount} discrepancy${flaggedCount === 1 ? '' : 'ies'} applied`);
      fetchCycles();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.department) return toast.error('Title and department are required');
    setBusy(true);
    try {
      const cycle = await createCycle({ title: form.title, scopeType: 'department', department: form.department, auditors: form.auditors });
      toast.success('Audit cycle created');
      setCreateOpen(false);
      setForm({ title: '', department: '', auditors: [] });
      setSelectedId(cycle._id);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ClipboardList size={24} /> Audit
        </h1>
        <div className="flex items-center gap-2">
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            options={[{ value: '', label: 'Select a cycle…' }, ...cycles.map((c) => ({ value: c._id, label: `${c.title} (${c.status})` }))]} />
          {isAdmin && <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New cycle</Button>}
        </div>
      </div>

      {loading && !current ? (
        <Loader label="Loading audit…" />
      ) : !current ? (
        <Card><p className="text-sm text-slate-500">Select or create an audit cycle.</p></Card>
      ) : (
        <>
          {/* Scope banner */}
          <Card className="bg-slate-50">
            <h2 className="font-semibold text-slate-800">{current.title}</h2>
            <p className="text-sm text-slate-600">
              Scope: {current.department?.name || current.location || '—'} ·{' '}
              {current.startDate ? new Date(current.startDate).toLocaleDateString() : '—'}
              {current.endDate ? ` – ${new Date(current.endDate).toLocaleDateString()}` : ''} ·{' '}
              Auditors: {current.auditors?.map((a) => a.name).join(', ') || '—'} ·{' '}
              <span className={`font-medium ${current.status === 'Open' ? 'text-emerald-600' : 'text-slate-500'}`}>{current.status}</span>
            </p>
          </Card>

          {/* Discrepancy banner */}
          {discrepancies.length > 0 && (
            <Card className="flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle size={18} />
              <span className="text-sm">
                {discrepancies.length} asset{discrepancies.length > 1 ? 's' : ''} flagged — discrepancy report generated automatically.
              </span>
            </Card>
          )}

          {/* Checklist */}
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Expected location</th>
                    <th className="px-4 py-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {current.items.map((it) => (
                    <tr key={it.asset?._id || it.asset} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {it.asset?.assetTag} — {it.asset?.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{it.expectedLocation || '—'}</td>
                      <td className="px-4 py-3">
                        {current.status === 'Open' && canMark ? (
                          <select className={`${input} w-40`} value={it.mark} onChange={(e) => handleMark(it.asset._id, e.target.value)}>
                            {['Pending', 'Verified', 'Missing', 'Damaged'].map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${MARK_COLOR[it.mark]}`}>{it.mark}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {current.items.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No assets in scope.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {isAdmin && current.status === 'Open' && (
            <Button variant="danger" onClick={handleClose}>Close audit cycle</Button>
          )}
        </>
      )}

      {/* Create cycle modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Audit Cycle"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} loading={busy}>Create</Button></>}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input className={input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Q3 Audit — Engineering" />
          </div>
          <Select label="Department (scope)" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            options={[{ value: '', label: 'Select department…' }, ...departments.map((d) => ({ value: d._id, label: d.name }))]} />
          <div>
            <label className={labelCls}>Auditors</label>
            <select multiple className={`${input} h-28`} value={form.auditors}
              onChange={(e) => setForm((f) => ({ ...f, auditors: [...e.target.selectedOptions].map((o) => o.value) }))}>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-400">Ctrl/Cmd-click to select multiple.</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
