// Room/session lifecycle — extracted from index.html's reconcileActiveGame(),
// startGame(), and join_room_by_code RPC usage. Framework-independent so
// every game (present and future) shares one implementation instead of each
// screen re-deriving its own join/rejoin/resume logic.
import { sb } from './supabase.js';
import { guardedWrite } from './guardedWrite.js';

export async function joinRoomByCode(code) {
  // Server-side RPC (already fixed 2026-06-20) — locks room SELECT to
  // members/creator, closing the earlier room-hijack hole.
  const { data, error } = await sb.rpc('join_room_by_code', { p_code: code });
  if (error) return { ok: false, error };
  return { ok: true, room: data };
}

export async function reconcileActiveGame(roomId) {
  // Runs on load and on wake (see channel re-subscribe below) — finds
  // whatever game is actually live for this room instead of trusting
  // whatever the client last rendered. This is the fix for S4-style
  // "button does nothing" bugs: always reconcile against the server's
  // truth rather than a possibly-stale local view.
  const { data, error } = await sb
    .from('game_sessions')
    .select('*')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function startGame(roomId, type, rounds, initialState) {
  // game_sessions' actual column is `game_type` (not `type`), and its check
  // constraint only allows 'wyr' | 'tod' | 'fs' | 'spin' — this mismatch is
  // what silently broke every "start game" click before this fix landed
  // (the insert failed, and nothing surfaced the error to the caller).
  const { data, error } = await sb
    .from('game_sessions')
    .insert({ room_id: roomId, game_type: type, state: { round: 0, totalRounds: rounds, ...initialState }, phase: 'active' })
    .select()
    .single();

  if (error && error.code === '23505') {
    // Partner already started one via unique_active_game_per_room —
    // reconcile to it instead of surfacing an error toast (fixed 2026-07-08).
    return { ok: true, game: await reconcileActiveGame(roomId), reconciled: true };
  }
  if (error) return { ok: false, error };
  return { ok: true, game: data };
}

/**
 * Every phase-advancing write in every game should route through this —
 * it's guardedWrite() pre-bound to game_sessions, so the retry-on-conflict
 * behavior (sync-root-cause-analysis.md S3/S4) is automatic instead of
 * something each game has to remember to implement.
 */
export function guardedGameWrite(gameId, computeUpdate, opts) {
  return guardedWrite('game_sessions', gameId, computeUpdate, opts);
}

/**
 * Realtime channel lifecycle with the fix S1 called for: a full teardown +
 * re-subscribe on wake, not just a refetch. The old build's subscribe
 * callback caught CLOSED and set a status dot but never re-subscribed,
 * which is what let presence go stale and the destructive "end game"
 * banner fire on a healthy game (S2).
 */
export function subscribeToGame(gameId, onChange) {
  let channel = null;

  function subscribe() {
    channel = sb
      .channel(`game_sessions:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${gameId}` }, onChange)
      .subscribe();
  }

  function teardownAndResubscribe() {
    if (channel) sb.removeChannel(channel);
    subscribe();
  }

  subscribe();
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') teardownAndResubscribe();
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('online', teardownAndResubscribe);

  return function unsubscribe() {
    document.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('online', teardownAndResubscribe);
    if (channel) sb.removeChannel(channel);
  };
}
