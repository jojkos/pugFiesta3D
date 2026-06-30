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
