import { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore.js';

/**
 * Navbar bell: unread badge + dropdown list, updated in real time.
 * The socket subscription lives in Layout (addLive on notification:new); this
 * component just reads the store and renders.
 */
export default function NotificationBell() {
  const { notifications, unread, fetch, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function openNotification(n) {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => openNotification(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="text-sm text-slate-700">{n.message}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
