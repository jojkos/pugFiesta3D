import type { LeaderboardEntry } from '../lib/supabase';

/**
 * Pure network helpers for the score endpoints, split out from useLeaderboard
 * so the request/response handling is unit-testable with a fake fetch (and so
 * the hook stays thin). Both swallow errors and normalize to a simple result:
 * a token / entry on success, null on any failure.
 */
type FetchFn = typeof fetch;

export async function requestSessionToken(fetchFn: FetchFn): Promise<string | null> {
  try {
    const res = await fetchFn('/api/session', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.token === 'string' ? data.token : null;
  } catch {
    return null;
  }
}

export async function postScore(
  fetchFn: FetchFn,
  input: { token: string; name: string; score: number },
): Promise<LeaderboardEntry | null> {
  try {
    const res = await fetchFn('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return (data?.entry ?? null) as LeaderboardEntry | null;
  } catch {
    return null;
  }
}
