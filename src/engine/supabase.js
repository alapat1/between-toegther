// Framework-independent — same project as the live single-file app.
// Ported as-is from index.html so both builds point at the same backend
// during the parallel-run period (old build stays live until this passes
// a full two-phone playthrough, per roadmap.md).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lnjqmsczeqmitztxlpli.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NUpbncoR_Mj0Gyq7K-xobQ_nezLy76a';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, storageKey: 'bt-auth' }
});
