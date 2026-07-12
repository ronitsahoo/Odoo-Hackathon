import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, X, Pencil } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useBookingStore } from '../../store/bookingStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { input, label as labelCls } from '../../lib/ui.js';

const DAY_START = 9;
const DAY_END = 18;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Block colors by derived display status.
const STATUS_STYLE = {
  Upcoming: 'border-blue-300 bg-blue-100 text-blue-800',
  Ongoing: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  Completed: 'border-slate-300 bg-slate-100 text-slate-500',
  Cancelled: 'border-red-200 bg-red-50 text-red-400 line-through',
};

/**
 * Resource Booking: pick a bookable resource + date, see the day's
 * bookings on an hour rail, book/reschedule/cancel slots. Overlaps surface
 * inline (409). A status legend/filter distinguishes Upcoming/Ongoing/etc.
 */
export default function Booking() {
  const { user } = useAuthStore();
  const { bookings, fetchBookings, createBooking, cancelBooking, rescheduleBooking } = useBookingStore();

  const [resources, setResources] = useState([]);
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ start: '', end: '', purpose: '' });
  const [conflict, setConflict] = useState('');
  const [busy, setBusy] = useState(false);
  const [reModal, setReModal] = useState({ open: false, booking: null, start: '', end: '' });
  const [deptName, setDeptName] = useState('');

  useEffect(() => {
    api.get('/assets', { params: { limit: 100 } })
      .then(({ data }) => {
        const bookable = data.data.assets.filter((a) => a.isBookable);
        setResources(bookable);
        if (bookable[0]) setResourceId(bookable[0]._id);
      })
      .catch((e) => toast.error(apiError(e)));
    // Dept heads book on behalf of their department — resolve their dept name to prefill purpose.
    if (user?.role === 'dept_head' && user?.department) {
      api.get('/departments').then(({ data }) => {
        const d = data.data.departments.find((x) => x._id === user.department);
        if (d) { setDeptName(d.name); setForm((f) => ({ ...f, purpose: `${d.name} (dept)` })); }
      }).catch(() => {});
    }
  }, [user?.role, user?.department]);

  useEffect(() => {
    if (resourceId) fetchBookings({ resource: resourceId, date });
    setConflict('');
  }, [resourceId, date, fetchBookings]);

  useSocket('booking:created', () => resourceId && fetchBookings({ resource: resourceId, date }), [resourceId, date]);
  useSocket('booking:updated', () => resourceId && fetchBookings({ resource: resourceId, date }), [resourceId, date]);

  const resource = resources.find((r) => r._id === resourceId);
  const canManage = ['asset_manager', 'admin'].includes(user?.role);

  const dayBlocks = useMemo(() => {
    const span = DAY_END - DAY_START;
    return bookings
      .filter((b) => (statusFilter ? b.displayStatus === statusFilter : b.status !== 'Cancelled'))
      .map((b) => {
        const s = new Date(b.startTime);
        const e = new Date(b.endTime);
        const startH = s.getHours() + s.getMinutes() / 60;
        const endH = e.getHours() + e.getMinutes() / 60;
        // Clamp the slot to the visible [DAY_START, DAY_END] window so a block
        // can never extend past the rail bounds.
        const vStart = Math.max(DAY_START, Math.min(DAY_END, startH));
        const vEnd = Math.max(DAY_START, Math.min(DAY_END, endH));
        const top = ((vStart - DAY_START) / span) * 100;
        const rawH = ((vEnd - vStart) / span) * 100;
        const height = Math.min(100 - top, Math.max(4, rawH));
        return { b, top, height };
      })
      .filter((x) => x.height > 0); // drop slots entirely outside the window
  }, [bookings, statusFilter]);

  function toDate(hhmm) {
    const d = new Date(date + 'T' + hhmm);
    return isNaN(d) ? null : d;
  }

  async function handleBook(e) {
    e.preventDefault();
    setConflict('');
    const start = toDate(form.start);
    const end = toDate(form.end);
    if (!start || !end) return toast.error('Pick a start and end time');
    if (start >= end) return toast.error('End must be after start');
    setBusy(true);
    try {
      await createBooking({ resource: resourceId, startTime: start.toISOString(), endTime: end.toISOString(), purpose: form.purpose });
      toast.success('Booking confirmed');
      setForm((f) => ({ ...f, start: '', end: '' }));
    } catch (err) {
      if (err.response?.status === 409) setConflict(`Requested ${form.start}–${form.end} — conflict — slot unavailable`);
      else toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(id) {
    try { await cancelBooking(id); toast.success('Booking cancelled'); }
    catch (err) { toast.error(apiError(err)); }
  }

  function openReschedule(b) {
    setReModal({ open: true, booking: b, start: new Date(b.startTime).toTimeString().slice(0, 5), end: new Date(b.endTime).toTimeString().slice(0, 5) });
  }
  async function submitReschedule() {
    const s = toDate(reModal.start);
    const e = toDate(reModal.end);
    if (!s || !e || s >= e) return toast.error('Invalid times');
    try {
      await rescheduleBooking(reModal.booking._id, { startTime: s.toISOString(), endTime: e.toISOString() });
      toast.success('Booking rescheduled');
      setReModal({ open: false, booking: null, start: '', end: '' });
    } catch (err) {
      if (err.response?.status === 409) toast.error('Reschedule conflicts with another booking');
      else toast.error(apiError(err));
    }
  }

  const headerDate = new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <CalendarClock size={24} /> Resource Booking
      </h1>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select label="Resource" value={resourceId} onChange={(e) => setResourceId(e.target.value)}
            options={resources.length ? resources.map((r) => ({ value: r._id, label: `${r.assetTag} — ${r.name}` })) : [{ value: '', label: 'No bookable resources' }]} />
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All (active)' }, ...['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map((s) => ({ value: s, label: s }))]} />
        </div>
      </Card>

      {resource && <p className="text-sm font-medium text-slate-600">{resource.name} — {headerDate}</p>}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        {Object.keys(STATUS_STYLE).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm border ${STATUS_STYLE[s].split(' ').filter((c) => c.startsWith('bg-') || c.startsWith('border-')).join(' ')}`} />
            {s}
          </span>
        ))}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[1fr_300px]">
        {/* Hour rail */}
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">Day timeline</h2>
          <div className="relative flex">
            <div className="w-14 shrink-0">
              {HOURS.map((h) => <div key={h} className="h-12 text-xs text-slate-400">{h}:00</div>)}
            </div>
            <div className="relative flex-1 border-l border-slate-200" style={{ height: `${HOURS.length * 3}rem` }}>
              {HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 border-t border-dashed border-slate-100" style={{ top: `${(i / (DAY_END - DAY_START)) * 100}%` }} />
              ))}
              {dayBlocks.map(({ b, top, height }) => (
                <div key={b._id} className={`absolute left-1 right-1 overflow-hidden rounded-md border p-1 text-xs ${STATUS_STYLE[b.displayStatus] || STATUS_STYLE.Upcoming}`}
                  style={{ top: `${top}%`, height: `${height}%` }}>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium">{b.purpose || b.bookedBy?.name}</span>
                    {(b.bookedBy?._id === user?._id || canManage) && b.status !== 'Cancelled' && (
                      <span className="flex gap-1">
                        <button onClick={() => openReschedule(b)} title="Reschedule"><Pencil size={11} /></button>
                        <button onClick={() => handleCancel(b._id)} title="Cancel"><X size={12} /></button>
                      </span>
                    )}
                  </div>
                  <div>{fmt(b.startTime)}–{fmt(b.endTime)} · {b.displayStatus}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Book a slot — compact, sized to its content */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Book a slot</h2>
          <form onSubmit={handleBook} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Start</label><input type="time" className={input} value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></div>
              <div><label className={labelCls}>End</label><input type="time" className={input} value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></div>
            </div>
            <div>
              <label className={labelCls}>Purpose {deptName && <span className="text-xs text-slate-400">(booking for {deptName})</span>}</label>
              <input className={input} placeholder="e.g. Procurement Team" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
            </div>
            {conflict && <div className="rounded-md border border-dashed border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">{conflict}</div>}
            <Button type="submit" loading={busy} disabled={!resourceId}>Book slot</Button>
          </form>
        </Card>
      </div>

      {/* Reschedule modal */}
      <Modal open={reModal.open} onClose={() => setReModal({ open: false, booking: null, start: '', end: '' })} title="Reschedule booking"
        footer={<><Button variant="secondary" onClick={() => setReModal({ open: false, booking: null, start: '', end: '' })}>Cancel</Button><Button onClick={submitReschedule}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Start</label><input type="time" className={input} value={reModal.start} onChange={(e) => setReModal((m) => ({ ...m, start: e.target.value }))} /></div>
          <div><label className={labelCls}>End</label><input type="time" className={input} value={reModal.end} onChange={(e) => setReModal((m) => ({ ...m, end: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}
