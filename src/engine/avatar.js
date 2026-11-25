// Avatars: an emoji on a colour tile, stored as "🦊|2" in profiles.avatar.
// No avatar chosen (older profiles) -> a stable default derived from the id,
// so everyone always has something recognisable.
export const EMOJIS = ['🦊', '🐼', '🐙', '🦄', '🐸', '🦉', '🐯', '🐳', '🌵', '🍉', '🎧', '🚀'];
export const COLORS = [
  { bg: 'var(--accent-blue-atoll)', fg: 'var(--on-accent-blue-atoll)' },
  { bg: 'var(--accent-fruit-dove)', fg: 'var(--on-accent-fruit-dove)' },
  { bg: 'var(--accent-freesia)', fg: 'var(--on-accent-freesia)' },
  { bg: 'var(--accent-summer-green)', fg: 'var(--on-accent-summer-green)' },
  { bg: 'var(--accent-orange-pop)', fg: 'var(--on-accent-orange-pop)' }
];

export function formatAvatar(emojiIdx, colorIdx) { return `${EMOJIS[emojiIdx]}|${colorIdx}`; }

function hash(str) { let h = 0; for (const c of String(str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

/** -> { emoji, bg, fg, emojiIdx, colorIdx } */
export function parseAvatar(avatar, fallbackId = '') {
  let emojiIdx, colorIdx;
  if (avatar && avatar.includes('|')) {
    const [e, c] = avatar.split('|');
    emojiIdx = EMOJIS.indexOf(e);
    colorIdx = Number(c);
  }
  if (!(emojiIdx >= 0)) emojiIdx = hash(fallbackId) % EMOJIS.length;
  if (!(colorIdx >= 0 && colorIdx < COLORS.length)) colorIdx = hash(fallbackId + 'c') % COLORS.length;
  return { emoji: EMOJIS[emojiIdx], ...COLORS[colorIdx], emojiIdx, colorIdx };
}
