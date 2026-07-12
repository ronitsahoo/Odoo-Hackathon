import { create } from 'zustand';
import api from '../api/axios.js';

/** Audit store: cycles list/detail, create, mark items, close. */
export const useAuditStore = create((set, get) => ({
  cycles: [],
  current: null,
  loading: false,

  async fetchCycles() {
    set({ loading: true });
    try {
      const { data } = await api.get('/audits');
      set({ cycles: data.data.cycles, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async fetchCycle(id) {
    set({ loading: true });
    try {
      const { data } = await api.get(`/audits/${id}`);
      set({ current: data.data.cycle, loading: false });
      return data.data.cycle;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  async createCycle(payload) {
    const { data } = await api.post('/audits', payload);
    set((s) => ({ cycles: [data.data.cycle, ...s.cycles] }));
    return data.data.cycle;
  },

  async markItem(cycleId, assetId, mark, note) {
    const { data } = await api.patch(`/audits/${cycleId}/items/${assetId}`, { mark, note });
    set({ current: data.data.cycle });
    return data.data.cycle;
  },

  async closeCycle(id) {
    const { data } = await api.patch(`/audits/${id}/close`);
    set({ current: data.data.cycle });
    return data.data;
  },
}));
