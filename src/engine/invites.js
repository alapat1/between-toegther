// Invite-based game start — replaces the earlier host/joiner asymmetry.
// Either partner can propose a game; the other accepts or declines. Only
// one pending invite per room at a time (DB partial unique index), so if
// both partners propose at once, the second insert fails and the sender
// just picks up the first invite as an incoming one instead of racing.
import { sb } from './supabase.js';

export async function sendInvite(roomId, userId, gameType, rounds, config = {}) {
  const { data, error } = await sb
    .from('game_invites')
    .insert({ room_id: roomId, game_type: gameType, rounds, config, invited_by: userId })
    .select()
    .single();

  if (error && error.code === '23505') {
    // Partner already sent one — surface it as the current invite rather
    // than erroring, so the UI can show it as incoming.
    const existing = await fetchActiveInvite(roomId);
    return { ok: true, crossed: true, invite: existing };
  }
  if (error) return { ok: false, error };
  return { ok: true, invite: data };
}

export async function respondInvite(inviteId, accept) {
  const { data, error } = await sb
    .from('game_invites')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, invite: data };
}

export async function fetchActiveInvite(roomId) {
  const { data } = await sb
    .from('game_invites')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Same teardown+resubscribe-on-wake pattern as subscribeToGame /
 * subscribeToRoomMembers — invites are exactly the kind of short-lived
 * state that would otherwise go stale after a phone lock.
 */
export function subscribeToInvites(roomId, onChange) {
  let channel = null;

  function subscribe() {
    channel = sb
      .channel(`game_invites:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites', filter: `room_id=eq.${roomId}` }, onChange)
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
