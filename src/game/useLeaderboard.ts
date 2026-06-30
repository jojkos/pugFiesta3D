import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type LeaderboardEntry } from '../lib/supabase';
import { postScore, requestSessionToken, renameScore } from './leaderboardApi';

const TABLE = 'leaderboard';

export type LeaderboardState = {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Fetch a fresh single-use session token; call when a round starts. */
  startSession: () => Promise<void>;
  submit: (input: { name: string; score: number }) => Promise<LeaderboardEntry | null>;
  /** Relabel an existing row's player_name. Gated until /api/rename-score ships. */
  rename: (rowId: string, newName: string) => Promise<boolean>;
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
    tokenRef.current = await requestSessionToken(fetch);
  }, []);

  // Writes go through the trusted endpoint — the browser can no longer insert
  // directly (RLS denies it). The server validates the token, the elapsed time,
  // and the score before writing.
  //
  // Note: this deliberately does NOT touch `error` (the read/leaderboard error).
  // Submit failures surface through the return value (null) so the caller can
  // show its own message — otherwise a failed save would blank out the
  // leaderboard, which shares that state.
  const submit = useCallback<LeaderboardState['submit']>(
    async ({ name, score }) => {
      // If the round-start session fetch failed, try once more now so a submit
      // (and any retry) actually fires a request instead of dead-ending on a
      // missing token.
      if (!tokenRef.current) {
        await startSession();
      }
      const token = tokenRef.current;
      if (!token) return null;
      const entry = await postScore(fetch, { token, name, score });
      if (!entry) return null;
      tokenRef.current = null; // single-use; force a new session next round
      await refresh();
      return entry;
    },
    [refresh, startSession],
  );

  const rename = useCallback<LeaderboardState['rename']>(
    async (rowId, newName) => {
      const ok = await renameScore(fetch, { rowId, name: newName });
      if (ok) await refresh();
      return ok;
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { entries, loading, error, refresh, startSession, submit, rename };
}
