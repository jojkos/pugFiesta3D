/**
 * Shared score bounds used by BOTH the browser and the server-side score
 * endpoint (api/submit-score.ts), so the trusted ceiling lives in one place.
 *
 * The inputs mirror src/game/config.ts (ROUND_DURATION, LATCH_DURATION,
 * MAX_SIMULTANEOUS_LATCHES, GOAL_SCORE_MULTIPLIER) but are re-declared as plain
 * literals here on purpose: config.ts imports three.js, and the Vercel function
 * must not drag the 3D engine into its bundle just to read four numbers. Keep
 * these in sync with config.ts if the gameplay constants change.
 */
export const ROUND_DURATION_S = 45;
const LATCH_DURATION_S = 0.64;
const MAX_CHAIN = 3;
const GOAL_MULT = 2;

// A latch animation occupies the player for LATCH_DURATION_S, so the realistic
// upper bound is roughly one max-value latch per that interval across the round:
//   ceil(45 / 0.64) ≈ 71 latches × 3 (chain) × 2 (goal) ≈ 426.
// SAFETY_FACTOR leaves generous headroom for timing/overlap so no legitimate
// score is ever rejected, while still being finite (today's 9999 clamp is
// meaningless). Tune if scoring rules change.
const SAFETY_FACTOR = 1.4;

export const MAX_PLAUSIBLE_SCORE = Math.ceil(
  Math.ceil(ROUND_DURATION_S / LATCH_DURATION_S) * MAX_CHAIN * GOAL_MULT * SAFETY_FACTOR,
);
