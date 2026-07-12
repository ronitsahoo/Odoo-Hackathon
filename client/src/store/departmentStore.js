import { create } from 'zustand';
import api, { apiError } from '../api/axios.js';
import toast from 'react-hot-toast';

/**
 * Department store — list / create / update.
 * Reusable by later modules (Screens 4 & 5 need department dropdowns).
 */
export const useDepartmentStore = create((set) => ({
  departments: [],
  loading: false,

  async fetchDepartments(params) {
    set({ loading: true });
    try {
      const { data } = await api.get('/departments', { params });
      set({ departments: data.data.departments });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      set({ loading: false });
    }
  },

  async createDepartment(payload) {
    const { data } = await api.post('/departments', payload);
    set((s) => ({ departments: [data.data.department, ...s.departments] }));
    return data.data.department;
  },

  async updateDepartment(id, payload) {
    const { data } = await api.patch(`/departments/${id}`, payload);
    set((s) => ({
      departments: s.departments.map((d) =>
        d._id === id ? data.data.department : d
      ),
    }));
    return data.data.department;
  },
}));
