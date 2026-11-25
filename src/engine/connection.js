// Connectivity guard rail: one place that knows whether this phone can
// currently talk to the backend. Components show a banner off it, and the
// room re-syncs the instant it flips back to online — instead of sitting on
// stale state until the next watchdog tick.
import { writable } from 'svelte/store';

export const online = writable(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => online.set(true));
  window.addEventListener('offline', () => online.set(false));
}

/**
 * Subscribe callback that refetches the moment a realtime channel is live.
 * A change committed in the window between "page loaded" and "channel
 * subscribed" is never delivered by realtime — without this, the partner who
 * joined/moved in that gap stays invisible until the next poll.
 */
export function catchUpOnSubscribe(refetch) {
  return (status) => { if (status === 'SUBSCRIBED') refetch(); };
}

// ---- app-level signals (service worker + installability) ----
/** true once a newer version of the app has been downloaded and is ready to swap in */
export const updateReady = writable(false);

/** the browser's deferred "install app" prompt (Chrome/Android), or null */
export const installPrompt = writable(null);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt.set(e); });
  window.addEventListener('appinstalled', () => installPrompt.set(null));
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIos() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}
