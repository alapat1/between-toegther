// New, not a straight port — the old FS ran an unsynced local countdown per
// client (sync-root-cause-analysis.md S5: "each client starts its own 3-2-1
// whenever it first renders the round, so two phones run offset rounds").
// Fix: the zipper ready-gate's SECOND tap writes a server timestamp; both
// clients derive their countdown/round-timer from that same timestamp
// instead of their own clock. Per flows.md §2.4, the gate is a tap, not a hold.
import { guardedGameWrite } from '../../engine/session.js';

export const ROUND_DURATION_MS = 30000;
export const COUNTDOWN_MS = 3000;

export function initialState(totalRounds) {
  return {
    round: 0,
    totalRounds,
    phase: 'ready_gate', // ready_gate -> countdown -> playing -> round_done -> ended
    readyTaps: {},
    roundStartedAt: null,
    taps: {},
    scores: {}
  };
}

export async function tapReady(game, userId, partnerId) {
  return guardedGameWrite(game.id, (current) => {
    const readyTaps = { ...current.state.readyTaps, [userId]: true };
    const bothReady = readyTaps[userId] && readyTaps[partnerId];
    if (!bothReady) return { state: { ...current.state, readyTaps } };
    // Second tap writes the shared clock anchor — this is the actual fix.
    // state.phase MUST move too: the component renders off state.phase, and
    // leaving it at 'ready_gate' while only the top-level column changed is
    // exactly what froze FS at the ready gate in live testing (2026-07-10).
    return {
      phase: 'countdown',
      state: { ...current.state, phase: 'countdown', readyTaps, roundStartedAt: new Date().toISOString(), taps: {} }
    };
  });
}

export function msUntilPlay(state) {
  if (!state.roundStartedAt) return null;
  const elapsed = Date.now() - new Date(state.roundStartedAt).getTime();
  return COUNTDOWN_MS - elapsed;
}

export function msLeftInRound(state) {
  if (!state.roundStartedAt) return null;
  const elapsed = Date.now() - new Date(state.roundStartedAt).getTime() - COUNTDOWN_MS;
  return ROUND_DURATION_MS - elapsed;
}

// Called on every tap — purely local (combo counter feel). The component
// batches these and calls flushTaps() on an interval so tapping doesn't
// generate a DB write per tap.
export async function flushTaps(game, userId, additionalCount) {
  if (additionalCount <= 0) return { ok: true };
  return guardedGameWrite(game.id, (current) => {
    const taps = { ...current.state.taps, [userId]: (current.state.taps[userId] || 0) + additionalCount };
    return { state: { ...current.state, taps } };
  });
}

export async function beginPlaying(game) {
  return guardedGameWrite(game.id, (current) => {
    if (current.state.phase !== 'countdown' || current.phase === 'playing') return null;
    return { phase: 'playing', state: { ...current.state, phase: 'playing' } };
  });
}

export async function endRound(game) {
  return guardedGameWrite(game.id, (current) => {
    const scores = { ...current.state.scores };
    for (const [uid, count] of Object.entries(current.state.taps || {})) {
      scores[uid] = (scores[uid] || 0) + count;
    }
    const nextRound = current.state.round + 1;
    if (nextRound >= current.state.totalRounds) {
      // ended_at releases unique_active_game_per_room — without it a finished
      // game blocks its room forever (every re-entry reconciles back into it).
      return { phase: 'ended', ended_at: new Date().toISOString(), state: { ...current.state, scores, phase: 'ended' } };
    }
    return {
      phase: 'ready_gate',
      state: { ...current.state, scores, round: nextRound, readyTaps: {}, roundStartedAt: null, taps: {}, phase: 'ready_gate' }
    };
  });
}
