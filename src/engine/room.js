// Ported from index.html's createRoom()/joinRoom()/loadRoom(). Codes are
// permanent room identity (roadmap.md) — genCode/insert-retry-on-collision
// and the join_room_by_code RPC (locks room SELECT to members/creator,
// fixes the room-hijack hole from 2026-06-20) are carried over as-is.
import { sb } from './supabase.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

function genCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export async function createRoom(userId) {
  let room = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await sb
      .from('rooms')
      .insert({ code, created_by: userId })
      .select()
      .single();
    if (!error) { room = data; break; }
    if (error.code !== '23505') return { ok: false, error };
  }
  if (!room) return { ok: false, error: new Error('could-not-open-room') };

  const { error: mErr } = await sb
    .from('room_members')
    .insert({ room_id: room.id, user_id: userId, role: 'host' });
  if (mErr) return { ok: false, error: mErr };

  return { ok: true, code: room.code };
}

export async function joinRoom(code) {
  const { error } = await sb.rpc('join_room_by_code', { p_code: code });
  if (error) {
    const m = error.message || '';
    const reason = m.includes('room_full') ? 'room-full'
      : m.includes('no_such_room') ? 'no-such-room'
      : 'unknown';
    return { ok: false, reason, error };
  }
  return { ok: true, code };
}

export async function loadRoom(code) {
  const { data: room, error } = await sb
    .from('rooms')
    .select('id, code, created_by, created_at, display_name, seen_prompts')
    .eq('code', code)
    .maybeSingle();
  if (error || !room) return { ok: false, reason: 'room-gone' };

  const { data: members } = await sb
    .from('room_members')
    .select('user_id, role, joined_at')
    .eq('room_id', room.id);

  const ids = (members || []).map((m) => m.user_id);
  let profilesMap = {};
  if (ids.length) {
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids);
    (profs || []).forEach((p) => { profilesMap[p.id] = p.display_name; });
  }

  return {
    ok: true,
    room: {
      ...room,
      members: (members || []).map((m) => ({ ...m, display_name: profilesMap[m.user_id] || '…' }))
    }
  };
}

export function partnerOf(members, userId) {
  return (members || []).find((m) => m.user_id !== userId) || null;
}

export function selfOf(members, userId) {
  return (members || []).find((m) => m.user_id === userId) || null;
}

/**
 * "Codes are permanent identity" (roadmap.md) wasn't actually reflected in
 * the UI — every launch dropped you on the landing screen regardless of
 * whether you already belonged to a space. This makes the room the thing
 * you auto-return to, and demotes the code to an invite/recovery mechanism.
 * Picks the most recently joined room if someone somehow belongs to more
 * than one (multi-space support is a later roadmap item, not this pass).
 */
export async function findMyMostRecentRoomCode(userId) {
  const { data } = await sb
    .from('room_members')
    .select('joined_at, rooms(code)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rooms?.code || null;
}

export async function leaveRoom(roomId, userId) {
  const { error } = await sb
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
  return { ok: !error, error };
}

/**
 * Live presence for a room — the real "are they here" signal, distinct from
 * "has a room_members row" (which is permanent membership). Tracks a status
 * string ('lobby' | 'game' | 'screening') so waiting screens can say "she's
 * in the screening room" instead of a generic dot. Also carries the nudge
 * broadcast — one tap that buzzes the partner's phone.
 *
 * Returns { setStatus, nudge, unsubscribe }. onPeers receives a map of
 * userId -> status for everyone currently present (including self).
 */
export function joinPresence(roomId, userId, initialStatus, onPeers, onNudge) {
  let channel = null;
  let currentStatus = initialStatus;

  function subscribe() {
    channel = sb.channel(`presence:${roomId}`, { config: { presence: { key: userId } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peers = {};
        for (const [key, metas] of Object.entries(state)) {
          peers[key] = metas[0]?.status || 'lobby';
        }
        onPeers(peers);
      })
      .on('broadcast', { event: 'nudge' }, ({ payload }) => {
        if (payload?.to === userId && onNudge) onNudge(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ status: currentStatus });
      });
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

  return {
    setStatus(status) {
      currentStatus = status;
      if (channel) channel.track({ status });
    },
    nudge(partnerId) {
      if (channel) channel.send({ type: 'broadcast', event: 'nudge', payload: { to: partnerId, from: userId } });
    },
    unsubscribe() {
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('online', teardownAndResubscribe);
      if (channel) sb.removeChannel(channel);
    }
  };
}

export async function renameRoom(roomId, displayName) {
  const { error } = await sb.from('rooms').update({ display_name: displayName }).eq('id', roomId);
  return { ok: !error, error };
}

/**
 * Realtime membership changes for a room — the fix for the "host still says
 * waiting for partner even after they joined" bug. Room.svelte previously
 * fetched room_members once on mount and never again, so a partner joining
 * after the host was already sitting on the lobby screen was invisible
 * until a manual reload. Same teardown+resubscribe-on-wake pattern as
 * subscribeToGame (session.js) so this doesn't rot after a phone lock either.
 */
export function subscribeToRoomMembers(roomId, onChange) {
  let channel = null;

  function subscribe() {
    channel = sb
      .channel(`room_members:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, onChange)
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
