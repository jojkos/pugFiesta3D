import {
  FIELD_HALF_X,
  GOAL_LINE_THRESHOLD,
  GOAL_SCORE_MULTIPLIER,
  GOAL_WIDTH,
} from './config';

/**
 * Points awarded for a single latch event.
 *
 * The latch model is "splash-grab": first contact triggers one onTag call with
 * the final chain size (1 = solo, 2 = trojka, 3 = grupáč). Score scales with
 * chain size so a multi-pug grab is properly rewarded, and a goal-mouth latch
 * doubles the per-pug payout.
 */
export function computeLatchPoints(chainSize: number, inGoal: boolean): number {
  return chainSize * (inGoal ? GOAL_SCORE_MULTIPLIER : 1);
}

/**
 * Whether an NPC's position counts as "inside the goal mouth" — i.e. close
 * enough to the goal line and within the goal width, so latching it should
 * count as a goal.
 *
 * Both player and NPCs are clamped to ±FIELD_HALF_X, so "behind the line" is
 * unreachable; the threshold absorbs the small distance pugs sit shy of the
 * wall while fleeing.
 */
export function isNpcInGoalMouth(npcX: number, npcZ: number): boolean {
  return (
    Math.abs(npcX) >= FIELD_HALF_X - GOAL_LINE_THRESHOLD &&
    Math.abs(npcZ) <= GOAL_WIDTH / 2
  );
}
