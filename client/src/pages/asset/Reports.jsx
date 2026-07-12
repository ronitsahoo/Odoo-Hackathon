import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, Download } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api, { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Loader from '../../components/ui/Loader.jsx';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Reports & Analytics — recharts graphs + lists + per-report CSV export. */
export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintBy, setMaintBy] = useState('asset');
  const [maintGroup, setMaintGroup] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [util, freq, most, idle, attn, heat, disc] = await Promise.all([
          api.get('/reports/utilization-by-department'),
          api.get('/reports/maintenance-frequency'),
          api.get('/reports/most-used'),
          api.get('/reports/idle'),
          api.get('/reports/attention'),
          api.get('/reports/booking-heatmap'),
          api.get('/reports/audit-discrepancies'),
        ]);
        setData({
          util: util.data.data.rows,
          freq: freq.data.data.rows,
          most: most.data.data.rows,
          idle: idle.data.data.rows,
          attention: attn.data.data,
          heat: heat.data.data.rows,
          discrepancies: disc.data.data.rows,
        });
      } catch (err) {
        toast.error(apiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    api.get('/reports/maintenance-by-group', { params: { by: maintBy } })
      .then(({ data }) => setMaintGroup(data.data.rows))
      .catch(() => setMaintGroup([]));
  }, [maintBy]);

  async function exportCsv(type) {
    try {
      const res = await api.get('/reports/export', { params: { type }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (loading) return <Loader label="Loading reports…" />;
  if (!data) return <Card>Couldn't load reports.</Card>;

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <BarChart3 size={24} /> Reports &amp; Analytics
      </h1>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Utilization by department */}
        <Panel title="Utilization by department" onExport={() => exportCsv('utilization')}>
          {data.util.length === 0 ? <Empty>No data</Empty> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.util}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="allocated" fill="#6366f1" name="Allocated" />
                <Bar dataKey="total" fill="#cbd5e1" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Maintenance frequency — toggle asset / category */}
        <Panel
          title="Maintenance frequency"
          onExport={() => exportCsv('maintenance')}
          action={
            <div className="flex gap-1 text-xs">
              {['asset', 'category'].map((k) => (
                <button key={k} onClick={() => setMaintBy(k)}
                  className={`rounded px-2 py-1 ${maintBy === k ? 'bg-brand-100 text-brand-700' : 'text-slate-500'}`}>
                  by {k}
                </button>
              ))}
            </div>
          }
        >
          {maintGroup.length === 0 ? <Empty>No maintenance data</Empty> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={maintGroup}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Maintenance over time (line) */}
        <Panel title="Maintenance over time" onExport={() => exportCsv('maintenance')}>
          {data.freq.length === 0 ? <Empty>No data</Empty> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.freq}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Requests" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Most used (bar) */}
        <Panel title="Most used assets" onExport={() => exportCsv('most-used')}>
          {data.most.length === 0 ? <Empty>No usage yet</Empty> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.most} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="assetTag" fontSize={11} width={70} />
                <Tooltip />
                <Bar dataKey="uses" fill="#10b981" name="Uses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Idle assets chart */}
      <Panel title="Idle assets (by days unused)" onExport={() => exportCsv('idle')}>
        {data.idle.length === 0 ? <Empty>Nothing idle</Empty> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.idle.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="assetTag" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} label={{ value: 'days', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="idleDays" fill="#0ea5e9" name="Idle days" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Booking heatmap — enlarged, gradient by density */}
      <Panel title="Resource booking heatmap (peak windows)">
        <Heatmap rows={data.heat} />
      </Panel>

      {/* Audit discrepancies report */}
      <Panel title="Audit discrepancies" onExport={() => exportCsv('audit-discrepancies')}>
        {(!data.discrepancies || data.discrepancies.length === 0) ? (
          <Empty>No discrepancies flagged</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Cycle</th><th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4">Mark</th><th className="py-2 pr-4">Expected location</th><th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.discrepancies.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-slate-600">{d.cycle} <span className="text-xs text-slate-400">({d.cycleStatus})</span></td>
                    <td className="py-2 pr-4"><span className="font-mono text-xs text-slate-500">{d.assetTag}</span> {d.assetName}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.mark === 'Missing' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.mark}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{d.expectedLocation}</td>
                    <td className="py-2 text-slate-400">{new Date(d.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Lists */}
      <div className="grid gap-5 lg:grid-cols-2">
        <AttentionPanel attention={data.attention} />
        <ListPanel title="Most used" rows={data.most} empty="No usage"
          render={(r) => <><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name} <span className="text-slate-400">· {r.uses}</span></>} />
      </div>
    </div>
  );
}

function Heatmap({ rows }) {
  if (!rows.length) return <Empty>No bookings yet</Empty>;
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8..19 window
  const max = Math.max(...rows.map((r) => r.count), 1);
  const cell = (day, hour) => rows.find((r) => r.day === day && r.hour === hour)?.count || 0;
  // Light→dark gradient by booking density.
  const shade = (c) => (c === 0 ? '#f1f5f9' : `rgb(${Math.round(224 - 145 * (c / max))},${Math.round(231 - 129 * (c / max))},${Math.round(255 - 14 * (c / max))})`);
  return (
    <div className="space-y-3 overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="p-1" />
            {hours.map((h) => <th key={h} className="p-1 text-xs font-normal text-slate-400">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {DOW.map((d, di) => (
            <tr key={d}>
              <td className="p-1 pr-2 text-right text-xs font-medium text-slate-500">{d}</td>
              {hours.map((h) => {
                const c = cell(di, h);
                return (
                  <td key={h} title={`${d} ${h}:00 — ${c} booking(s)`}
                    className="h-9 w-11 rounded text-center align-middle text-[10px] font-medium"
                    style={{ background: shade(c), color: c / max > 0.5 ? '#fff' : '#64748b' }}>
                    {c || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Gradient legend */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Fewer</span>
        <div className="h-3 w-40 rounded" style={{ background: 'linear-gradient(to right, #f1f5f9, #6366f1)' }} />
        <span>More bookings</span>
      </div>
    </div>
  );
}

function Panel({ title, children, onExport, action }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          {onExport && (
            <button onClick={onExport} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Download size={12} /> CSV
            </button>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

function ListPanel({ title, rows, render, empty, onExport }) {
  return (
    <Panel title={title} onExport={onExport}>
      {rows.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="space-y-2 text-sm text-slate-700">
          {rows.slice(0, 8).map((r) => <li key={r._id}>{render(r)}</li>)}
        </ul>
      )}
    </Panel>
  );
}

function AttentionPanel({ attention }) {
  const { dueForMaintenance = [], nearingRetirement = [] } = attention || {};
  return (
    <Panel title="Needs attention">
      <p className="mb-1 text-xs font-medium uppercase text-slate-400">Due for maintenance</p>
      {dueForMaintenance.length === 0 ? <Empty>None</Empty> : (
        <ul className="mb-3 space-y-1 text-sm text-slate-700">
          {dueForMaintenance.slice(0, 5).map((r) => <li key={r._id}><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name}</li>)}
        </ul>
      )}
      <p className="mb-1 text-xs font-medium uppercase text-slate-400">Nearing retirement</p>
      {nearingRetirement.length === 0 ? <Empty>None</Empty> : (
        <ul className="space-y-1 text-sm text-slate-700">
          {nearingRetirement.slice(0, 5).map((r) => <li key={r._id}><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name} <span className="text-slate-400">· {r.ageYears}y</span></li>)}
        </ul>
      )}
    </Panel>
  );
}

const Empty = ({ children }) => <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
