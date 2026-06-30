# Session-based Highscore UX — Design Spec

**Date:** 2026-06-30
**Project:** pugBangerFiesta3D
**Status:** Approved design, pre-implementation

## Problem

The current game-over flow loses scores and creates friction:

1. **Players miss the submit step.** On game over, the name input + "Submit" button sit *below* the mini-leaderboard and *above* the primary "Again"/"Menu" buttons. It is a two-step manual action (type, then click) that is easy to overlook, so good runs never reach the board.
2. **Replay re-prompts every round.** Leaving `gameOver` resets `submitState` to `idle` ([Overlay.tsx:376-384](../../../src/game/Overlay.tsx#L376-L384)). The name is pre-filled from `sessionStorage`, but the explicit submit must be repeated each round.
3. **No identity on the menu.** The menu shows only the global top score; players see neither who they are nor their own best.

## Goal

Type a name **once per session**; after that the game **automatically protects the player's best run** and never forces a re-submit. Players can rename themselves mid-session (e.g. a phone passed between friends), and the rename relabels the existing board row rather than creating a new one.

## Persistence model

All state is `sessionStorage` only — nothing persists across browser sessions (explicit decision).

| Key | Status | Purpose |
| --- | --- | --- |
| `pug-banger-fiesta-player-name` | exists | The session's chosen player name |
| `pug-banger-fiesta-session-best` | **new** | Highest score **successfully saved** to the board this session |

`sessionBest` advances **only on a successful save**, so a failed save is retried by the next qualifying run.

## Two distinct "best" concepts

These are kept separate and may co-occur:

- **Global record** — `score > leaderboardTop`. Keeps today's celebratory banner ("NEW RECORD — mopsí král").
- **Session best** — `score > sessionBest`. The new trigger for **auto-save** and the "saved" indication.

## Game-over screen — three states

### State A — First score of the session (no name yet, `score > 0`)

The name entry becomes the **prominent primary action at the top** of the result card (moved above the stats — no longer buried below the leaderboard):

- Large "save your run" block.
- Input is **autofocused**; **Enter submits**.
- Save button is styled as the main CTA.
- "Again" / "Menu" remain clickable (we do not trap the player) but are visually secondary.

This is the only state with an explicit type-and-submit, and it is now unmissable. On successful save: store the name, set `sessionBest = score`, set `submittedEntryId`.

### State B — Returning player, new session best (`name known && score > sessionBest`)

- **Auto-saved silently and immediately** on entering `gameOver` (no input, no button).
- Animated confirmation: a checkmark that pops/scales in with "★ Saved as **{name}** — new session best!".
- The player's row pulses/highlights in the mini-leaderboard.
- A small **"not you? change name"** link is present for the shared-device case.
- On success: bump `sessionBest = score`, set `submittedEntryId`.

### State C — Returning player, not a new best (`name known && score <= sessionBest`)

- **No auto-save** (lower scores save only on manual trigger).
- Shows "Your best this session: {sessionBest}".
- A **secondary** "save this run anyway" button → "Saved ✓" on click (sets `submittedEntryId` to the new row; `sessionBest` unchanged).
- The "playing as {name} · change name" affordance is present.

## Main menu

When a session name exists, the footer shows an identity line:

> Playing as **{name}** · your best: **{sessionBest}** · ✎ change name

Before any name is set (fresh session), the menu is unchanged from today (global top score only).

## Rename behavior

Rename **updates the existing board row in place** — it never forks a new row under the new name.

- A new `rename(id, newName)` function is added to `useLeaderboard`, mirroring the existing direct-client write pattern ([useLeaderboard.ts:44](../../../src/game/useLeaderboard.ts#L44)). It issues an `UPDATE` on the row's `player_name`.
- **After a round** (a `submittedEntryId` exists): the "change name" / "not you?" control renames *that row* (A → B) **and** updates the stored session name so the next round saves under B.
- **On the menu, mid-session:** if a `submittedEntryId` from this session still exists, change-name renames that row **and** updates the stored name; if nothing has been saved yet, it only sets the name for future saves.
- `sessionBest` is unchanged on rename (it is the session's best run regardless of the label).
- On rename failure, the UI reverts the displayed label and shows a small inline error rather than implying success.

> **Backend note:** the RLS / write-path concern is handled in a separate parallel workstream and is out of scope for this spec.

## Edge cases

- `score === 0` → no save offered (unchanged from today).
- Auto-save dedupes via the existing same-name+score guard in [useLeaderboard.ts:54-66](../../../src/game/useLeaderboard.ts#L54-L66).
- If a session saved more than one row (auto-saved best **plus** a manual "save anyway"), `submittedEntryId` points to the most recent; rename relabels only that row — earlier rows keep the old name. Accepted limitation.
- Changing the name does not reset `sessionBest`.

## Implementation surface

- **`src/App.tsx`** — own `playerName` + `sessionBest` state (sessionStorage); on a successful save bump `sessionBest = max(sessionBest, score)`; thread `playerName`, `sessionBest`, `submittedEntryId`, `onRename` into `Overlay`.
- **`src/game/Overlay.tsx`** — a `useEffect` that, on entering `gameOver` with a known name and a new session best, fires the save automatically and flags the auto-saved celebration; render states A / B / C; reuse the existing `submitState` machine; add the change-name affordance (post-round) and wire menu identity line.
- **`src/game/useLeaderboard.ts`** — add `rename(id, newName)`.
- **`src/game/i18n.ts`** — new strings (cs + en + kid-friendly spreads): `enterNamePrompt`, `savedNewBest`, `saveAnyway`, `saved`, `sessionBestLabel`, `playingAs`, `changeName`, `renameError`.
- **`src/App.css`** — keyframes for the save-confirmation pop + leaderboard row pulse, in the existing brand style.

## Out of scope

- Cross-session / persistent identity (explicitly `sessionStorage` only).
- The leaderboard write-path / RLS hardening (separate workstream).
- Account systems, auth, or per-player aggregation on the board.
