import Badge from './ui/Badge.jsx';
import { statusColors } from '../lib/ui.js';

/** Colored badge for any Item/Request status (pending, approved, accepted…). */
export default function StatusBadge({ status }) {
  const color = statusColors[status] || 'bg-slate-100 text-slate-600';
  return <Badge color={color}>{status}</Badge>;
}
