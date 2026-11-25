// Avatars come from DiceBear (MIT, generated in the browser from a seed — no
// images to host, no network calls, works offline). Only CC0 (public domain)
// styles are offered, so no attribution is legally required.
//
// profiles.avatar formats:
//   "db:<style>:<seed>"   current, e.g. "db:lo:k3j9x2ab"
//   "🦊|2"                legacy emoji tile (still rendered for older profiles)
import { writable } from 'svelte/store';

export const STYLES = [
  { id: 'lo', label: 'portrait' },
  { id: 'no', label: 'sketch' },
  { id: 'op', label: 'peeps' },
  { id: 'px', label: 'pixel' }
];

/**
 * The renderer (DiceBear) is loaded on demand. `renderer` is null until it has
 * arrived; components show a neutral placeholder meanwhile and update on their own.
 */
export const renderer = writable(null);
let loading = null;
export function loadRenderer() {
  if (!loading) loading = import('./avatarRender.js').then((m) => { renderer.set(m); return m; }).catch(() => { loading = null; return null; });
  return loading;
}

export function randomSeed() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const formatAvatar = (styleId, seed) => `db:${styleId}:${seed}`;
export const randomAvatar = () => formatAvatar(STYLES[Math.floor(Math.random() * STYLES.length)].id, randomSeed());

// ---- legacy emoji tiles ----
export const EMOJIS = ['🦊', '🐼', '🐙', '🦄', '🐸', '🦉', '🐯', '🐳', '🌵', '🍉', '🎧', '🚀'];
export const COLORS = [
  { bg: 'var(--accent-blue-atoll)', fg: 'var(--on-accent-blue-atoll)' },
  { bg: 'var(--accent-fruit-dove)', fg: 'var(--on-accent-fruit-dove)' },
  { bg: 'var(--accent-freesia)', fg: 'var(--on-accent-freesia)' },
  { bg: 'var(--accent-summer-green)', fg: 'var(--on-accent-summer-green)' },
  { bg: 'var(--accent-orange-pop)', fg: 'var(--on-accent-orange-pop)' }
];

function hash(str) { let h = 0; for (const c of String(str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

/**
 * -> { kind: 'db', style, seed }  or  { kind: 'emoji', emoji, bg, fg }
 * Nothing chosen yet -> a stable DiceBear default derived from the user id.
 */
export function parseAvatar(avatar, fallbackId = '') {
  if (avatar && avatar.startsWith('db:')) {
    const [, style, seed] = avatar.split(':');
    if (style && seed) return { kind: 'db', style, seed };
  }
  if (avatar && avatar.includes('|')) {
    const [e, c] = avatar.split('|');
    const emojiIdx = EMOJIS.indexOf(e);
    const colorIdx = Number(c);
    if (emojiIdx >= 0 && colorIdx >= 0 && colorIdx < COLORS.length) return { kind: 'emoji', emoji: EMOJIS[emojiIdx], ...COLORS[colorIdx] };
  }
  const seed = String(fallbackId || 'guest').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'guest';
  return { kind: 'db', style: 'lo', seed };
}
