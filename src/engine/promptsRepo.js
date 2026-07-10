// Real prompt banks now live in Supabase (`public.prompts`, 1304 rows: 79 WYR
// pairs + 1225 TOD truth/dare entries across casual/playful/romantic/unfiltered
// themes and easy/fun/wild/spicy tiers). This replaces the small hardcoded
// starter set in data/prompts.js — per roadmap.md's architecture note that
// content changes shouldn't require a deploy.
import { sb } from './supabase.js';

// SPIN_SEGMENTS is layout/weighting, not content — stays local.
export { SPIN_SEGMENTS } from '../data/prompts.js';

export const TOD_THEMES = [
  { id: 'casual', name: 'Casual', desc: 'light, fun, nothing too deep' },
  { id: 'playful', name: 'Playful', desc: 'more energy, more laughs' },
  { id: 'romantic', name: 'Romantic', desc: 'intimate, tender' },
  { id: 'unfiltered', name: 'Unfiltered', desc: 'all the way in' }
];

/**
 * Fetch `count` random WYR pairs from Supabase. Returns [{a, b}, ...].
 * WYR rows have theme/tier/type = null (they're not tiered like TOD).
 */
export async function fetchWyrPrompts(count) {
  const { data, error } = await sb
    .from('prompts')
    .select('id, option_a, option_b')
    .eq('game', 'wyr');
  if (error || !data || !data.length) return [];
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((r) => [r.option_a, r.option_b]);
}

/**
 * Fetch one random TOD prompt for a theme/tier/type, excluding any ids
 * already used this session (basic no-repeat — a durable cross-session
 * ledger is still pending per roadmap.md).
 */
export async function fetchTodPrompt(theme, tier, type, excludeIds = []) {
  let query = sb
    .from('prompts')
    .select('id, option_a')
    .eq('game', 'tod')
    .eq('theme', theme)
    .eq('tier', tier)
    .eq('type', type);
  if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  const { data, error } = await query;
  if (error || !data || !data.length) {
    // fall back to the same theme's easy tier if the requested tier is empty
    const fallback = await sb
      .from('prompts')
      .select('id, option_a')
      .eq('game', 'tod')
      .eq('theme', theme)
      .eq('tier', 'easy')
      .eq('type', type);
    const rows = fallback.data || [];
    if (!rows.length) return { id: null, text: '(no prompts available for this theme yet)' };
    const pick = rows[Math.floor(Math.random() * rows.length)];
    return { id: pick.id, text: pick.option_a };
  }
  const pick = data[Math.floor(Math.random() * data.length)];
  return { id: pick.id, text: pick.option_a };
}
