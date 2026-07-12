import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: forward API + uploads to the Express server so the client can use
// same-origin relative URLs (/api, /uploads) with no CORS friction in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
