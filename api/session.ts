import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getAdminSupabase } from './_lib/supabaseAdmin.js';
import { signToken } from './_lib/scoreToken.js';

/**
 * POST /api/session — issue a start-of-game token.
 *
 * Called by the client when a round begins. Creates a single-use score_sessions
 * row and returns a signed token carrying its nonce + issue time. The token is
 * presented later to /api/submit-score, which is the only path allowed to write
 * the leaderboard.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const supabase = getAdminSupabase();
    const nonce = randomUUID();
    const { error } = await supabase.from('score_sessions').insert({ nonce });
    if (error) {
      res.status(500).json({ error: 'Could not start session' });
      return;
    }
    const token = signToken({ nonce, iat: Date.now() });
    res.status(200).json({ token });
  } catch {
    res.status(500).json({ error: 'Server misconfigured' });
  }
}
