import { Construction } from 'lucide-react';
import Card from '../components/ui/Card.jsx';

/**
 * Generic "coming soon" screen so sidebar items for not-yet-built modules
 * render something instead of dead-linking. Pass a title and an optional note.
 */
export default function Placeholder({ title, note = 'This screen arrives in a later module.' }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <Card className="flex items-center gap-3 text-slate-500">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <Construction size={20} />
        </span>
        <p className="text-sm">{note}</p>
      </Card>
    </div>
  );
}
