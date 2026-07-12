import Badge from './ui/Badge.jsx';
import { statusColors } from '../lib/ui.js';

/** Colored badge for any Item/Request/Asset status (pending, approved, Available, Allocated…). */
export default function StatusBadge({ status, type }) {
  const color = statusColors[status] || 'bg-slate-100 text-slate-600';
  return <Badge color={color}>{status}</Badge>;
}
