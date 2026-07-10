// Framework-independent WYR logic — ported from index.html's
// makeWyrChoice()/advanceWyrRound(), updated for the two flow decisions
// locked in flows.md §2.2 on 2026-07-09:
//   1. No 8s auto-advance — a round only advances once BOTH players have
//      tapped through the reveal (not just made their pick).
//   2. Trace beat — every reveal appends a pip (match/clash) that becomes
//      the recap constellation (design-bank.md bank #g02).
import { sb } from '../../engine/supabase.js';
import { guardedGameWrite } from '../../engine/session.js';

// wyr_moves.choice is an integer column in the DB (0 = 'a', 1 = 'b') —
// the rest of the app works in 'a'/'b' strings, so the conversion happens
// at this boundary only. Every insert was silently failing before this
// fix (integer column rejecting a string value, and the error was never
// surfaced to the UI — looked exactly like "clicking does nothing").
function choiceToInt(choice) { return choice === 'a' ? 0 : 1; }
function intToChoice(n) { return n === 0 ? 'a' : 'b'; }

export async function makeChoice(game, userId, choice) {
  const round = game.state.round;
  const { error } = await sb
    .from('wyr_moves')
    .insert({ game_id: game.id, user_id: userId, round, choice: choiceToInt(choice) });
  // 23505 = already voted this round (rematch-safe key is game.id + round,
  // not the bare round number — that was the bug that ate a partner's first
  // tap across rematches).
  if (error && error.code !== '23505') return { ok: false, error };
  return { ok: true };
}

export function bothChosen(moves, round, userId, partnerId) {
  const mine = moves.find((m) => m.round === round && m.user_id === userId);
  const theirs = moves.find((m) => m.round === round && m.user_id === partnerId);
  return mine && theirs ? { mine: intToChoice(mine.choice), theirs: intToChoice(theirs.choice) } : null;
}

/**
 * Both players must independently confirm "ready" after seeing the reveal
 * before the round advances — this replaces the old 8s auto-advance timer.
 *
 * Both the "mark me ready" write AND the "are we both ready now?" check
 * must happen inside the SAME guardedGameWrite callback, against the row it
 * just fetched fresh from the DB — not against the caller's local `game`
 * prop. The prop is only ever refreshed by the realtime subscription firing
 * after a write commits, so checking it right after your own await is
 * checking stale data that never includes your own just-written flag. That
 * was the bug: neither player's tap ever advanced the round, because each
 * one's "am I both ready" check ran against a copy of the state that
 * predated its own write. (Matches the pattern fixed elsewhere — Finger
 * Smash's tapReady already does this check inside the guardedWrite.)
 */
export async function markReadyForNext(game, userId, partnerId, pipToAppend) {
  return guardedGameWrite(game.id, (current) => {
    const ready = { ...(current.state.readyForNext || {}), [userId]: true };
    const bothNowReady = !!(ready[userId] && ready[partnerId]);

    if (!bothNowReady) {
      return { state: { ...current.state, readyForNext: ready } };
    }

    const nextRound = current.state.round + 1;
    const pips = [...(current.state.pips || []), pipToAppend]; // 'match' | 'clash'
    if (nextRound >= current.state.prompts.length) {
      return { phase: 'ended', state: { ...current.state, pips, readyForNext: ready } };
    }
    return {
      phase: 'pick',
      state: { ...current.state, round: nextRound, pips, readyForNext: {} }
    };
  });
}
