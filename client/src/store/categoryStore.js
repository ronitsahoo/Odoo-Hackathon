import { create } from 'zustand';
import api, { apiError } from '../api/axios.js';
import toast from 'react-hot-toast';

/**
 * Category store — list / create / update.
 * Categories carry the customFields consumed by asset registration.
 */
export const useCategoryStore = create((set) => ({
  categories: [],
  loading: false,

  async fetchCategories() {
    set({ loading: true });
    try {
      const { data } = await api.get('/categories');
      set({ categories: data.data.categories });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      set({ loading: false });
    }
  },

  async createCategory(payload) {
    const { data } = await api.post('/categories', payload);
    set((s) => ({ categories: [data.data.category, ...s.categories] }));
    return data.data.category;
  },

  async updateCategory(id, payload) {
    const { data } = await api.patch(`/categories/${id}`, payload);
    set((s) => ({
      categories: s.categories.map((c) =>
        c._id === id ? data.data.category : c
      ),
    }));
    return data.data.category;
  },
}));
