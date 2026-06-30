import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type LeaderboardEntry } from '../lib/supabase';

const TABLE = 'leaderboard';

export type LeaderboardState = {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Fetch a fresh single-use session token; call when a round starts. */
  startSession: () => Promise<void>;
  submit: (input: { name: string; score: number }) => Promise<LeaderboardEntry | null>;
};

export function useLeaderboard(topN?: number, refreshKey = 0): LeaderboardState {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Session token from /api/session, held in a ref so it never triggers a
  // re-render and is read fresh at submit time.
  const tokenRef = useRef<string | null>(null);

  // Reads stay direct from the browser (anon key, read-only under RLS).
  const refresh = useCallback(async () => {
    const client = getSupabase();
    if (!client) {
      setError('Supabase not configured');
      return;
    }
    setLoading(true);
    setError(null);
    let query = client
      .from(TABLE)
      .select('id, player_name, score, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true });
    if (topN !== undefined) query = query.limit(topN);
    const { data, error: err } = await query;
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEntries((data ?? []) as LeaderboardEntry[]);
  }, [topN]);

  const startSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session', { method: 'POST' });
      const data = res.ok ? await res.json().catch(() => null) : null;
      tokenRef.current = typeof data?.token === 'string' ? data.token : null;
    } catch {
      tokenRef.current = null;
    }
  }, []);

  // Writes go through the trusted endpoint — the browser can no longer insert
  // directly (RLS denies it). The server validates the token, the elapsed time,
  // and the score before writing.
  const submit = useCallback<LeaderboardState['submit']>(
    async ({ name, score }) => {
      const token = tokenRef.current;
      if (!token) {
        setError('No active game session');
        return null;
      }
      setError(null);
      try {
        const res = await fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, name, score }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'Could not submit score');
          return null;
        }
        const { entry } = await res.json();
        tokenRef.current = null; // single-use; force a new session next round
        await refresh();
        return (entry ?? null) as LeaderboardEntry | null;
      } catch {
        setError('Network error submitting score');
        return null;
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { entries, loading, error, refresh, startSession, submit };
}
