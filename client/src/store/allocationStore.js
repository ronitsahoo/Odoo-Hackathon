import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Allocation store (Module 4): allocate / return an asset, fetch an asset's
 * allocation history, and load overdue allocations. Cloned from requestStore.
 * The 409 conflict is intentionally re-thrown so the page can render the red
 * "already allocated" banner instead of a generic toast.
 */
export const useAllocationStore = create((set) => ({
  history: [],
  overdue: [],
  loading: false,

  /** Allocate an Available asset. Throws (incl. 409) for the caller to handle. */
  async allocate(payload) {
    const { data } = await api.post('/allocations', payload);
    return data.data.asset;
  },

  /** Return an allocated asset with check-in condition + notes. */
  async returnAsset(assetId, payload) {
    const { data } = await api.post(`/allocations/${assetId}/return`, payload);
    return data.data.asset;
  },

  async fetchHistory(assetId) {
    set({ loading: true });
    try {
      const { data } = await api.get(`/allocations/asset/${assetId}`);
      set({ history: data.data.allocations, loading: false });
      return data.data.allocations;
    } catch {
      set({ history: [], loading: false });
      return [];
    }
  },

  async fetchOverdue() {
    try {
      const { data } = await api.get('/allocations/overdue');
      set({ overdue: data.data.allocations });
      return data.data.allocations;
    } catch {
      set({ overdue: [] });
      return [];
    }
  },
}));
