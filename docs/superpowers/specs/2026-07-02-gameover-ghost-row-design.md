# Game-Over "Ghost Row" High-Score Redesign

**Goal:** Make saving a run to the leaderboard motivating and self-explanatory by
moving the submit UI *into* the leaderboard at the player's prospective rank,
with tiered celebration — while keeping today's manual, player-controlled
submit semantics (no auto-save, no identity, no rename). Plus three bug fixes.

## Constraints

- Manual submit only. Saving stays optional; the player must be able to leave
  without saving (one-shot nudge, second click always proceeds).
- Player name persists in `sessionStorage` key `pug-banger-fiesta-player-name`.
- No new backend endpoints, no schema changes. `/api/submit-score` stays the
  only write path (single-use HMAC token).
- Both languages (cs, en) get full copy; cs is primary.
- Pure logic gets Vitest unit tests (repo convention: logic-only tests).

## 1. Prospective rank (pure logic)

`leaderboardUtils.ts` gains:

```ts
/** 1-based rank a new run would take on the board (ties rank below existing
 *  equal scores, matching the server's `score desc, created_at asc` order). */
export function prospectiveRank(entries: ReadonlyArray<{ score: number }>, score: number): number {
  return entries.filter((e) => e.score >= score).length + 1;
}
```

Tests: empty board → 1; beats all → 1; tie with existing → below it; lower
than all → last+1.

## 2. Ghost row (replaces the submit form)

When `mode === 'gameOver' && score > 0 && submitState !== 'done'`, the
`MiniLeaderboard` renders a **ghost row** spliced at index
`prospectiveRank - 1`: rank badge (medal for 1–3), inline name input
(prefilled from sessionStorage), save button. Pulsing dashed accent border.
The old `.res-submit` form under the stats is removed.

- Submit semantics identical to today: whitespace-only rejected client-side,
  `sanitizeName`, name persisted to sessionStorage, token-gated POST.
- `submitting`: input+button disabled, button shows the submitting label.
- `error`: inline error line inside the ghost row + button becomes Retry.
- `done`: list refreshes; real row appears with existing `.you` highlight +
  scrollIntoView; a "Saved ✓" pill (reviving `.res-submit-done`) renders in
  the left column where the form used to be.
- Ghost row scrolls into view on mount (same mechanism as the `.you` row).
- Empty board: ghost row alone at #1; the "empty" message is suppressed.
- `MiniLeaderboard` API: new optional `ghost` prop carrying
  `{ rank, name, onNameChange, onSubmit, state, strings }`; `Leaderboard`
  (full menu modal) is unchanged.

## 3. Tiered celebration

Driven by `prospectiveRank` (before save) / actual rank (after save):

| Tier | Condition | Treatment |
|------|-----------|-----------|
| 1 | rank === 1 | gold pill (existing `is-best` style) + small CSS confetti burst inside the card |
| 2 | rank 2–3 | medal pill "Top 3 run!" |
| 3 | rank 4–10 | "Top 10!" message |
| 4 | otherwise | existing consolation quip |

Confetti is a self-contained CSS animation scoped to the card (the 3D
confetti canvas sits behind the modal backdrop and would be invisible).
Tier selection is a pure function with unit tests.

## 4. Score count-up

`res-score-num` animates 0 → score over ~800 ms via rAF; skipped when
`prefers-reduced-motion: reduce`.

## 5. Rank stat replaces Pace

Second stat tile shows `#N` (prospective; actual after save). `pace`/
`paceUnit` strings retired.

## 6. Leave-nudge — clearly optional

Semantics unchanged (first guarded click nudges, second always proceeds).
Copy now states optionality explicitly:

- cs: `Skóre nemáš uložené! Klikni znovu, pokud chceš odejít bez uložení.`
- en: `Your score isn't saved! Click again to leave without saving.`

The nudge also scrolls to and focuses the ghost row's name input.

## 7. Bug fixes

1. **Disappearing pug shadow on center logo** (`Environment.tsx` /
   `CenterLogo`): the logo plane uses unlit `meshBasicMaterial`, so it paints
   over the shadowed grass. Fix: `receiveShadow` on the mesh +
   `meshStandardMaterial` (map, transparent, `depthWrite={false}`,
   `roughness={1}`) so it's lit like the grass. Visual tint verified by the
   user.
2. **Dedup returns a stranger's row** (`api/submit-score.ts`): delete the
   `(player_name, score)` early-return; always insert. The single-use token
   already prevents double-submits, and rank/highlight UI requires the
   returned row to be the player's own.
3. **CSS cleanup**: `.res-submit` form styles replaced by ghost-row styles;
   `.res-submit-done` reused for the Saved pill.

## Touched files

`src/game/leaderboardUtils.ts` (+test), `src/game/Leaderboard.tsx`,
`src/game/Overlay.tsx`, `src/game/i18n.ts`, `src/App.css`,
`src/game/Environment.tsx`, `api/submit-score.ts`.

## Verification

`npm run build`, `npm run lint`, `npm test` all clean; user visually checks
the game-over screen and the shadow over the logo on the dev server.
