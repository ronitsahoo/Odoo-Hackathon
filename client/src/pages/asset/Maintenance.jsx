import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Plus, ArrowRight } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { input, label as labelCls } from '../../lib/ui.js';

// The five board columns, left → right. 'Rejected' is a dead-end, not a column.
const COLUMNS = [
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Technician Assigned', label: 'Technician assigned' },
  { key: 'In Progress', label: 'in progress' },
  { key: 'Resolved', label: 'Resolved' },
];

// The single legal "next" status for the advance (→) control.
const NEXT = {
  Approved: 'Technician Assigned',
  'Technician Assigned': 'In Progress',
  'In Progress': 'Resolved',
};

const PRIORITY_COLOR = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function Maintenance() {
  const { user } = useAuthStore();
  const canManage = ['asset_manager', 'admin'].includes(user?.role);
  const { requests, loading, fetchRequests, raise, setStatus, _upsert } = useMaintenanceStore();

  const [assets, setAssets] = useState([]);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ asset: '', issue: '', priority: 'medium' });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const [techModal, setTechModal] = useState({ open: false, id: null });
  const [techName, setTechName] = useState('');

  useEffect(() => {
    fetchRequests();
    api.get('/assets', { params: { limit: 100 } })
      .then(({ data }) => setAssets(data.data.assets))
      .catch(() => {});
  }, [fetchRequests]);

  // Live board updates.
  useSocket('maintenance:created', (mr) => _upsert(mr));
  useSocket('maintenance:updated', (mr) => _upsert(mr));

  const byColumn = useMemo(() => {
    const groups = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const r of requests) if (groups[r.status]) groups[r.status].push(r);
    return groups;
  }, [requests]);

  async function handleRaise(e) {
    e.preventDefault();
    if (!raiseForm.asset || !raiseForm.issue.trim()) return toast.error('Asset and issue are required');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('asset', raiseForm.asset);
      fd.append('issue', raiseForm.issue);
      fd.append('priority', raiseForm.priority);
      if (photo) fd.append('photo', photo);
      await raise(fd);
      toast.success('Request raised');
      setRaiseOpen(false);
      setRaiseForm({ asset: '', issue: '', priority: 'medium' });
      setPhoto(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function move(id, status, technician) {
    try {
      await setStatus(id, status, technician);
      toast.success(`Moved to ${status}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  function advance(r) {
    // Approved → Technician Assigned needs a technician name; ask first.
    if (r.status === 'Approved') {
      setTechName('');
      setTechModal({ open: true, id: r._id });
      return;
    }
    move(r._id, NEXT[r.status]);
  }

  const assetOptions = assets.map((a) => ({ value: a._id, label: `${a.assetTag} — ${a.name}` }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Wrench size={24} /> Maintenance
        </h1>
        <Button onClick={() => setRaiseOpen(true)}>
          <Plus size={16} /> Raise request
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        Approving a card moves the asset to <strong>Under Maintenance</strong>; resolving returns it to{' '}
        <strong>Available</strong>.
      </p>

      {loading && requests.length === 0 ? (
        <Loader label="Loading board…" />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {col.label}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {byColumn[col.key].length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {byColumn[col.key].map((r) => (
                  <MaintenanceCard
                    key={r._id}
                    request={r}
                    canManage={canManage}
                    onApprove={() => move(r._id, 'Approved')}
                    onReject={() => move(r._id, 'Rejected')}
                    onAdvance={() => advance(r)}
                  />
                ))}
                {byColumn[col.key].length === 0 && (
                  <p className="px-1 text-xs text-slate-300">No cards</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise request modal */}
      <Modal
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
        title="Raise Maintenance Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRaiseOpen(false)}>Cancel</Button>
            <Button onClick={handleRaise} loading={busy}>Raise</Button>
          </>
        }
      >
        <form onSubmit={handleRaise} className="space-y-4">
          <Select
            label="Asset"
            value={raiseForm.asset}
            onChange={(e) => setRaiseForm((f) => ({ ...f, asset: e.target.value }))}
            options={[{ value: '', label: 'Select an asset…' }, ...assetOptions]}
          />
          <Textarea
            label="Issue"
            rows={3}
            value={raiseForm.issue}
            onChange={(e) => setRaiseForm((f) => ({ ...f, issue: e.target.value }))}
            placeholder="Describe the problem…"
          />
          <Select
            label="Priority"
            value={raiseForm.priority}
            onChange={(e) => setRaiseForm((f) => ({ ...f, priority: e.target.value }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
          <div>
            <label className={labelCls}>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="text-sm text-slate-600"
            />
          </div>
        </form>
      </Modal>

      {/* Assign-technician modal (Approved → Technician Assigned) */}
      <Modal
        open={techModal.open}
        onClose={() => setTechModal({ open: false, id: null })}
        title="Assign Technician"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTechModal({ open: false, id: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                move(techModal.id, 'Technician Assigned', techName);
                setTechModal({ open: false, id: null });
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <div>
          <label className={labelCls}>Technician</label>
          <input
            className={input}
            placeholder="e.g. R Varma"
            value={techName}
            onChange={(e) => setTechName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function MaintenanceCard({ request: r, canManage, onApprove, onReject, onAdvance }) {
  const resolved = r.status === 'Resolved';
  return (
    <div
      className={`rounded-lg border p-3 shadow-sm ${
        resolved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">
          {r.asset?.assetTag || '—'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_COLOR[r.priority]}`}>
          {r.priority}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-800">{r.issue}</p>
      {r.technicianName && <p className="mt-1 text-xs text-slate-500">tech: {r.technicianName}</p>}

      {canManage && !resolved && (
        <div className="mt-3 flex gap-2">
          {r.status === 'Pending' ? (
            <>
              <Button size="sm" onClick={onApprove}>Approve</Button>
              <Button size="sm" variant="danger" onClick={onReject}>Reject</Button>
            </>
          ) : (
            NEXT[r.status] && (
              <Button size="sm" variant="secondary" onClick={onAdvance}>
                {NEXT[r.status]} <ArrowRight size={14} />
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
