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
