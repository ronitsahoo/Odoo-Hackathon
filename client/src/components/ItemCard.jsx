import { Link } from 'react-router-dom';
import { ArrowBigUp, MessageSquare, Tag } from 'lucide-react';
import Card from './ui/Card.jsx';
import StatusBadge from './StatusBadge.jsx';

/**
 * Compact item preview used in grids (Home, Dashboard).
 * Shows the first image, title, category, score, and status (when showStatus).
 */
export default function ItemCard({ item, showStatus = false }) {
  const cover = item.images?.[0];
  const score = (item.upvotes?.length || 0) - (item.downvotes?.length || 0);

  return (
    <Card padded={false} className="overflow-hidden transition hover:shadow-md">
      <Link to={`/items/${item._id}`}>
        {cover ? (
          <img src={cover} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-300">
            <Tag size={28} />
          </div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {item.category}
            </span>
            {showStatus && <StatusBadge status={item.status} />}
          </div>
          <h3 className="line-clamp-2 font-semibold text-slate-800">{item.title}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ArrowBigUp size={14} /> {score}
            </span>
            <span className="inline-flex items-center gap-1">
              by {item.owner?.name || 'Unknown'}
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
