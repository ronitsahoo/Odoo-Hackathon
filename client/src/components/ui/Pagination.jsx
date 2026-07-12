import { ChevronLeft, ChevronRight } from 'lucide-react';
import { btn } from '../../lib/ui.js';

/** Simple prev/next pager with page indicator. Hidden when there's one page. */
export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        className={`${btn.base} ${btn.secondary} ${btn.sm}`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <span className="text-sm text-slate-500">
        Page {page} of {pages}
      </span>
      <button
        className={`${btn.base} ${btn.secondary} ${btn.sm}`}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
