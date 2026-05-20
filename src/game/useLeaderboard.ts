import { useCallback, useEffect, useState } from 'react';
import { getSupabase, type LeaderboardEntry } from '../lib/supabase';

const TABLE = 'leaderboard';
const MAX_NAME_LEN = 24;
const MAX_SCORE = 9999;

export type LeaderboardState = {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submit: (input: { name: string; score: number }) => Promise<LeaderboardEntry | null>;
};

export function useLeaderboard(topN?: number, refreshKey = 0): LeaderboardState {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const submit = useCallback<LeaderboardState['submit']>(async ({ name, score }) => {
    const client = getSupabase();
    if (!client) {
      setError('Supabase not configured');
      return null;
    }
    const trimmedName = name.trim().slice(0, MAX_NAME_LEN) || 'Anonymouse';
    const safeScore = Number.isFinite(score) ? score : 0;
    const clampedScore = Math.max(0, Math.min(MAX_SCORE, Math.floor(safeScore)));

    // Skip insert if this exact name + score already exists — keeps the
    // earliest record (tie-break favors first to reach the score).
    const { data: existing } = await client
      .from(TABLE)
      .select('id, player_name, score, created_at')
      .eq('player_name', trimmedName)
      .eq('score', clampedScore)
      .order('created_at', { ascending: true })
      .limit(1);
    if (existing && existing.length > 0) {
      await refresh();
      return existing[0];
    }

    const { data, error: err } = await client
      .from(TABLE)
      .insert({ player_name: trimmedName, score: clampedScore })
      .select('id, player_name, score, created_at')
      .single();
    if (err) {
      setError(err.message);
      return null;
    }
    await refresh();
    return data as LeaderboardEntry;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { entries, loading, error, refresh, submit };
}
