import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore.js';
import { relativeTime } from '../utils/timeUtils.js';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Bell } from 'lucide-react';

/**
 * Notifications page — full feed with filter tabs.
 * Tabs: All · Alerts · Approvals · Bookings
 * Each row: colored dot (by type) + message + relative timestamp.
 */
export default function Notifications() {
  const { notifications, fetch, markRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [filteredList, setFilteredList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetch();
      setLoading(false);
    }
    load();
  }, [fetch]);

  useEffect(() => {
    // Filter notifications based on active tab
    if (activeTab === 'all') {
      setFilteredList(notifications);
    } else {
      setFilteredList(notifications.filter((n) => n.type === activeTab));
    }
  }, [activeTab, notifications]);

  function handleNotificationClick(n) {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'alert', label: 'Alerts' },
    { id: 'approval', label: 'Approvals' },
    { id: 'booking', label: 'Bookings' },
  ];

  // Type-based color coding
  const typeColors = {
    info: 'bg-blue-500',
    alert: 'bg-red-500',
    approval: 'bg-green-500',
    booking: 'bg-purple-500',
  };

  if (loading) {
    return <Loader label="Loading notifications..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Logs & Notifications</h1>
        <p className="text-sm text-slate-500">Stay updated on asset assignments, maintenance, and bookings</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Feed */}
      <Card>
        {filteredList.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            message={
              activeTab === 'all'
                ? 'You have no notifications yet'
                : `No ${activeTab} notifications`
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredList.map((n) => (
              <li
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`flex cursor-pointer items-start gap-3 p-4 transition hover:bg-slate-50 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                {/* Type indicator dot */}
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeColors[n.type]}`} />

                <div className="flex-1">
                  <p className="text-sm text-slate-800">{n.message}</p>
                  {!n.read && (
                    <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      New
                    </span>
                  )}
                </div>

                <span className="shrink-0 text-xs text-slate-400">{relativeTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
