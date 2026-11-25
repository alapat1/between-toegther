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
