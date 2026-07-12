import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Dashboard store: fetches KPIs, overdue, and recent activity.
 */
export const useDashboardStore = create((set) => ({
  summary: null,
  loading: false,
  error: null,

  async fetchSummary() {
    try {
      set({ loading: true, error: null });
      const { data } = await api.get('/dashboard/summary');
      set({ summary: data.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load dashboard', loading: false });
    }
  },

  updateKPI(key, delta) {
    set((state) => {
      if (!state.summary) return state;
      return {
        summary: {
          ...state.summary,
          counts: {
            ...state.summary.counts,
            [key]: state.summary.counts[key] + delta,
          },
        },
      };
    });
  },

  prependActivity(activity) {
    set((state) => {
      if (!state.summary) return state;
      return {
        summary: {
          ...state.summary,
          recentActivity: [activity, ...state.summary.recentActivity].slice(0, 8),
        },
      };
    });
  },
}));
