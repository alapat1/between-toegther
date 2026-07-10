// Global toast store — the fix for the app's defining failure mode: writes
// that fail silently and look like "tapping does nothing" (game_type, wyr
// choice int, realtime publication — every major bug this month was
// invisible because nothing surfaced errors). Engines/components call
// toast() on any { ok: false } path; Toast.svelte renders the queue.
import { writable } from 'svelte/store';

export const toasts = writable([]);
let nextId = 0;

export function toast(message, kind = 'info', duration = 3200) {
  const id = ++nextId;
  toasts.update((list) => [...list, { id, message, kind }]);
  setTimeout(() => {
    toasts.update((list) => list.filter((t) => t.id !== id));
  }, duration);
  return id;
}

export function toastError(message = "that didn't go through — try again") {
  return toast(message, 'error', 4000);
}
