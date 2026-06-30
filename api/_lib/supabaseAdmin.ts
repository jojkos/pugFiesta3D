import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client built with the SECRET key (sb_secret_…, the
 * modern replacement for the legacy service_role key). It bypasses Row-Level
 * Security, so this is the only thing allowed to INSERT into the leaderboard
 * once RLS denies anon writes. NEVER import this from browser code and NEVER
 * expose SUPABASE_SECRET_KEY with a VITE_ prefix.
 */
let cached: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY are not set');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
