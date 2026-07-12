import { badge } from '../../lib/ui.js';

/** Small pill. Pass a Tailwind colour class via `color`. */
export default function Badge({ color = 'bg-slate-100 text-slate-600', className = '', children }) {
  return <span className={`${badge} ${color} ${className}`}>{children}</span>;
}
