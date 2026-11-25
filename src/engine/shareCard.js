// Draws a 1080x1350 result card on a canvas and shares it (native share sheet
// with the image if the phone supports it, otherwise a download).
import { parseAvatar, loadRenderer } from './avatar.js';

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
const resolve = (v) => { const m = /var\((--[^)]+)\)/.exec(v || ''); return m ? cssVar(m[1]) : v; };

function loadImage(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

// Draw one avatar: DiceBear SVG (pre-loaded) or the legacy emoji tile.
function tile(ctx, x, y, size, person, img) {
  const a = parseAvatar(person.avatar, person.id);
  if (a.kind === 'db' && img) { ctx.drawImage(img, x, y, size, size); return; }
  ctx.fillStyle = resolve(a.bg || 'var(--surface-2)');
  ctx.fillRect(x, y, size, size);
  if (a.kind !== 'emoji') return;
  ctx.font = `${size * 0.55}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(a.emoji, x + size / 2, y + size / 2 + size * 0.04);
}

export function drawShareCard({ title, headline, sub, me, them }, imgs = []) {
  const W = 1080, H = 1500;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = cssVar('--bg') || '#100D0C';
  ctx.fillRect(0, 0, W, H);

  // the two circles from the logo, drifting together
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = cssVar('--accent-blue-atoll'); ctx.beginPath(); ctx.arc(W / 2 - 70, 250, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cssVar('--accent-fruit-dove'); ctx.beginPath(); ctx.arc(W / 2 + 70, 250, 130, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  const text = cssVar('--text'); const soft = cssVar('--text-soft');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = soft; ctx.font = '600 34px "IBM Plex Mono", monospace';
  ctx.fillText(title.toUpperCase(), W / 2, 520);
  ctx.fillStyle = text; ctx.font = '800 92px Syne, system-ui, sans-serif';
  // wrap the headline over up to two lines
  const words = headline.split(' '); let line = ''; const lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > W - 160 && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line);
  const shown = lines.slice(0, 2);
  shown.forEach((l, i) => ctx.fillText(l, W / 2, 660 + i * 105));
  let y = 660 + (shown.length - 1) * 105;
  if (sub) { y += 80; ctx.fillStyle = soft; ctx.font = '400 44px "Space Grotesk", system-ui, sans-serif'; ctx.fillText(sub, W / 2, y); }

  // the two players, always clear of the text above and the footer below
  const size = 200; const gap = 160; const total = size * 2 + gap; const x0 = (W - total) / 2; const y0 = y + 80;
  [[me, x0, imgs[0]], [them, x0 + size + gap, imgs[1]]].forEach(([p, x, img]) => {
    tile(ctx, x, y0, size, p, img);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = text; ctx.font = '700 40px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(p.name, x + size / 2, y0 + size + 56);
    if (p.stat) { ctx.fillStyle = soft; ctx.font = '500 32px "IBM Plex Mono", monospace'; ctx.fillText(p.stat, x + size / 2, y0 + size + 104); }
  });

  ctx.fillStyle = soft; ctx.font = '500 30px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText('BETWEEN & TOGETHER · A SPACE FOR TWO', W / 2, H - 60);
  return c;
}

export async function shareCard(data) {
  const r = await loadRenderer();
  const uriOf = (p) => { const a = parseAvatar(p.avatar, p.id); return a.kind === 'db' && r ? r.render(a.style, a.seed) : null; };
  const imgs = await Promise.all([data.me, data.them].map((p) => (uriOf(p) ? loadImage(uriOf(p)) : null)));
  const canvas = drawShareCard(data, imgs);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return { ok: false };
  const file = new File([blob], 'between-and-together.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'between & together' });
      return { ok: true, how: 'shared' };
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: true, how: 'cancelled' };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'between-and-together.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, how: 'downloaded' };
}
