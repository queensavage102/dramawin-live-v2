import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import type { BeforeInstallPromptEvent } from './hooks/usePWAInstall';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    const promptEvent = event as BeforeInstallPromptEvent;
    window.__deferredPrompt = promptEvent;
    window.__dramawinInstallPrompt = promptEvent;
    window.dispatchEvent(new Event('dramawin-pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    window.__deferredPrompt = null;
    window.__dramawinInstallPrompt = null;
    window.dispatchEvent(new Event('dramawin-pwa-installed'));
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          void registration.update().catch(() => {});
        })
        .catch(() => {
          // Ignore service worker registration errors
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
