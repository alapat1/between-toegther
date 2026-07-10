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
