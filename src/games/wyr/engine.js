// Framework-independent WYR logic — ported from index.html's
// makeWyrChoice()/advanceWyrRound(), updated for the two flow decisions
// locked in flows.md §2.2 on 2026-07-09:
//   1. No 8s auto-advance — a round only advances once BOTH players have
//      tapped through the reveal (not just made their pick).
//   2. Trace beat — every reveal appends a pip (match/clash) that becomes
//      the recap constellation (design-bank.md bank #g02).
import { sb } from '../../engine/supabase.js';
import { guardedGameWrite } from '../../engine/session.js';

export async function makeChoice(game, userId, choice) {
  const round = game.state.round;
  const { error } = await sb
    .from('wyr_moves')
    .insert({ game_id: game.id, user_id: userId, round, choice });
  // 23505 = already voted this round (rematch-safe key is game.id + round,
  // not the bare round number — that was the bug that ate a partner's first
  // tap across rematches).
  if (error && error.code !== '23505') return { ok: false, error };
  return { ok: true };
}

export function bothChosen(moves, round, userId, partnerId) {
  const mine = moves.find((m) => m.round === round && m.user_id === userId);
  const theirs = moves.find((m) => m.round === round && m.user_id === partnerId);
  return mine && theirs ? { mine: mine.choice, theirs: theirs.choice } : null;
}

/**
 * Both players must independently confirm "ready" after seeing the reveal
 * before the round advances — this replaces the old 8s auto-advance timer.
 */
export async function markReadyForNext(game, userId) {
  return guardedGameWrite(game.id, (current) => {
    const ready = { ...(current.state.readyForNext || {}), [userId]: true };
    return { state: { ...current.state, readyForNext: ready } };
  });
}

export function bothReady(gameState, userId, partnerId) {
  const ready = gameState.readyForNext || {};
  return !!(ready[userId] && ready[partnerId]);
}

export async function advanceRound(game, pipToAppend) {
  return guardedGameWrite(game.id, (current) => {
    const nextRound = current.state.round + 1;
    const pips = [...(current.state.pips || []), pipToAppend]; // 'match' | 'clash'
    if (nextRound >= current.state.prompts.length) {
      return { phase: 'ended', state: { ...current.state, pips } };
    }
    return {
      phase: 'pick',
      state: { ...current.state, round: nextRound, pips, readyForNext: {} }
    };
  });
}
