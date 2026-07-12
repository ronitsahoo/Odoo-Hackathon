import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Requests state: incoming (requests on my items) + outgoing (requests I sent).
 * Transitions call the API then update the local list so the Dashboard reflects
 * status changes instantly; the counterparty gets a live notification.
 */
export const useRequestStore = create((set, get) => ({
  incoming: [],
  outgoing: [],
  loading: false,

  async fetchRequests() {
    set({ loading: true });
    try {
      const [inc, out] = await Promise.all([
        api.get('/requests', { params: { box: 'incoming' } }),
        api.get('/requests', { params: { box: 'outgoing' } }),
      ]);
      set({
        incoming: inc.data.data.requests,
        outgoing: out.data.data.requests,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  async createRequest({ itemId, message, meta }) {
    const { data } = await api.post('/requests', { itemId, message, meta });
    return data.data.request;
  },

  async updateStatus(id, status) {
    const { data } = await api.patch(`/requests/${id}`, { status });
    const updated = data.data.request;
    // Patch whichever box holds this request.
    set({
      incoming: get().incoming.map((r) => (r._id === id ? updated : r)),
      outgoing: get().outgoing.map((r) => (r._id === id ? updated : r)),
    });
    return updated;
  },
}));
