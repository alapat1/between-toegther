// Generalizes the retry-on-conflict pattern that castThemeVote() in the old
// index.html had to hand-roll. Every concurrent write in the app should go
// through this instead of a bare .update() — see sync-root-cause-analysis.md
// S3 (unguarded TOD writes) and S4 (silent version-guard failures): a rejected
// guard used to just make the tap look broken. Here a rejection always
// refetches and retries against the fresh row instead of silently no-op'ing.
import { sb } from './supabase.js';

/**
 * @param {string} table
 * @param {string} id
 * @param {(current: any) => object} computeUpdate - given the current row,
 *   returns the partial update to apply. Called again on every retry with
 *   the freshly refetched row, so it must be pure/idempotent.
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=4]
 */
export async function guardedWrite(table, id, computeUpdate, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 4;

  let current = opts.startingRow ?? (await fetchRow(table, id));
  if (!current) return { ok: false, reason: 'not-found' };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const update = computeUpdate(current);
    if (update == null) return { ok: false, reason: 'aborted' };

    const { data, error } = await sb
      .from(table)
      .update(update)
      .eq('id', id)
      .eq('version', current.version)
      .select();

    if (!error && data && data.length > 0) {
      return { ok: true, row: data[0] };
    }

    // Version mismatch (or a transient error) — refetch and retry against
    // the real current state rather than giving up silently.
    current = await fetchRow(table, id);
    if (!current) return { ok: false, reason: 'not-found' };
  }

  return { ok: false, reason: 'exhausted-retries' };
}

async function fetchRow(table, id) {
  const { data, error } = await sb.from(table).select('*').eq('id', id).single();
  if (error) return null;
  return data;
}
