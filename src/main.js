import App from './App.svelte';
import { initErrorCatcher } from './engine/errlog.js';
import { updateReady } from './engine/connection.js';

initErrorCatcher();

const app = new App({
  target: document.getElementById('app')
});

// PWA: register the service worker (network-first pages, cached assets for offline).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    // A new version took over while this page is still running the old code:
    // tell the player instead of leaving them on stale JavaScript.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) updateReady.set(true);
    });
  });
}

export default app;
