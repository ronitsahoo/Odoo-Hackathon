import { create } from 'zustand';
import api from '../api/axios.js';

/**
 * Booking store (Resource Booking / Screen 6). The 409 overlap is re-thrown so
 * the page can render the inline dashed-red conflict message.
 */
export const useBookingStore = create((set, get) => ({
  bookings: [],
  loading: false,

  async fetchBookings({ resource, date } = {}) {
    set({ loading: true });
    try {
      const { data } = await api.get('/bookings', { params: { resource, date } });
      set({ bookings: data.data.bookings, loading: false });
      return data.data.bookings;
    } catch {
      set({ bookings: [], loading: false });
      return [];
    }
  },

  async createBooking(payload) {
    const { data } = await api.post('/bookings', payload);
    get()._upsert(data.data.booking);
    return data.data.booking;
  },

  async cancelBooking(id) {
    const { data } = await api.patch(`/bookings/${id}/cancel`);
    get()._upsert(data.data.booking);
    return data.data.booking;
  },

  async rescheduleBooking(id, payload) {
    const { data } = await api.patch(`/bookings/${id}/reschedule`, payload);
    get()._upsert(data.data.booking);
    return data.data.booking;
  },

  _upsert(booking) {
    const list = get().bookings.slice();
    const idx = list.findIndex((b) => b._id === booking._id);
    if (idx >= 0) list[idx] = booking;
    else list.push(booking);
    set({ bookings: list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)) });
  },
}));
