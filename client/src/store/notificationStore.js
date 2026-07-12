import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Notifications state powering the navbar bell. The socket handler (wired once
 * in Layout) calls addLive() when a `notification:new` event arrives, so the
 * unread count and dropdown update in real time.
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unread: 0,

  async fetch() {
    const { data } = await api.get('/notifications');
    set({ notifications: data.data.notifications, unread: data.data.unread });
  },

  /** Prepend a notification pushed over the socket + bump the unread count. */
  addLive(notification) {
    set({
      notifications: [notification, ...get().notifications].slice(0, 50),
      unread: get().unread + 1,
    });
  },

  async markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    set({
      notifications: get().notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n
      ),
      unread: Math.max(0, get().unread - 1),
    });
  },

  async markAllRead() {
    await api.patch('/notifications/read-all');
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
      unread: 0,
    });
  },

  clear() {
    set({ notifications: [], unread: 0 });
  },
}));
