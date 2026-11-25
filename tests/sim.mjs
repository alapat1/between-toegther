// Two-player simulation of every game engine against an in-memory fake of the
// Supabase tables the engines use. Run: `npm test`.
//
// What it emulates from the real schema (verified against the live project):
//   - game_sessions.version bumped by a BEFORE UPDATE trigger
//   - unique_active_game_per_room (partial unique index, ended_at IS NULL)
//   - wyr_moves primary key (game_id, user_id, round), integer choice 0/1
//   - random network latency so both "phones" genuinely interleave
//
// Everything is driven through the real engine modules; only sb.from() is faked.
import assert from 'node:assert/strict';
import { sb } from '../src/engine/supabase.js';

// ---------- fake backend ----------
const db = { game_sessions: [], wyr_moves: [], prompts: [] };
let idSeq = 0;
const latency = () => new Promise((r) => setTimeout(r, Math.random() * 12));
const clone = (x) => JSON.parse(JSON.stringify(x));

function builder(table) {
  const q = { table, op: 'select', filters: [], payload: null, wantRows: false, single: false, maybe: false };
  const b = {
    select() { q.wantRows = true; return b; },
    insert(p) { q.op = 'insert'; q.payload = p; return b; },
    update(p) { q.op = 'update'; q.payload = p; return b; },
    eq(c, v) { q.filters.push((r) => r[c] === v); return b; },
    is(c, v) { q.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return b; },
    not(c, _op, list) {
      const ids = list.replace(/[()]/g, '').split(',').map(Number);
      q.filters.push((r) => !ids.includes(r[c]));
      return b;
    },
    order() { return b; },
    limit() { return b; },
    single() { q.single = true; return b; },
    maybeSingle() { q.maybe = true; return b; },
    then(res, rej) { return run(q).then(res, rej); }
  };
  return b;
}

async function run(q) {
  await latency();
  const rows = db[q.table];
  const match = () => rows.filter((r) => q.filters.every((f) => f(r)));
  let data;
  let error = null;

  if (q.op === 'insert') {
    const row = { id: `id${++idSeq}`, version: 0, ended_at: null, created_at: new Date().toISOString(), ...clone(q.payload) };
    const dupActive = q.table === 'game_sessions' && rows.some((r) => r.room_id === row.room_id && !r.ended_at);
    const dupMove = q.table === 'wyr_moves' && rows.some((r) => r.game_id === row.game_id && r.user_id === row.user_id && r.round === row.round);
    if (dupActive || dupMove) error = { code: '23505', message: 'duplicate key' };
    else { rows.push(row); data = [clone(row)]; }
  } else if (q.op === 'update') {
    const hit = match();
    // The whole match+apply is synchronous => atomic, like a row lock.
    for (const r of hit) {
      Object.assign(r, clone(q.payload));
      if (q.table === 'game_sessions') r.version += 1; // bump_game_version trigger
    }
    data = hit.map(clone);
  } else {
    data = match().map(clone);
  }

  if (error) return { data: null, error };
  if (q.single) return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no row' } };
  if (q.maybe) return { data: data[0] ?? null, error: null };
  return { data, error: null };
}

sb.from = (t) => builder(t);
// Stub the realtime/auth bits so nothing tries to open a socket.
sb.channel = () => ({ on() { return this; }, subscribe() { return this; } });
sb.removeChannel = () => {};

for (let i = 1; i <= 40; i++) {
  db.prompts.push({ id: i, game: 'tod', theme: 'casual', tier: 'easy', type: i % 2 ? 'truth' : 'dare', option_a: `prompt ${i}` });
}

// ---------- engines under test ----------
const { startGame } = await import('../src/engine/session.js');
const fs = await import('../src/games/fingersmash/engine.js');
const wyr = await import('../src/games/wyr/engine.js');
const tod = await import('../src/games/tod/engine.js');
const spin = await import('../src/games/spin/engine.js');

const A = 'user-A';
const B = 'user-B';
const game = (id) => db.game_sessions.find((g) => g.id === id);
// Each "phone" works from its own possibly-stale snapshot of the row, exactly
// like the Svelte components do.
const snap = (id) => clone(game(id));

