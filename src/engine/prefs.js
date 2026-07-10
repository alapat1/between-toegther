// Device-local preferences (haptics, reduced motion) — deliberately NOT in
// Supabase: they describe this phone, not the couple. localStorage-backed
// Svelte stores so toggling in Settings applies instantly everywhere.
import { writable } from 'svelte/store';

function persisted(key, initial) {
  let value = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) value = JSON.parse(raw);
  } catch (e) { /* private mode etc. — fall back to default */ }
  const store = writable(value);
  store.subscribe((v) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ }
  });
  return store;
}

export const hapticsEnabled = persisted('bt-haptics', true);
export const reducedMotion = persisted(
  'bt-reduced-motion',
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
);

let hapticsOn = true;
hapticsEnabled.subscribe((v) => (hapticsOn = v));

/** Vibrate if supported and enabled. Patterns: buzz() tap, buzz([80,40,80]) nudge. */
export function buzz(pattern = 30) {
  if (!hapticsOn) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}
