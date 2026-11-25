// New, not a straight port — the old FS ran an unsynced local countdown per
// client (sync-root-cause-analysis.md S5: "each client starts its own 3-2-1
// whenever it first renders the round, so two phones run offset rounds").
// Fix: the zipper ready-gate's SECOND tap writes a server timestamp; both
// clients derive their countdown/round-timer from that same timestamp
// instead of their own clock. Per flows.md §2.4, the gate is a tap, not a hold.
import { guardedGameWrite } from '../../engine/session.js';
import { sb } from '../../engine/supabase.js';
import { logError } from '../../engine/errlog.js';

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
    // Only the ready gate accepts ready taps; a duplicate tap no-ops.
    if (current.state.phase !== 'ready_gate') return null;
    if (current.state.readyTaps?.[userId]) return null;
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

// Taps are counted by a server-side atomic increment (fs_add_taps), NOT by a
// read-modify-write of the game row. Both phones write ~2-4x a second to the
// same row; with optimistic version checks those writes retried against each
// other (and against the round-ending write) and could livelock on a slow
// connection. One atomic statement has nothing to retry. The function itself
// ignores the call unless the game is still playing and the caller is a member
// adding their own taps.
export async function flushTaps(game, userId, additionalCount) {
  if (additionalCount <= 0) return { ok: true };
  const { error } = await sb.rpc('fs_add_taps', { p_game: game.id, p_user: userId, p_n: additionalCount });
  if (error) {
    logError('write-failure', `fs_add_taps: ${error.message}`, { code: error.code, gameId: game.id });
    return { ok: false, reason: 'rpc-error', error };
  }
  return { ok: true };
}

export async function beginPlaying(game) {
  return guardedGameWrite(game.id, (current) => {
    if (current.state.phase !== 'countdown' || current.phase === 'playing') return null;
    return { phase: 'playing', state: { ...current.state, phase: 'playing' } };
  });
}

export async function endRound(game) {
  return guardedGameWrite(game.id, (current) => {
    // Both clients race to close the round — only the playing phase can
    // close, so the loser of the race aborts instead of double-scoring.
    if (current.state.phase !== 'playing') return null;
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
  }, { maxAttempts: 15 });
}
