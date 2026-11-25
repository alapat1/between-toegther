// Tiny synthesized sound effects (WebAudio, no asset files). Off-switch lives
// in Settings; browsers only allow audio after a tap, which every game has.
import { soundEnabled } from './prefs.js';

let ctx = null;
let on = true;
soundEnabled.subscribe((v) => (on = v));

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.06) {
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(520, 0, 0.06, 'triangle', 0.04),
  blip: () => tone(760, 0, 0.04, 'square', 0.025),
  tick: () => tone(440, 0, 0.08, 'sine', 0.05),
  go: () => { tone(660, 0, 0.1, 'triangle'); tone(990, 0.1, 0.18, 'triangle'); },
  match: () => { tone(523, 0, 0.12, 'triangle'); tone(659, 0.1, 0.12, 'triangle'); tone(784, 0.2, 0.2, 'triangle'); },
  clash: () => { tone(330, 0, 0.14, 'sawtooth', 0.04); tone(247, 0.12, 0.2, 'sawtooth', 0.04); },
  spin: () => { for (let i = 0; i < 8; i++) tone(300 + i * 40, i * 0.12, 0.07, 'square', 0.025); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle')); }
};

/** Play a named effect (no-op when muted or unsupported). */
export function sfx(name) {
  if (!on) return;
  try { SOUNDS[name]?.(); } catch (e) { /* audio must never break a game */ }
}
