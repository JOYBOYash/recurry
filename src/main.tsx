import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('Service worker registration skipped:', error);
    },
  });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
