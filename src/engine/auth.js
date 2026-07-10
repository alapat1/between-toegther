// Ported from index.html's #nameContinue handler — anonymous auth + profile
// upsert. No email auth (roadmap.md decision: codes are the permanent
// identity, not accounts).
import { sb } from './supabase.js';

export async function ensureProfile(displayName) {
  let { data: { user } } = await sb.auth.getUser();
  if (!user) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) return { ok: false, error };
    user = data.user;
  }

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .upsert({ id: user.id, display_name: displayName })
    .select('*')
    .single();
  if (pErr) return { ok: false, error: pErr };

  return { ok: true, user, profile };
}
