import axios from 'axios';

/**
 * Single axios instance for the whole app.
 * - baseURL '/api' rides the Vite dev proxy to the Express server.
 * - request interceptor attaches the JWT from localStorage.
 * - response interceptor logs the user out + redirects on 401.
 */
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Avoid redirect loops if we're already on an auth page.
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Pull a friendly message out of our { success:false, message } envelope. */
export const apiError = (error) =>
  error.response?.data?.message || error.message || 'Something went wrong';

export default api;
