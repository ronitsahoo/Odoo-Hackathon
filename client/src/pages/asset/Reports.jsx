import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, Download } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Loader from '../../components/ui/Loader.jsx';

/**
 * Reports & Analytics (Screen 9). Two charts (utilization bar + maintenance
 * line) drawn with inline SVG (no chart dependency) plus three lists and a CSV
 * export button.
 */
export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [util, freq, most, idle, attn] = await Promise.all([
          api.get('/reports/utilization-by-department'),
          api.get('/reports/maintenance-frequency'),
          api.get('/reports/most-used'),
          api.get('/reports/idle'),
          api.get('/reports/attention'),
        ]);
        setData({
          util: util.data.data.rows,
          freq: freq.data.data.rows,
          most: most.data.data.rows,
          idle: idle.data.data.rows,
          attention: attn.data.data,
        });
      } catch (err) {
        toast.error(apiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function exportCsv(type) {
    setExporting(true);
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
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Loader label="Loading reports…" />;
  if (!data) return <Card>Couldn't load reports.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BarChart3 size={24} /> Reports &amp; Analytics
        </h1>
        <Button onClick={() => exportCsv('utilization')} loading={exporting}>
          <Download size={16} /> Export report
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-800">Utilization by department</h2>
          <UtilizationBars rows={data.util} />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-slate-800">Maintenance frequency</h2>
          <MaintenanceLine rows={data.freq} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ListPanel title="Most used assets" rows={data.most} empty="No usage yet"
          render={(r) => <><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name} <span className="text-slate-400">· {r.uses} uses</span></>} />
        <ListPanel title="Idle assets" rows={data.idle} empty="Nothing idle"
          render={(r) => <><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name} <span className="text-slate-400">· unused {r.idleDays}d</span></>} />
        <AttentionPanel attention={data.attention} />
      </div>
    </div>
  );
}

function UtilizationBars({ rows }) {
  if (!rows.length) return <Empty>No department data</Empty>;
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.department}>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{r.department}</span>
            <span>{r.allocated}/{r.total} allocated</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.allocated / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MaintenanceLine({ rows }) {
  if (!rows.length) return <Empty>No maintenance data</Empty>;
  const W = 320, H = 120, P = 20;
  const max = Math.max(...rows.map((r) => r.count), 1);
  const step = rows.length > 1 ? (W - 2 * P) / (rows.length - 1) : 0;
  const pts = rows.map((r, i) => {
    const x = P + i * step;
    const y = H - P - ((r.count / max) * (H - 2 * P));
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline points={`${P},${H - P} ${W - P},${H - P}`} stroke="#e2e8f0" fill="none" />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" fill="#6366f1" />
          <text x={p[0]} y={H - 6} fontSize="8" textAnchor="middle" fill="#94a3b8">{rows[i].month.slice(5)}</text>
        </g>
      ))}
    </svg>
  );
}

function ListPanel({ title, rows, render, empty }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-800">{title}</h2>
      {rows.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="space-y-2 text-sm text-slate-700">
          {rows.slice(0, 8).map((r) => <li key={r._id}>{render(r)}</li>)}
        </ul>
      )}
    </Card>
  );
}

function AttentionPanel({ attention }) {
  const { dueForMaintenance = [], nearingRetirement = [] } = attention || {};
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-800">Needs attention</h2>
      <p className="mb-1 text-xs font-medium uppercase text-slate-400">Due for maintenance</p>
      {dueForMaintenance.length === 0 ? <Empty>None</Empty> : (
        <ul className="mb-3 space-y-1 text-sm text-slate-700">
          {dueForMaintenance.slice(0, 5).map((r) => (
            <li key={r._id}><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name}</li>
          ))}
        </ul>
      )}
      <p className="mb-1 text-xs font-medium uppercase text-slate-400">Nearing retirement</p>
      {nearingRetirement.length === 0 ? <Empty>None</Empty> : (
        <ul className="space-y-1 text-sm text-slate-700">
          {nearingRetirement.slice(0, 5).map((r) => (
            <li key={r._id}><span className="font-mono text-xs text-slate-500">{r.assetTag}</span> {r.name} <span className="text-slate-400">· {r.ageYears}y</span></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const Empty = ({ children }) => <p className="py-4 text-center text-sm text-slate-400">{children}</p>;
