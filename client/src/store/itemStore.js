import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * REFERENCE STORE — clone this for a new resource.
 * Holds the list + filters + pagination, the CRUD/vote actions, and the
 * socket-driven upsert/remove helpers that keep lists live. The pages call
 * fetchItems() on filter changes and wire the socket handlers via useSocket.
 */
const defaultFilters = { search: '', category: '', status: '', sort: 'new', mine: false };

export const useItemStore = create((set, get) => ({
  items: [],
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

  /** GET /items with the current filters + page. */
  async fetchItems() {
    set({ loading: true, error: null });
    try {
      const { filters, page } = get();
      const params = { ...filters, page, limit: 12 };
      if (!params.mine) delete params.mine;
      const { data } = await api.get('/items', { params });
      set({
        items: data.data.items,
        total: data.data.total,
        pages: data.data.pages,
        page: data.data.page,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to load items' });
    }
  },

  async createItem(formData) {
    const { data } = await api.post('/items', formData);
    return data.data.item;
  },

  async updateItem(id, formData) {
    const { data } = await api.put(`/items/${id}`, formData);
    return data.data.item;
  },

  async removeItem(id) {
    await api.delete(`/items/${id}`);
  },

  async vote(id, value) {
    const { data } = await api.post(`/items/${id}/vote`, { value });
    // Reflect the new counts immediately (socket will also broadcast).
    get()._upsert(data.data.item);
    return data.data;
  },

  // --- socket-driven helpers (wired in Home/Dashboard via useSocket) ---

  /** Insert or update an item in the current list if it belongs there. */
  _upsert(item) {
    const items = get().items.slice();
    const idx = items.findIndex((i) => i._id === item._id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    set({ items });
  },

  /** Remove an item from the current list (on delete or un-approve). */
  _remove(id) {
    set({ items: get().items.filter((i) => i._id !== id) });
  },
}));
