import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminSupabase } from './_lib/supabaseAdmin.js';

/**
 * GET /api/keepalive — daily cron ping so Supabase doesn't pause the project.
 *
 * Supabase pauses Free-plan projects that see too few *user queries to the
 * database* over a rolling 7-day window. Static traffic to this site doesn't
 * count and neither does opening the dashboard, so we issue one real SELECT
 * against `leaderboard` per day. Scheduled from vercel.json; Vercel signs cron
 * invocations with CRON_SECRET, which is all that guards the route.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Fail closed: if the secret is missing the template literal would compare
  // against the string "Bearer undefined", which a caller can simply send.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).end();
    return;
  }

  try {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('leaderboard').select('id').limit(1);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ ok: true, at: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Server misconfigured' });
  }
}
