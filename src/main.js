import App from './App.svelte';
import { initErrorCatcher } from './engine/errlog.js';

initErrorCatcher();

const app = new App({
  target: document.getElementById('app')
});

// PWA: register the (deliberately minimal, network-first) service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

export default app;
