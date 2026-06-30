# Session-based Highscore UX — Design Spec (v2)

**Date:** 2026-06-30
**Project:** pugBangerFiesta3D
**Status:** Approved design, revised after design-review validation (UX-flow, visual/interaction, interaction-logic agents)

> **v2 changes:** folds in three parallel design reviews. Major revisions: the game-over card is now one fixed-geometry layout with a single swappable status slot (not three layouts); the first-run name entry stays in the existing submit slot rather than displacing the score hero; a celebration hierarchy separates global-record from session-best; `sessionBest` re-baselines on a post-round rename; the auto-save effect gets a one-shot guard. Items needing final confirmation are tagged **⚠ CONFIRM**.

## Problem

The current game-over flow loses scores and creates friction:

1. **Players miss the submit step.** The name input + "Submit" button sit *below* the mini-leaderboard, a two-step manual action (type, then click) that is easy to overlook, so good runs never reach the board.
2. **Replay re-prompts every round.** Leaving `gameOver` resets `submitState` to `idle` ([Overlay.tsx:376-384](../../../src/game/Overlay.tsx#L376-L384)); the explicit submit must be repeated each round.
3. **No identity on the menu.** Players see neither who they are nor their own best.

## Goal

Type a name **once per session**; after that the game **automatically protects the player's best run** and never forces a re-submit. Players can rename themselves mid-session (e.g. a phone passed between friends), and the rename relabels the existing board row rather than creating a new one.

## Backend reality (read first)

Writes are **server-only**. Each round calls `startSession()` to fetch a **single-use token** ([useLeaderboard.ts:48-56](../../../src/game/useLeaderboard.ts#L48-L56)); `submit()` posts `{token, name, score}` to `/api/submit-score`, then nulls the token ([useLeaderboard.ts:61-90](../../../src/game/useLeaderboard.ts#L61-L90)). RLS denies direct client writes. This is actively being built in a **parallel workstream** and is mostly out of scope here, but two facts constrain the client design and one is an open dependency:

- **One token per round, consumed on first successful submit.** Each new round refreshes it via `startSession`. → Any given game-over can write **at most once** (auto-save *or* manual save, never both — they are mutually exclusive states, so this is fine). → A double-firing auto-save would hit `!token` and surface a spurious "No active game session". The one-shot guard below prevents this.
- **⚠ CONFIRM (parallel workstream):** Rename writes too, so it needs a **server endpoint** (`/api/rename-score` or similar) and an **authorization story** — the round token is already consumed at submit time, so rename has no token to present. How rename is authorized server-side is an open question owned by the backend workstream. The client contract here: `rename(rowId, newName) → ok | error`.
- **⚠ CONFIRM (parallel workstream):** the submit endpoint's dedupe should return the **freshly-inserted row's id** (not the earliest matching `name+score` row), otherwise `submittedEntryId` can point at a *different player's* row and a later rename would clobber it.

## Persistence model

All state is `sessionStorage` only — nothing persists across browser sessions (explicit decision).

| Key | Status | Purpose |
| --- | --- | --- |
| `pug-banger-fiesta-player-name` | exists | The session's chosen player name |
| `pug-banger-fiesta-session-best` | **new** | Highest score **successfully saved** this session |
| `pug-banger-fiesta-session-best-entry` | **new** | Row id of the session's best saved run (rename + highlight target) |

`sessionBest` advances **only on a successful save**, so a failed save is retried by the next qualifying run.

## Two "best" concepts → one celebration hierarchy

Kept distinct, and the visual treatment is **tiered so two win-signals never stack**:

- **Global record** — `score > leaderboardTop`. Keeps the existing **gold pill** banner ("NEW RECORD — mopsí král"). The gold pill is reserved for this and nothing else.
- **Session best** — `score > sessionBest`. Triggers auto-save and a **quieter** confirmation (inline checkmark + a one-shot pulse on the player's leaderboard row). Copy reads "your new best!" not "session best" (less jargon). When a global record is also showing, the session-best line is suppressed.

## Game-over card — one geometry, three states

**Layout constraint (from visual review):** above 460px `.res` is a 2-column CSS grid — left column stacks head → stats → status, the leaderboard fills the full-height right column, actions span the bottom. The three states do **not** restack a vertical list; they swap content inside a single slot.

**The fix:** keep `score / stats / leaderboard / actions` **pinned** across all states. Introduce **one status slot** in the left column (where `.res-submit` lives today) with a `min-height` sized to the tallest variant, so the card never resizes between states or replays. The score (`.res-score-num`) remains the unambiguous hero — the name entry is **not** moved above it.

### State A — First save of the session (`no session name && score > 0`)
> Trigger is evaluated **every** game-over, not just the literal first round — so a player who scored 0 on their first run still gets State A (not an empty-name auto-save) on their first positive run.

- The status slot renders a **visually promoted** entry form (bordered/elevated `.res-submit.is-primary`, eyebrow "save your run", input **autofocused**, **Enter submits**, button styled like `.res-btn-prim`).
- **Mobile:** the Save button is a large primary tap target — discoverability does not depend on Enter (autofocus often won't raise the soft keyboard).
- "Again"/"Menu" stay clickable but visually secondary. If the player leaves with score > 0 unsaved, show a one-line non-blocking nudge ("save your run first?") — we don't hard-trap them. **⚠ CONFIRM** this nudge is wanted.
- On success: store name, set `sessionBest = score`, set `submittedEntryId` + `sessionBestEntryId`.

### State B — Returning player, new session best (`name known && score > sessionBest`)
- **Auto-saved** on entering `gameOver`, guarded (see Auto-save logic).
- Confirmation is **action-first, not alarming**: "Saved to the board as **{name}** · Rename →" with the rename control inline and obvious (handles the shared-phone case as a visible, easy correction rather than a hidden one). The confirmation **persists** (not a decaying-only animation).
- Motion: sequence *after* the card's `panelIn` entrance settles (~570ms total) — checkmark `scale 0.6→1 / opacity 0→1` over 180ms on the card's spring curve, then at +120ms a 600ms one-shot pulse on the player's row (the row pulse is the real "you landed here" signal). All gated behind `prefers-reduced-motion` (currently no keyframe respects it — add it).
- On success: bump `sessionBest = score`, set `submittedEntryId` + `sessionBestEntryId`.

### State C — Returning player, not a new best (`name known && score <= sessionBest`)
- **No auto-save** (your explicit rule: lower runs save only on manual trigger). Accepted trade-off: because the session best is already on the board, the player's *best* is never lost — only a sub-best run can be dropped if they replay without saving.
- Status slot shows "your best this session: {sessionBest}" + a **prominent** "save this run anyway" button (primary weight within the slot, not a faint link) → neutral checkmark "saved ✓" on click (**not** the gold pill — wrong tone for a non-best save).
- The shared `.name-edit` affordance is present.

## Main menu

Player identity moves **out of the overloaded footer** into its own element near the Start button:

> `.menu-identity`: Playing as **{name}** · your best: **{sessionBest}** · ✎ change name

The footer keeps only passive app metadata (controls hint, global best, credit). Before any name is set, the identity line is hidden and the menu is unchanged.

## Rename behavior

Rename **updates an existing board row in place** — never forks a new row. One shared `.name-edit` affordance (a real `<button>` with hover/`focus-visible`, the inline editor reusing `.res-submit-input`) used identically in States B/C and on the menu. Client calls `rename(rowId, newName)`; on failure the displayed label reverts and a small inline error shows (same treatment as a failed submit).

Targeting + `sessionBest` rules:

- **Post-round rename** (the State B/C control — the handover case): renames **this game-over's row** (`submittedEntryId`) and **re-baselines `sessionBest` to that row's score**. **⚠ CONFIRM — this reverses v1's "rename never touches sessionBest".** Rationale: when a friend takes the phone and renames, the new identity must not inherit the previous player's `sessionBest`, or every genuine best they score reads as State C and never auto-saves. Re-baselining to the just-saved run's score fixes this and also leaves a same-player typo-fix unchanged (the targeted row *is* their best).
- **Menu rename** (typo-fix case): renames `sessionBestEntryId`, leaves `sessionBest` unchanged. If nothing has been saved yet this session, it only sets the name for future saves — copy disambiguates: "change name (applies to your next run)".

## Edge cases

- `score === 0` → no save offered; State A trigger keyed on `score > 0` so a zero first-run doesn't strand the name as empty.
- Leaderboard **highlight follows `sessionBestEntryId`** (the best row), so "your best this session: N" agrees with the highlighted row even after a lower manual save.
- Multiple saved rows in one session (best + a manual save-anyway): post-round rename targets the current game-over's row; the menu rename targets the best row. Documented, accepted.
- Changing the name does not orphan the identity line: it always reflects the current name + `sessionBest`.

## Auto-save logic (State B) — correctness

- Fire from a single effect that depends on **`[mode]`** only; read `score`, `sessionBest`, `name` fresh inside.
- Gate on a **one-shot ref keyed to the round id**, lifted to `App.tsx` (which owns the round lifecycle), so an Overlay remount while `mode === 'gameOver'` cannot re-fire it. Flip the guard / `submitState → 'submitting'` **synchronously before the await** (mirrors `handleSubmit`).
- Route the auto-save through the **existing `onSubmitScore` wiring** ([App.tsx:704-708](../../../src/App.tsx#L704-L708)) so `submittedEntryId` (and `sessionBestEntryId`) are set from the returned entry — otherwise the State B highlight and later rename target both break.

## Implementation surface

- **`src/App.tsx`** — own `playerName`, `sessionBest`, `sessionBestEntryId` (sessionStorage); the per-round auto-save guard ref; on successful save bump `sessionBest`/entry ids; thread state + `onRename` into `Overlay`.
- **`src/game/Overlay.tsx`** — single status-slot rendering for States A/B/C; the `[mode]` auto-save effect; reuse `submitState`; the shared `.name-edit` affordance; the menu identity line.
- **`src/game/useLeaderboard.ts`** — add `rename(rowId, newName)` calling the server endpoint (parallel-workstream dependency).
- **`src/game/i18n.ts`** — new strings (cs + en + kid-friendly spreads): `enterNamePrompt`, `savedNewBest` ("your new best!"), `savedToBoard`, `saveAnyway`, `saved`, `sessionBestLabel`, `playingAs`, `changeName`, `changeNameFuture`, `renameError`, `saveFirstNudge`.
- **`src/App.css`** — fixed-height status slot; tiered celebration (gold pill unchanged for record; quiet checkmark + row-pulse keyframes for session best); `prefers-reduced-motion` guards; `.menu-identity`; shared `.name-edit`.

## Out of scope

- Cross-session / persistent identity (explicitly `sessionStorage` only).
- The leaderboard write-path, token issuance, RLS, the rename endpoint, and its authorization (parallel workstream — flagged above as **⚠ CONFIRM** dependencies).
- Account systems, auth, per-player aggregation on the board.
- Auto-saving sub-best runs (deliberately rejected — keeps your "manual-only for lower scores" rule).
