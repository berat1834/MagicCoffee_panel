import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirmede /api, /health ve /uploads istekleri yerel MagicPay Kiosk API'sine yönlendirilir.
// Farklı bir hedef için: VITE_DEV_API_PROXY=http://127.0.0.1:8300 npm run dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000';
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5371,
      strictPort: true,
      proxy: {
        '/api': apiTarget,
        '/health': apiTarget,
        '/uploads': apiTarget,
      },
    },
  };
});
