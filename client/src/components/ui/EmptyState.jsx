import { Inbox } from 'lucide-react';

/** Friendly empty-list placeholder. Pass an icon, title, hint, and optional action. */
export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon size={36} className="text-slate-300" />
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
