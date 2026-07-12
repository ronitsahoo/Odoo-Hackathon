import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import { btn, card, cardPad } from '../../lib/ui.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import api from '../../api/axios.js';

/**
 * Asset Detail page (Module 3): shows all fields + custom field values +
 * empty sections for allocation/maintenance history (filled by Modules 4/5).
 */
export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = user?.role === 'asset_manager' || user?.role === 'admin';

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const { data } = await api.get(`/assets/${id}`);
        setAsset(data.data.asset);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load asset');
        navigate('/assets');
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [id, navigate]);

  if (loading) return <Loader />;
  if (!asset) return null;

  const customFieldEntries = asset.customFieldValues
    ? Object.entries(asset.customFieldValues)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/assets')}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to Assets
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="text-lg font-mono font-medium text-slate-600">{asset.assetTag}</p>
        </div>
        {canManage && (
          <button
            onClick={() => navigate(`/assets/${asset._id}/edit`)}
            className={`${btn.base} ${btn.secondary}`}
          >
            <Edit size={16} /> Edit
          </button>
        )}
      </div>

      {/* Details */}
      <div className={`${card} ${cardPad}`}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Asset Details</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailRow label="Category" value={asset.category?.name} />
          <DetailRow label="Serial Number" value={asset.serialNumber} />
          <DetailRow
            label="Acquisition Date"
            value={
              asset.acquisitionDate
                ? new Date(asset.acquisitionDate).toLocaleDateString()
                : null
            }
          />
          <DetailRow
            label="Acquisition Cost"
            value={asset.acquisitionCost ? `₹${asset.acquisitionCost.toLocaleString()}` : null}
          />
          <DetailRow label="Condition" value={asset.condition} />
          <DetailRow label="Location" value={asset.location} />
          <DetailRow label="Department" value={asset.department?.name} />
          <DetailRow label="Bookable" value={asset.isBookable ? 'Yes' : 'No'} />
          {asset.currentHolder && (
            <DetailRow label="Current Holder" value={asset.currentHolder.name} />
          )}
          {asset.expectedReturnDate && (
            <DetailRow
              label="Expected Return"
              value={new Date(asset.expectedReturnDate).toLocaleDateString()}
            />
          )}
        </dl>
      </div>

      {/* Custom Fields */}
      {customFieldEntries.length > 0 && (
        <div className={`${card} ${cardPad}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Custom Fields</h2>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {customFieldEntries.map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </dl>
        </div>
      )}

      {/* Photos */}
      {asset.photos?.length > 0 && (
        <div className={`${card} ${cardPad}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Photos</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {asset.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${asset.name} ${idx + 1}`}
                className="h-40 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {/* Allocation History (populated by Module 4), newest first. */}
      <div className={`${card} ${cardPad}`}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Allocation History</h2>
        {asset.allocationHistory?.length > 0 ? (
          <ul className="space-y-2">
            {[...asset.allocationHistory].reverse().map((entry, idx) => (
              <li key={idx} className="text-sm text-slate-700">
                <span className="font-medium">{fmtDate(entry.date)}</span>
                {' — '}
                {allocationLine(entry)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No allocation history yet.</p>
        )}
      </div>

      {/* Maintenance History (populated by Module 5), newest first. */}
      <div className={`${card} ${cardPad}`}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Maintenance History</h2>
        {asset.maintenanceHistory?.length > 0 ? (
          <ul className="space-y-2">
            {[...asset.maintenanceHistory].reverse().map((entry, idx) => (
              <li key={idx} className="text-sm text-slate-700">
                <span className="font-medium">{fmtDate(entry.date)}</span>
                {' — '}
                {entry.status}
                {entry.issue ? `: ${entry.issue}` : ''}
                {entry.technician ? ` (tech: ${entry.technician})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No maintenance history yet.</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  );
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '—';

/** Turn one denormalized allocationHistory entry into a readable sentence. */
function allocationLine(e) {
  if (e.action === 'returned') {
    return `Returned by ${e.holderName || 'holder'}${e.condition ? ` — condition: ${e.condition}` : ''}`;
  }
  if (e.action === 'transferred') {
    return `Transferred from ${e.fromName || '—'} to ${e.toName || '—'}`;
  }
  // 'allocated'
  return `Allocated to ${e.holderName || 'holder'}${e.deptName ? ` — ${e.deptName}` : ''}`;
}
