import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminSupabase } from './_lib/supabaseAdmin';
import { verifyToken } from './_lib/scoreToken';
import { sanitizeName } from '../src/game/leaderboardUtils';
import { MAX_PLAUSIBLE_SCORE, ROUND_DURATION_S } from '../src/game/scoreLimits';

const TABLE = 'leaderboard';

// A real round lasts ROUND_DURATION_S; require most of it to have elapsed
// before a token can be redeemed (blocks instant-submit bots), and expire
// tokens after 15 minutes.
const MIN_ELAPSED_MS = ROUND_DURATION_S * 0.8 * 1000;
const MAX_AGE_MS = 15 * 60 * 1000;

/**
 * POST /api/submit-score — the ONLY path allowed to write the leaderboard.
 *
 * Body: { token, name, score }. Rejects with 4xx on any failed check:
 *  - invalid/forged token signature
 *  - token redeemed too soon or expired
 *  - unknown or already-consumed session (single-use)
 *  - non-integer or implausible score
 * On success it sanitizes the name server-side, consumes the session, and
 * inserts via the service-role client (which bypasses RLS).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = (req.body ?? {}) as { token?: unknown; name?: unknown; score?: unknown };
  const token = typeof body.token === 'string' ? body.token : '';
  const rawName = typeof body.name === 'string' ? body.name : '';
  const rawScore = body.score;

  // 1. Token signature.
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // 2. Timing window (uses the tamper-proof signed issue time).
  const age = Date.now() - payload.iat;
  if (!Number.isFinite(age) || age < MIN_ELAPSED_MS || age > MAX_AGE_MS) {
    res.status(403).json({ error: 'Token expired or submitted too soon' });
    return;
  }

  // 3. Score plausibility.
  if (typeof rawScore !== 'number' || !Number.isFinite(rawScore)) {
    res.status(400).json({ error: 'Invalid score' });
    return;
  }
  const score = Math.floor(rawScore);
  if (score < 0 || score > MAX_PLAUSIBLE_SCORE) {
    res.status(400).json({ error: 'Implausible score' });
    return;
  }

  const name = sanitizeName(rawName);

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  // 4. Atomically consume the single-use session. The `.is('consumed_at', null)`
  // predicate means a racing double-submit only lets ONE request through.
  const { data: consumed, error: consumeErr } = await supabase
    .from('score_sessions')
    .update({ consumed_at: new Date().toISOString() })
    .eq('nonce', payload.nonce)
    .is('consumed_at', null)
    .select('nonce')
    .maybeSingle();
  if (consumeErr) {
    res.status(500).json({ error: 'Session check failed' });
    return;
  }
  if (!consumed) {
    res.status(409).json({ error: 'Session unknown or already used' });
    return;
  }

  // 5. Dedup: same name + score already on the board → return the earliest.
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id, player_name, score, created_at')
    .eq('player_name', name)
    .eq('score', score)
    .order('created_at', { ascending: true })
    .limit(1);
  if (existing && existing.length > 0) {
    res.status(200).json({ entry: existing[0] });
    return;
  }

  // 6. Insert.
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ player_name: name, score })
    .select('id, player_name, score, created_at')
    .single();
  if (error) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }

  res.status(200).json({ entry: data });
}
