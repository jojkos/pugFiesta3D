import { describe, expect, it } from 'vitest';
import {
  FIELD_HALF_X,
  GOAL_LINE_THRESHOLD,
  GOAL_SCORE_MULTIPLIER,
  GOAL_WIDTH,
} from './config';
import { computeLatchPoints, isNpcInGoalMouth } from './scoring';

describe('computeLatchPoints', () => {
  // The original splash-grab refactor broke chain scoring (everyone got 1 pt
  // regardless of chain size). These tests pin the corrected formula.
  it('awards one point per pug for a solo latch outside the goal', () => {
    expect(computeLatchPoints(1, false)).toBe(1);
  });

  it('awards a point per pug for a trojka (chain of 2)', () => {
    expect(computeLatchPoints(2, false)).toBe(2);
  });

  it('awards a point per pug for a grupáč (chain of 3)', () => {
    expect(computeLatchPoints(3, false)).toBe(3);
  });

  it('multiplies the solo payout when latching in the goal mouth', () => {
    expect(computeLatchPoints(1, true)).toBe(GOAL_SCORE_MULTIPLIER);
  });

  it('multiplies the chain payout when latching in the goal mouth', () => {
    expect(computeLatchPoints(2, true)).toBe(2 * GOAL_SCORE_MULTIPLIER);
    expect(computeLatchPoints(3, true)).toBe(3 * GOAL_SCORE_MULTIPLIER);
  });

  // Defensive: chainSize should always be >= 1 in practice (you can't trigger
  // onTag with zero pugs latched), but the formula handles edge cases
  // gracefully so it doesn't accidentally award negative points or NaN.
  it('returns 0 when no pugs are latched', () => {
    expect(computeLatchPoints(0, false)).toBe(0);
    expect(computeLatchPoints(0, true)).toBe(0);
  });
});

describe('isNpcInGoalMouth', () => {
  const halfGoalWidth = GOAL_WIDTH / 2;
  const justBeforeLine = FIELD_HALF_X - GOAL_LINE_THRESHOLD;

  it('counts a pug parked dead-center on the right goal line', () => {
    expect(isNpcInGoalMouth(FIELD_HALF_X, 0)).toBe(true);
  });

  it('counts a pug parked dead-center on the left goal line', () => {
    expect(isNpcInGoalMouth(-FIELD_HALF_X, 0)).toBe(true);
  });

  it('counts a pug at the goal-line threshold (just shy of the wall)', () => {
    // Exactly at the threshold should qualify (>=, not >).
    expect(isNpcInGoalMouth(justBeforeLine, 0)).toBe(true);
    expect(isNpcInGoalMouth(-justBeforeLine, 0)).toBe(true);
  });

  it('rejects a pug just shy of the threshold', () => {
    expect(isNpcInGoalMouth(justBeforeLine - 0.01, 0)).toBe(false);
    expect(isNpcInGoalMouth(-(justBeforeLine - 0.01), 0)).toBe(false);
  });

  it('rejects a pug at mid-field', () => {
    expect(isNpcInGoalMouth(0, 0)).toBe(false);
    expect(isNpcInGoalMouth(2, 0)).toBe(false);
    expect(isNpcInGoalMouth(-5, 0)).toBe(false);
  });

  it('rejects a pug at the goal line but outside the goal width', () => {
    // At the line but off-axis past the goalposts — should be a regular
    // wall-latch, not a goal.
    expect(isNpcInGoalMouth(FIELD_HALF_X, halfGoalWidth + 0.01)).toBe(false);
    expect(isNpcInGoalMouth(FIELD_HALF_X, -(halfGoalWidth + 0.01))).toBe(false);
  });

  it('counts a pug at the goal-width edge', () => {
    expect(isNpcInGoalMouth(FIELD_HALF_X, halfGoalWidth)).toBe(true);
    expect(isNpcInGoalMouth(FIELD_HALF_X, -halfGoalWidth)).toBe(true);
  });

  it('rejects a pug in the goal area painted on the field but well off the line', () => {
    // The painted semicircle in front of the goal is cosmetic — what matters
    // is the goal mouth itself (line × goal width). A pug 2 units in front of
    // the goal is NOT in the goal even if it's inside the painted area.
    expect(isNpcInGoalMouth(FIELD_HALF_X - 2, 0)).toBe(false);
  });
});
