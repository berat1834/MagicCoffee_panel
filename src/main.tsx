import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

async function start() {
  // Yalnız geliştirme: VITE_MOCK=1 ile örnek veri. Üretim derlemesinde bu dal tamamen atılır.
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK === '1') await import('./mock');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