let passed = 0;
async function test(name, fn) {
  const rooms = db.game_sessions.length;
  try { await fn(`room-${rooms}-${Math.random()}`); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

console.log('engine simulation (2 players, random latency)');

await test('startGame: both phones start at once -> exactly one active game', async (room) => {
  const [r1, r2] = await Promise.all([
    startGame(room, 'fs', 2, fs.initialState(2)),
    startGame(room, 'fs', 2, fs.initialState(2))
  ]);
  assert.ok(r1.ok && r2.ok);
  assert.equal(db.game_sessions.filter((g) => g.room_id === room && !g.ended_at).length, 1);
  assert.equal(r1.game.id, r2.game.id, 'loser must reconcile onto the winner');
});

await test('Finger Smash: full 2-round match, taps scored once, game ends', async (room) => {
  const { game: g0 } = await startGame(room, 'fs', 2, fs.initialState(2));
  const id = g0.id;
  for (let round = 0; round < 2; round++) {
    await Promise.all([fs.tapReady(snap(id), A, B), fs.tapReady(snap(id), B, A)]);
    assert.equal(game(id).state.phase, 'countdown', 'both ready -> countdown');
    assert.ok(game(id).state.roundStartedAt, 'shared clock anchor written');
    await Promise.all([fs.beginPlaying(snap(id)), fs.beginPlaying(snap(id))]);
    assert.equal(game(id).state.phase, 'playing');
    await Promise.all([fs.flushTaps(snap(id), A, 10), fs.flushTaps(snap(id), B, 7), fs.flushTaps(snap(id), A, 5)]);
    // both clients race to close the round
    await Promise.all([fs.endRound(snap(id)), fs.endRound(snap(id))]);
    // a straggler flush after close must not leak into next round
    await fs.flushTaps(snap(id), A, 99);
  }
  const s = game(id).state;
  assert.equal(s.phase, 'ended');
  assert.deepEqual([s.scores[A], s.scores[B]], [30, 14], 'no double-scoring, no leaked straggler taps');
  assert.ok(game(id).ended_at, 'ended_at set so the room is freed');
});

await test('Would You Rather: both pick (A=0 must work), both confirm -> advances once, ends', async (room) => {
  const prompts = [['a1', 'b1'], ['a2', 'b2']];
  const { game: g0 } = await startGame(room, 'wyr', 2, { prompts, pips: [], totalRounds: 2 });
  const id = g0.id;
  for (let round = 0; round < 2; round++) {
    const [m1, m2] = await Promise.all([wyr.makeChoice(snap(id), A, 'a'), wyr.makeChoice(snap(id), B, 'b')]);
    assert.ok(m1.ok && m2.ok);
    const dup = await wyr.makeChoice(snap(id), A, 'b'); // double tap / re-vote
    assert.ok(dup.ok, 'duplicate vote is tolerated');
    const moves = clone(db.wyr_moves.filter((m) => m.game_id === id));
    assert.equal(moves.find((m) => m.user_id === A && m.round === round).choice, 0, 'first vote kept');
    const reveal = wyr.bothChosen(moves, round, A, B);
    assert.deepEqual(reveal, { mine: 'a', theirs: 'b' });
    await Promise.all([
      wyr.markReadyForNext(snap(id), A, B, 'clash'),
      wyr.markReadyForNext(snap(id), B, A, 'clash'),
      wyr.markReadyForNext(snap(id), A, B, 'clash') // double tap
    ]);
  }
  assert.ok(game(id).ended_at, 'game ended');
  assert.deepEqual(game(id).state.pips, ['clash', 'clash'], 'exactly one pip per round');
});

for (const mode of ['self', 'dealer']) {
  await test(`Truth or Dare (${mode} mode): right player picks, turns rotate, dare needs judge, ends`, async (room) => {
    const { game: g0 } = await startGame(room, 'tod', 4, tod.initialState('casual', 4, A, B, mode));
    const id = g0.id;
    const performers = [];
    for (let round = 0; round < 4; round++) {
      const s0 = game(id).state;
      performers.push(s0.currentTurn);
      const picker = tod.pickerOf(s0);
      const notPicker = picker === A ? B : A;
      assert.equal(picker, mode === 'self' ? s0.currentTurn : s0.chooser, 'picker follows the mode');
      const choice = round % 2 ? 'dare' : 'truth';
      // the wrong player cannot pick
      await tod.pickChoice(snap(id), choice, notPicker);
      assert.equal(game(id).state.phase, 'chooser_picks', 'wrong player pick is ignored');
      await Promise.all([tod.pickChoice(snap(id), choice, picker), tod.pickChoice(snap(id), choice, picker)]);
      assert.equal(game(id).state.phase, 'prompt_active');
      assert.equal(game(id).state.usedPrompts.length, round + 1, 'double pick must not burn two prompts');
      await Promise.all([tod.done(snap(id), s0.currentTurn), tod.done(snap(id), s0.currentTurn)]);
      if (choice === 'dare') {
        assert.equal(game(id).state.phase, 'judging');
        await Promise.all([tod.judgeConfirm(snap(id), true), tod.judgeConfirm(snap(id), true)]);
      }
    }
    assert.deepEqual(performers, [A, B, A, B], 'turn alternates every round');
    assert.equal(game(id).state.phase, 'end');
    assert.ok(game(id).ended_at);
  });
}

await test('Spin: spinner rotates, only judge awards a point, double taps safe, ends', async (room) => {
  const { game: g0 } = await startGame(room, 'spin', 3, spin.initialState(3, A));
  const id = g0.id;
  const spinners = [];
  for (let round = 0; round < 3; round++) {
    const s0 = game(id).state;
    spinners.push(s0.spinner_id);
    const other = s0.spinner_id === A ? B : A;
    await Promise.all([spin.spin(snap(id)), spin.spin(snap(id))]);
    assert.equal(game(id).state.phase, 'prompt');
    assert.equal(game(id).state.usedPrompts.length, round + 1, 'double spin must not burn two prompts');
    await spin.judge(snap(id), 'did', other); // too early: spinner hasn't said done
    assert.equal(game(id).state.phase, 'prompt', 'judge cannot jump the gun');
    await Promise.all([spin.markSpinnerDone(snap(id)), spin.markSpinnerDone(snap(id))]);
    await Promise.all([spin.judge(snap(id), 'did', other), spin.judge(snap(id), 'did', other)]);
  }
  assert.deepEqual(spinners, [A, B, A]);
  assert.equal(game(id).state.phase, 'ended');
  assert.deepEqual([game(id).state.scores[A], game(id).state.scores[B]], [2, 1], 'one point per round, no doubles');
  assert.ok(game(id).ended_at);
});

await test('Spin: skipping a prompt advances the round with no point, only before "i did it"', async (room) => {
  const { game: g0 } = await startGame(room, 'spin', 3, spin.initialState(3, A));
  const id = g0.id;
  await spin.spin(snap(id));
  await spin.markSpinnerDone(snap(id));
  await spin.skipPrompt(snap(id), B);
  assert.equal(game(id).state.round, 0, 'cannot skip after "i did it"');
  // fresh round: skip works
  const { game: g1 } = await startGame(room + '-b', 'spin', 3, spin.initialState(3, A));
  await spin.spin(snap(g1.id));
  await Promise.all([spin.skipPrompt(snap(g1.id), B), spin.skipPrompt(snap(g1.id), B)]);
  const st = game(g1.id).state;
  assert.equal(st.round, 1, 'advanced exactly once');
  assert.equal(st.spinner_id, B, 'spinner rotates');
  assert.deepEqual(st.scores, {}, 'no points for a skip');
});

await test('stress: 30 simultaneous version collisions all resolve (no lost writes)', async (room) => {
  const { game: g0 } = await startGame(room, 'fs', 1, fs.initialState(1));
  const id = g0.id;
  await Promise.all([fs.tapReady(snap(id), A, B), fs.tapReady(snap(id), B, A)]);
  await Promise.all([fs.beginPlaying(snap(id))]);
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => fs.flushTaps(snap(id), i % 2 ? A : B, 1)));
  const failed = results.filter((r) => !r.ok);
  const total = (game(id).state.taps[A] || 0) + (game(id).state.taps[B] || 0);
  assert.equal(failed.length + total, 30, `every flush is either applied or reported failed (applied ${total}, failed ${failed.length})`);
  assert.equal(failed.length, 0, `${failed.length}/30 writes exhausted their retries and were silently dropped`);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
process.exit(process.exitCode || 0);
