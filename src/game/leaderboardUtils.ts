// Must match the DB CHECK constraint on leaderboard.player_name
// (char_length(player_name) <= 15). Keep in sync if that constraint changes.
export const MAX_NAME_LEN = 15;
export const ANONYMOUS_NAME = 'Anonymouse';

/**
 * Clean a player-supplied name before it goes to the leaderboard.
 *
 * - Trims leading and trailing whitespace.
 * - Caps to MAX_NAME_LEN characters.
 * - Falls back to ANONYMOUS_NAME if empty after trimming.
 * - Preserves casing exactly as the user typed it — no lower/uppercase
 *   normalization, no character stripping beyond whitespace at the edges.
 */
export function sanitizeName(raw: string): string {
  return raw.trim().slice(0, MAX_NAME_LEN) || ANONYMOUS_NAME;
}

/**
 * 1-based rank a new run would take on the leaderboard. Ties rank below
 * existing equal scores, matching the server's `score desc, created_at asc`
 * ordering (the new run is always the latest submission).
 */
export function prospectiveRank(
  entries: ReadonlyArray<{ score: number }>,
  score: number,
): number {
  return entries.filter((entry) => entry.score >= score).length + 1;
}

export type CelebrationTier = 'first' | 'top3' | 'top10' | 'none';

/** How loudly the results screen celebrates a run at the given rank. */
export function celebrationTier(rank: number): CelebrationTier {
  if (rank === 1) return 'first';
  if (rank <= 3) return 'top3';
  if (rank <= 10) return 'top10';
  return 'none';
}
