import assert from 'node:assert/strict';
import { parseAvatar, formatAvatar, randomAvatar, STYLES, loadRenderer } from '../src/engine/avatar.js';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; } };
console.log('avatars');
const r = await loadRenderer();
await t('renderer loads on demand', () => { assert.ok(r && typeof r.render === 'function'); });
await t('new format round-trips and renders an SVG data URI', () => {
  const a = parseAvatar(formatAvatar('lo', 'k3j9x2ab'));
  assert.equal(a.kind, 'db'); assert.equal(a.style, 'lo'); assert.equal(a.seed, 'k3j9x2ab');
  assert.ok(r.render(a.style, a.seed).startsWith('data:image/svg+xml'));
});
await t('same seed -> identical image; different seed -> different image', () => {
  assert.equal(r.render('lo', 'abc12345'), r.render('lo', 'abc12345'));
  assert.notEqual(r.render('lo', 'abc12345'), r.render('lo', 'zzz99999'));
});
await t('every offered style renders', () => { for (const s of STYLES) assert.ok(r.render(s.id, 'seedseed').length > 200, s.id); });
await t('stored value fits the profiles.avatar column (<= 24 chars)', () => { for (let i = 0; i < 200; i++) assert.ok(randomAvatar().length <= 24); });
await t('legacy emoji avatars still render', () => { const a = parseAvatar('🦊|2'); assert.equal(a.kind, 'emoji'); assert.equal(a.emoji, '🦊'); });
await t('missing or garbage avatars fall back to a stable default', () => {
  const a = parseAvatar(null, 'user-123'); const b = parseAvatar('garbage', 'user-123');
  assert.equal(a.kind, 'db'); assert.deepEqual(a, b);
});
console.log(`\n${n} passed`);
