import { Loader2 } from 'lucide-react';

/** Centered spinner for loading states. */
export default function Loader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-slate-400 ${className}`}>
      <Loader2 className="animate-spin" size={28} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
