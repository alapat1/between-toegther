import App from './App.svelte';

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
