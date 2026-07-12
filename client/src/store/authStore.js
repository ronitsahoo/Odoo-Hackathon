import { create } from 'zustand';
import api, { apiError } from '../api/axios.js';
import { connectSocket, disconnectSocket } from '../socket/socket.js';

/**
 * Auth state: current user + token, plus register/login/logout/loadUser.
 * The token is persisted in localStorage; the socket connects/disconnects in
 * lockstep with auth so real-time only runs for signed-in users.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  initialized: false, // becomes true after the first loadUser() resolves

  isAuthenticated: () => Boolean(get().token && get().user),
  isAdmin: () => get().user?.role === 'admin',

  async register({ name, email, password }) {
    const { data } = await api.post('/auth/register', { name, email, password });
    get()._setSession(data.data);
    return data.data.user;
  },

  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    get()._setSession(data.data);
    return data.data.user;
  },

  logout() {
    localStorage.removeItem('token');
    disconnectSocket();
    set({ user: null, token: null });
  },

  /** Restore the session on app boot using a stored token. */
  async loadUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, token, initialized: true });
      connectSocket(token); // resume real-time
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, initialized: true });
    }
  },

  async updateProfile(payload) {
    const { data } = await api.patch('/auth/profile', payload);
    set({ user: data.data.user });
    return data.data.user;
  },

  // internal: store token + user and (re)connect the socket
  _setSession({ user, token }) {
    localStorage.setItem('token', token);
    set({ user, token });
    connectSocket(token);
  },

  apiError,
}));
