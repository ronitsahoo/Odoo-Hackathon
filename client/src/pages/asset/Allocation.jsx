import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftRight, AlertTriangle, Clock } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useAllocationStore } from '../../store/allocationStore.js';
import { useTransferStore } from '../../store/transferStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { input, label as labelCls } from '../../lib/ui.js';

const MANAGE_ROLES = ['asset_manager', 'dept_head', 'admin'];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '—');

/**
 * Allocation & Transfer. Asset-centric:
 * pick an asset → if Available, allocate; if Allocated, see the red conflict
 * banner + submit a transfer request. Managers can return and approve/reject.
 */
export default function Allocation() {
  const { user } = useAuthStore();
  const canManage = MANAGE_ROLES.includes(user?.role);

  const { allocate, returnAsset, fetchHistory, fetchOverdue, history, overdue } =
    useAllocationStore();
  const { submitTransfer, approve, reject, fetchTransfers, transfers } = useTransferStore();

  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [assetFilter, setAssetFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [asset, setAsset] = useState(null);
  const [conflict, setConflict] = useState('');

  const [allocForm, setAllocForm] = useState({ holder: '', expectedReturnDate: '' });
  const [xferForm, setXferForm] = useState({ toRequester: '', reason: '' });
  const [returnModal, setReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({ checkInCondition: '', checkInNotes: '' });
  const [busy, setBusy] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  // The current user's own transfer requests (raised + received) for the history panel.
  function loadMyRequests() {
    api.get('/transfers', { params: { mine: 'true' } })
      .then(({ data }) => setMyRequests(data.data.transfers))
      .catch(() => {});
  }

  // --- initial loads ---
  useEffect(() => {
    api.get('/assets', { params: { limit: 100 } })
      .then(({ data }) => setAssets(data.data.assets))
      .catch((e) => toast.error(apiError(e)));
    api.get('/users/list')
      .then(({ data }) => setUsers(data.data.users))
      .catch(() => {});
    fetchOverdue();
    loadMyRequests();
    if (canManage) fetchTransfers('Requested');
  }, [canManage, fetchOverdue, fetchTransfers]);

  // --- load the selected asset + its history ---
  async function loadAsset(id) {
    if (!id) {
      setAsset(null);
      return;
    }
    try {
      const { data } = await api.get(`/assets/${id}`);
      setAsset(data.data.asset);
      setConflict('');
      fetchHistory(id);
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  function onSelect(id) {
    setSelectedId(id);
    setAllocForm({ holder: '', expectedReturnDate: '' });
    setXferForm({ toRequester: '', reason: '' });
    loadAsset(id);
  }

  // Live refresh when the selected asset changes anywhere.
  useSocket('asset:updated', (a) => {
    if (a?._id === selectedId) loadAsset(selectedId);
    setAssets((prev) => prev.map((x) => (x._id === a._id ? { ...x, ...a } : x)));
  }, [selectedId]);

  // --- actions ---
  async function handleAllocate(e) {
    e.preventDefault();
    if (!allocForm.holder) return toast.error('Pick a holder');
    setBusy(true);
    try {
      await allocate({
        asset: selectedId,
        holder: allocForm.holder,
        expectedReturnDate: allocForm.expectedReturnDate || null,
      });
      toast.success('Asset allocated');
      loadAsset(selectedId);
    } catch (err) {
      // 409 => surface as the red conflict banner, not a toast.
      if (err.response?.status === 409) {
        setConflict(apiError(err));
        loadAsset(selectedId); // it's now Allocated — refresh to show the banner + transfer form
      } else {
        toast.error(apiError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!xferForm.toRequester) return toast.error('Pick who to transfer to');
    setBusy(true);
    try {
      await submitTransfer({ asset: selectedId, toRequester: xferForm.toRequester, reason: xferForm.reason });
      toast.success('Transfer request submitted');
      setXferForm({ toRequester: '', reason: '' });
      loadMyRequests();
      if (canManage) fetchTransfers('Requested');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await returnAsset(selectedId, returnForm);
      toast.success('Asset returned — now Available');
      setReturnModal(false);
      setReturnForm({ checkInCondition: '', checkInNotes: '' });
      loadAsset(selectedId);
      fetchOverdue();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(id) {
    try {
      await approve(id);
      toast.success('Transfer approved — asset reassigned');
      loadAsset(selectedId);
    } catch (err) {
      toast.error(apiError(err));
    }
  }
  async function handleReject(id) {
    try {
      await reject(id);
      toast.success('Transfer rejected');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  // --- derived ---
  const assetOptions = useMemo(() => {
    const q = assetFilter.trim().toLowerCase();
    return assets
      .filter((a) => !q || `${a.assetTag} ${a.name}`.toLowerCase().includes(q))
      .map((a) => ({ value: a._id, label: `${a.assetTag} — ${a.name} (${a.status})` }));
  }, [assets, assetFilter]);

  const userOptions = users.map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }));
  const holderName = asset?.currentHolder?.name || '—';
  const holderDept = asset?.department?.name || 'no dept';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <ArrowLeftRight size={24} /> Allocation &amp; Transfer
      </h1>

      {/* Overdue summary */}
      {overdue.length > 0 && (
        <Card className="flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-800">
          <Clock size={18} />
          <span className="text-sm">
            {overdue.length} allocation{overdue.length > 1 ? 's are' : ' is'} overdue
            {overdue[0]?.asset ? ` (e.g. ${overdue[0].asset.assetTag} — held by ${overdue[0].holder?.name})` : ''}.
          </span>
        </Card>
      )}

      {/* Asset picker */}
      <Card className="space-y-3">
        <div>
          <label className={labelCls}>Asset</label>
          <input
            className={`${input} mb-2`}
            placeholder="Search by tag or name…"
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
          />
          <Select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            options={[{ value: '', label: 'Select an asset…' }, ...assetOptions]}
          />
        </div>
        {asset && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="font-mono font-medium">{asset.assetTag}</span>
            <StatusBadge status={asset.status} />
            {asset.currentHolder && <span>Held by {holderName} · {holderDept}</span>}
          </div>
        )}
      </Card>

      {/* --- Available: allocate --- */}
      {asset && asset.status === 'Available' && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-800">Allocate asset</h2>
          {canManage ? (
            <form onSubmit={handleAllocate} className="space-y-4">
              <Select
                label="Allocate to (employee)"
                value={allocForm.holder}
                onChange={(e) => setAllocForm((f) => ({ ...f, holder: e.target.value }))}
                options={[{ value: '', label: 'Select employee…' }, ...userOptions]}
              />
              <div>
                <label className={labelCls}>Expected Return Date (optional)</label>
                <input
                  type="date"
                  className={input}
                  value={allocForm.expectedReturnDate}
                  onChange={(e) => setAllocForm((f) => ({ ...f, expectedReturnDate: e.target.value }))}
                />
              </div>
              <Button type="submit" loading={busy}>Allocate</Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Only asset managers or department heads can allocate.</p>
          )}
        </Card>
      )}

      {/* --- Allocated: conflict banner + transfer request --- */}
      {asset && asset.status === 'Allocated' && (
        <>
          <Card className="flex items-start gap-3 border-red-200 bg-red-50 text-red-800">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">
                {conflict || `Already allocated to ${holderName} (${holderDept}).`}
              </p>
              <p>Direct re-allocation is blocked — submit a transfer request below.</p>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold text-slate-800">Transfer Request</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className={labelCls}>From (current holder)</label>
                <input className={`${input} bg-slate-50`} value={holderName} readOnly />
              </div>
              <Select
                label="To"
                value={xferForm.toRequester}
                onChange={(e) => setXferForm((f) => ({ ...f, toRequester: e.target.value }))}
                options={[
                  { value: '', label: 'Select Employee…' },
                  ...userOptions.filter((o) => o.value !== asset.currentHolder?._id),
                ]}
              />
              <Textarea
                label="Reason"
                rows={3}
                value={xferForm.reason}
                onChange={(e) => setXferForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Why should this asset be transferred?"
              />
              <div className="flex gap-2">
                <Button type="submit" loading={busy}>Submit Request</Button>
                {canManage && (
                  <Button type="button" variant="secondary" onClick={() => setReturnModal(true)}>
                    Mark Returned
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </>
      )}

      {/* Other lifecycle states */}
      {asset && !['Available', 'Allocated'].includes(asset.status) && (
        <Card>
          <p className="text-sm text-slate-500">
            This asset is <strong>{asset.status}</strong> and can't be allocated or transferred right now.
          </p>
        </Card>
      )}

      {/* Pending transfer approvals (managers) */}
      {canManage && transfers.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold text-slate-800">Pending transfer requests</h2>
          <div className="divide-y divide-slate-100">
            {transfers.map((t) => (
              <div key={t._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">
                    {t.asset?.assetTag} — {t.asset?.name}
                  </p>
                  <p className="text-slate-500">
                    {t.fromHolder?.name} → {t.toRequester?.name}
                    {t.reason ? ` · ${t.reason}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => handleApprove(t._id)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(t._id)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Request History — the current user's own transfer requests (raised/received) */}
      <Card className="space-y-3">
        <h2 className="font-semibold text-slate-800">Request History</h2>
        {myRequests.length === 0 ? (
          <p className="text-sm text-slate-500">You haven't raised or received any transfer requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {myRequests.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 text-slate-700">
                  <span className="font-mono text-xs text-slate-500">{t.asset?.assetTag}</span>{' '}
                  {t.asset?.name} · {t.fromHolder?.name} → {t.toRequester?.name}
                  {t.reason ? ` · ${t.reason}` : ''}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.status === 'Reallocated' ? 'bg-emerald-100 text-emerald-700'
                    : t.status === 'Rejected' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Allocation history for the selected asset */}
      {asset && (
        <Card className="space-y-3">
          <h2 className="font-semibold text-slate-800">Allocation history</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No allocation history yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium">{fmtDate(h.allocatedDate)}</span>
                    {' — '}
                    {h.status === 'returned' ? (
                      <>Returned by {h.holder?.name}{h.checkInCondition ? ` — condition: ${h.checkInCondition}` : ''}</>
                    ) : (
                      <>Allocated to {h.holder?.name}{h.holderDept?.name ? ` — ${h.holderDept.name}` : ''}</>
                    )}
                  </span>
                  {h.isOverdue && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Overdue
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Return modal */}
      <Modal
        open={returnModal}
        onClose={() => setReturnModal(false)}
        title="Return Asset"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnModal(false)}>Cancel</Button>
            <Button onClick={handleReturn} loading={busy}>Confirm Return</Button>
          </>
        }
      >
        <form onSubmit={handleReturn} className="space-y-4">
          <div>
            <label className={labelCls}>Check-in Condition</label>
            <input
              className={input}
              placeholder="e.g. good, damaged"
              value={returnForm.checkInCondition}
              onChange={(e) => setReturnForm((f) => ({ ...f, checkInCondition: e.target.value }))}
            />
          </div>
          <Textarea
            label="Notes"
            rows={3}
            value={returnForm.checkInNotes}
            onChange={(e) => setReturnForm((f) => ({ ...f, checkInNotes: e.target.value }))}
            placeholder="Any notes on the returned asset…"
          />
        </form>
      </Modal>
    </div>
  );
}
