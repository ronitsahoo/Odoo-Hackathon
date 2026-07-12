import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, X } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { useBookingStore } from '../../store/bookingStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { input, label as labelCls } from '../../lib/ui.js';

const DAY_START = 9; // 9:00
const DAY_END = 18; // 18:00
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Resource Booking (Screen 6): pick a bookable resource + date, see the day's
 * bookings on an hour rail, and book a slot. Overlaps surface inline (409),
 * not as a toast. Live via booking:* sockets.
 */
export default function Booking() {
  const { user } = useAuthStore();
  const { bookings, fetchBookings, createBooking, cancelBooking, _upsert } = useBookingStore();

  const [resources, setResources] = useState([]);
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [form, setForm] = useState({ start: '', end: '', purpose: '' });
  const [conflict, setConflict] = useState('');
  const [busy, setBusy] = useState(false);

  // Load bookable resources once.
  useEffect(() => {
    api.get('/assets', { params: { limit: 100 } })
      .then(({ data }) => {
        const bookable = data.data.assets.filter((a) => a.isBookable);
        setResources(bookable);
        if (bookable[0]) setResourceId(bookable[0]._id);
      })
      .catch((e) => toast.error(apiError(e)));
  }, []);

  // Refetch the rail when resource/date changes.
  useEffect(() => {
    if (resourceId) fetchBookings({ resource: resourceId, date });
    setConflict('');
  }, [resourceId, date, fetchBookings]);

  // Live updates: refetch when a booking for the current resource changes.
  useSocket('booking:created', (b) => {
    if (b.resource?._id === resourceId || b.resource === resourceId) fetchBookings({ resource: resourceId, date });
  }, [resourceId, date]);
  useSocket('booking:updated', () => fetchBookings({ resource: resourceId, date }), [resourceId, date]);

  const resource = resources.find((r) => r._id === resourceId);

  // Bookings on the chosen day, non-cancelled, drawn as blocks on the rail.
  const dayBlocks = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'Cancelled')
      .map((b) => {
        const s = new Date(b.startTime);
        const e = new Date(b.endTime);
        const top = ((s.getHours() + s.getMinutes() / 60 - DAY_START) / (DAY_END - DAY_START)) * 100;
        const height = ((e - s) / 3600000 / (DAY_END - DAY_START)) * 100;
        return { b, top: Math.max(0, top), height: Math.max(2, height) };
      });
  }, [bookings]);

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
      setForm({ start: '', end: '', purpose: '' });
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(`Requested ${form.start}–${form.end} — conflict — slot unavailable`);
      } else {
        toast.error(apiError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(id) {
    try {
      await cancelBooking(id);
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const headerDate = new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <CalendarClock size={24} /> Resource Booking
      </h1>

      {/* Resource + date header */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="Resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            options={
              resources.length
                ? resources.map((r) => ({ value: r._id, label: `${r.assetTag} — ${r.name}` }))
                : [{ value: '', label: 'No bookable resources' }]
            }
          />
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Card>

      {resource && (
        <p className="text-sm font-medium text-slate-600">
          {resource.name} — {headerDate}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Hour rail */}
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">Day timeline</h2>
          <div className="relative flex">
            {/* hour labels */}
            <div className="w-14 shrink-0">
              {HOURS.map((h) => (
                <div key={h} className="h-12 text-xs text-slate-400">{h}:00</div>
              ))}
            </div>
            {/* rail */}
            <div className="relative flex-1 border-l border-slate-200" style={{ height: `${HOURS.length * 3}rem` }}>
              {HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 border-t border-dashed border-slate-100" style={{ top: `${(i / (DAY_END - DAY_START)) * 100}%` }} />
              ))}
              {dayBlocks.map(({ b, top, height }) => (
                <div
                  key={b._id}
                  className="absolute left-1 right-1 overflow-hidden rounded-md border border-blue-300 bg-blue-100 p-1 text-xs text-blue-800"
                  style={{ top: `${top}%`, height: `${height}%` }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium">Booked — {b.purpose || b.bookedBy?.name}</span>
                    {(b.bookedBy?._id === user?._id || ['asset_manager', 'admin'].includes(user?.role)) && (
                      <button onClick={() => handleCancel(b._id)} title="Cancel"><X size={12} /></button>
                    )}
                  </div>
                  <div>{fmt(b.startTime)}–{fmt(b.endTime)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Book a slot */}
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">Book a slot</h2>
          <form onSubmit={handleBook} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start</label>
                <input type="time" className={input} value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>End</label>
                <input type="time" className={input} value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <input className={input} placeholder="e.g. Procurement Team" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
            </div>

            {conflict && (
              <div className="rounded-md border border-dashed border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
                {conflict}
              </div>
            )}

            <Button type="submit" loading={busy} disabled={!resourceId}>Book slot</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
