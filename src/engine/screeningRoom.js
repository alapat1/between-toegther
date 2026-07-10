// Screening Room engine: swipes, mutual-match detection, boards, watched
// history. Framework-independent — same pattern as the game engines
// (plain functions over Supabase, no Svelte imports).
import { sb } from './supabase.js';

// ---------- Swipes / matching ----------

/**
 * Records a private swipe. On a "like", checks whether the partner already
 * liked the same title — if so, it's a mutual match: auto-add to the room's
 * default "our list" board and return { matched: true }.
 */
export async function swipe(roomId, userId, candidate, liked, partnerId) {
  const { error } = await sb.from('sr_swipes').upsert(
    {
      room_id: roomId,
      user_id: userId,
      source: candidate.source,
      source_id: candidate.sourceId,
      title: candidate.title,
      poster_url: candidate.posterUrl,
      media_type: candidate.mediaType,
      liked
    },
    { onConflict: 'room_id,user_id,source,source_id' }
  );
  if (error) return { ok: false, error };
  if (!liked || !partnerId) return { ok: true, matched: false };

  const { data: partnerSwipe } = await sb
    .from('sr_swipes')
    .select('liked')
    .eq('room_id', roomId)
    .eq('user_id', partnerId)
    .eq('source', candidate.source)
    .eq('source_id', candidate.sourceId)
    .maybeSingle();

  if (partnerSwipe && partnerSwipe.liked) {
    const board = await getOrCreateDefaultBoard(roomId);
    await addToBoard(board.id, candidate, userId);
    return { ok: true, matched: true };
  }
  return { ok: true, matched: false };
}

/**
 * Undo a just-made swipe (the 3s undo pill). Deletes the swipe row so the
 * title re-enters both partners' decks; if the swipe had completed a mutual
 * match, also removes the auto-added default-board item so the shared list
 * isn't polluted by an accidental like.
 */
export async function undoSwipe(roomId, userId, candidate, hadMatched) {
  const { error } = await sb
    .from('sr_swipes')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('source', candidate.source)
    .eq('source_id', candidate.sourceId);
  if (error) return { ok: false, error };

  if (hadMatched) {
    const { data: board } = await sb
      .from('sr_boards')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_default', true)
      .maybeSingle();
    if (board) {
      await sb
        .from('sr_board_items')
        .delete()
        .eq('board_id', board.id)
        .eq('source', candidate.source)
        .eq('source_id', candidate.sourceId);
    }
  }
  return { ok: true };
}

export async function fetchSwipedIds(roomId, userId) {
  const { data } = await sb.from('sr_swipes').select('source, source_id').eq('room_id', roomId).eq('user_id', userId);
  return new Set((data || []).map((r) => `${r.source}:${r.source_id}`));
}

// ---------- Boards ----------

export async function getOrCreateDefaultBoard(roomId) {
  const { data: existing } = await sb
    .from('sr_boards')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_default', true)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await sb
    .from('sr_boards')
    .insert({ room_id: roomId, name: 'our list', is_default: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listBoards(roomId) {
  const { data } = await sb.from('sr_boards').select('*').eq('room_id', roomId).order('is_default', { ascending: false }).order('created_at');
  return data || [];
}

export async function createBoard(roomId, name) {
  const { data, error } = await sb.from('sr_boards').insert({ room_id: roomId, name }).select().single();
  if (error) return { ok: false, error };
  return { ok: true, board: data };
}

export async function addToBoard(boardId, candidate, userId) {
  const { error } = await sb.from('sr_board_items').upsert(
    {
      board_id: boardId,
      source: candidate.source,
      source_id: candidate.sourceId,
      title: candidate.title,
      poster_url: candidate.posterUrl,
      media_type: candidate.mediaType,
      added_by: userId
    },
    { onConflict: 'board_id,source,source_id' }
  );
  return { ok: !error, error };
}

export async function listBoardItems(boardId) {
  const { data } = await sb.from('sr_board_items').select('*').eq('board_id', boardId).order('added_at', { ascending: false });
  return data || [];
}

// ---------- Watched ----------

export async function markWatched(roomId, candidate, userId) {
  const { error } = await sb.from('sr_watched').upsert(
    {
      room_id: roomId,
      source: candidate.source,
      source_id: candidate.sourceId,
      title: candidate.title,
      poster_url: candidate.posterUrl,
      media_type: candidate.mediaType,
      marked_by: userId
    },
    { onConflict: 'room_id,source,source_id' }
  );
  return { ok: !error, error };
}

export async function unmarkWatched(roomId, candidate) {
  const { error } = await sb
    .from('sr_watched')
    .delete()
    .eq('room_id', roomId)
    .eq('source', candidate.source)
    .eq('source_id', candidate.sourceId);
  return { ok: !error, error };
}

export async function fetchWatchedIds(roomId) {
  const { data } = await sb.from('sr_watched').select('source, source_id').eq('room_id', roomId);
  return new Set((data || []).map((r) => `${r.source}:${r.source_id}`));
}

export async function listWatched(roomId) {
  const { data } = await sb.from('sr_watched').select('*').eq('room_id', roomId).order('watched_at', { ascending: false });
  return data || [];
}

// ---------- Taste profile ----------

export async function getTasteProfile(roomId, userId) {
  const { data } = await sb.from('sr_taste_profiles').select('*').eq('room_id', roomId).eq('user_id', userId).maybeSingle();
  return data;
}

export async function saveTasteProfile(roomId, userId, profile) {
  const { error } = await sb.from('sr_taste_profiles').upsert(
    { room_id: roomId, user_id: userId, updated_at: new Date().toISOString(), ...profile },
    { onConflict: 'room_id,user_id' }
  );
  return { ok: !error, error };
}

export function candidateKey(c) {
  return `${c.source}:${c.sourceId}`;
}
