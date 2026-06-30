/** Which game-over status the results screen is in. */
export type GameOverStatus =
  | 'noSave' // score is 0 — nothing to save
  | 'firstSave' // no session name yet, positive score — prompt for a name (manual)
  | 'autoBest' // named, new session best — auto-saved
  | 'lowerManual'; // named, not a new best — manual "save anyway"

export function decideGameOverStatus(input: {
  hasName: boolean;
  score: number;
  sessionBest: number;
}): GameOverStatus {
  const { hasName, score, sessionBest } = input;
  if (score <= 0) return 'noSave';
  if (!hasName) return 'firstSave';
  if (score > sessionBest) return 'autoBest';
  return 'lowerManual';
}

export function shouldAutoSave(input: {
  hasName: boolean;
  score: number;
  sessionBest: number;
}): boolean {
  return decideGameOverStatus(input) === 'autoBest';
}

/** The new session best after a successful save of `savedScore`. */
export function nextSessionBest(prev: number, savedScore: number): number {
  return Math.max(prev, savedScore);
}

export const PLAYER_NAME_KEY = 'pug-banger-fiesta-player-name';
export const SESSION_BEST_KEY = 'pug-banger-fiesta-session-best';
export const SESSION_BEST_ENTRY_KEY = 'pug-banger-fiesta-session-best-entry';

export type SessionIdentity = {
  playerName: string;
  sessionBest: number;
  sessionBestEntryId: string | null;
};

export function loadSessionIdentity(
  storage: Pick<Storage, 'getItem'>,
): SessionIdentity {
  const rawBest = storage.getItem(SESSION_BEST_KEY);
  const parsedBest = rawBest === null ? 0 : Number.parseInt(rawBest, 10);
  const entryId = storage.getItem(SESSION_BEST_ENTRY_KEY);
  return {
    playerName: storage.getItem(PLAYER_NAME_KEY) ?? '',
    sessionBest: Number.isFinite(parsedBest) ? parsedBest : 0,
    sessionBestEntryId: entryId ? entryId : null,
  };
}

export function persistPlayerName(
  storage: Pick<Storage, 'setItem'>,
  name: string,
): void {
  storage.setItem(PLAYER_NAME_KEY, name);
}

export function persistSessionBest(
  storage: Pick<Storage, 'setItem'>,
  best: number,
  entryId: string | null,
): void {
  storage.setItem(SESSION_BEST_KEY, String(best));
  storage.setItem(SESSION_BEST_ENTRY_KEY, entryId ?? '');
}
