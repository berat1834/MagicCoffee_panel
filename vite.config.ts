import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5371,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8300',
      '/health': 'http://127.0.0.1:8300',
      '/uploads': 'http://127.0.0.1:8300',
    },
  },
});
