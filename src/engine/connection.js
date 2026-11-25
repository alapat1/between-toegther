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
