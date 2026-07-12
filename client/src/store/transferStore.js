import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Transfer store: submit a transfer request on an allocated asset,
 * and approve/reject/list them. Cloned from requestStore.
 */
export const useTransferStore = create((set, get) => ({
  transfers: [],
  loading: false,

  async fetchTransfers(status) {
    set({ loading: true });
    try {
      const { data } = await api.get('/transfers', { params: status ? { status } : {} });
      set({ transfers: data.data.transfers, loading: false });
      return data.data.transfers;
    } catch {
      set({ transfers: [], loading: false });
      return [];
    }
  },

  async submitTransfer(payload) {
    const { data } = await api.post('/transfers', payload);
    return data.data.transfer;
  },

  async approve(id) {
    const { data } = await api.patch(`/transfers/${id}/approve`);
    // Drop the handled request from the local list.
    set({ transfers: get().transfers.filter((t) => t._id !== id) });
    return data.data;
  },

  async reject(id) {
    const { data } = await api.patch(`/transfers/${id}/reject`);
    set({ transfers: get().transfers.filter((t) => t._id !== id) });
    return data.data.transfer;
  },
}));
