import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Asset store.
 * Manages asset directory list + filters + pagination + CRUD + socket updates.
 */
const defaultFilters = { search: '', category: '', status: '', department: '', sort: 'new', mine: '' };

export const useAssetStore = create((set, get) => ({
  assets: [],
  total: 0,
  page: 1,
  pages: 1,
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  setFilters(patch) {
    set({ filters: { ...get().filters, ...patch }, page: 1 });
  },
  resetFilters() {
    set({ filters: { ...defaultFilters }, page: 1 });
  },
  setPage(page) {
    set({ page });
  },

  /** GET /assets with the current filters + page. */
  async fetchAssets() {
    set({ loading: true, error: null });
    try {
      const { filters, page } = get();
      const params = { ...filters, page, limit: 20 };
      const { data } = await api.get('/assets', { params });
      set({
        assets: data.data.assets,
        total: data.data.total,
        pages: data.data.pages,
        page: data.data.page,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to load assets' });
    }
  },

  async createAsset(formData) {
    const { data } = await api.post('/assets', formData);
    return data.data.asset;
  },

  async updateAsset(id, formData) {
    const { data } = await api.patch(`/assets/${id}`, formData);
    return data.data.asset;
  },

  // --- socket-driven helpers (wired in Assets page via useSocket) ---

  /** Insert or update an asset in the current list. */
  _upsert(asset) {
    const assets = get().assets.slice();
    const idx = assets.findIndex((a) => a._id === asset._id);
    if (idx >= 0) {
      assets[idx] = asset;
    } else {
      assets.unshift(asset);
    }
    set({ assets });
  },

  /** Remove an asset from the current list. */
  _remove(id) {
    set({ assets: get().assets.filter((a) => a._id !== id) });
  },
}));
