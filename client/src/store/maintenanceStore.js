import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Maintenance store: the kanban's request list + CRUD + socket
 * upserts so cards move between columns live. Cloned from requestStore.
 */
export const useMaintenanceStore = create((set, get) => ({
  requests: [],
  loading: false,

  async fetchRequests() {
    set({ loading: true });
    try {
      const { data } = await api.get('/maintenance');
      set({ requests: data.data.requests, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  /** Raise a new request (FormData: asset, issue, priority, optional photo). */
  async raise(formData) {
    const { data } = await api.post('/maintenance', formData);
    get()._upsert(data.data.request);
    return data.data.request;
  },

  /** Move a card to `status` (optionally set a technician). Managers only. */
  async setStatus(id, status, technician) {
    const { data } = await api.patch(`/maintenance/${id}/status`, { status, technician });
    get()._upsert(data.data.request);
    return data.data.request;
  },

  /** Insert or replace a request in the list (also used by socket events). */
  _upsert(request) {
    const list = get().requests.slice();
    const idx = list.findIndex((r) => r._id === request._id);
    if (idx >= 0) list[idx] = request;
    else list.unshift(request);
    set({ requests: list });
  },
}));
