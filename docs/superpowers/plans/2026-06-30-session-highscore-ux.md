# Session-based Highscore UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type a name once per session, then have the game auto-save the player's best run, never re-prompt on replay, and surface a session identity on the menu — with a rename affordance whose live row-relabel is gated until the parallel security workstream ships.

**Architecture:** A new pure module (`highscoreSession.ts`) holds the game-over state decision and session-best math (fully unit-tested). `App.tsx` owns the session identity state (`playerName`, `sessionBest`, `sessionBestEntryId`), the per-round auto-save guard, and the auto-save effect. `Overlay.tsx` renders one fixed-geometry game-over card with a single swappable status slot (States A/B/C) and a shared rename affordance. CSS gains a fixed-height status slot, a tiered celebration (gold pill reserved for global record; quiet checkmark + row pulse for session best), `prefers-reduced-motion` guards, a `.menu-identity` line, and a `.name-edit` control.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (pure-logic tests only — no React Testing Library in the project), Supabase client (reads direct; writes server-only via token).

## Global Constraints

- **Persistence is `sessionStorage` only.** Keys: `pug-banger-fiesta-player-name`, `pug-banger-fiesta-session-best`, `pug-banger-fiesta-session-best-entry`. Nothing persists across browser sessions.
- **Writes are server-only and use a single-use token** fetched per round by `startLeaderboardSession()`; `submit()` consumes it. Any one game-over writes at most once (auto OR manual, never both).
- **Auto-save only on a new session best** (`score > sessionBest`). Lower scores save only on a manual button. (Explicit owner decision — do not auto-save sub-best runs.)
- **Celebration hierarchy:** the gold pill (`.res-msg.is-best`, `.res-submit-done`) is reserved for the **global record** only. A session-best save uses a quieter checkmark + leaderboard row pulse.
- **Name sanitation** goes through the existing `sanitizeName` ([leaderboardUtils.ts:13](../../../src/game/leaderboardUtils.ts#L13)); `MAX_NAME_LEN = 24`.
- **i18n:** every new UI string is added to both `cs` and `en` in [i18n.ts](../../../src/game/i18n.ts) (the `en` object is typed `typeof cs`, so omitting a key fails the build). Kid-friendly variants inherit via `...base` spreads — no change needed unless sanitized copy is wanted.
- **Rename live network call is GATED** behind `RENAME_ENABLED = false` until the parallel workstream ships `/api/rename-score` + auth. The local identity update (name + re-baseline) still runs; the remote row relabel is the gated part.
- **No headless/automated browser verification.** UI tasks are verified by running `npm run dev` and observing in a real browser. Run `npm run test:run` and `npm run build` where noted.

---

### Task 1: Pure game-over decision module

**Files:**
- Create: `src/game/highscoreSession.ts`
- Test: `src/game/highscoreSession.test.ts`

**Interfaces:**
- Produces: `type GameOverStatus = 'noSave' | 'firstSave' | 'autoBest' | 'lowerManual'`; `decideGameOverStatus(input: { hasName: boolean; score: number; sessionBest: number }): GameOverStatus`; `shouldAutoSave(input: { hasName: boolean; score: number; sessionBest: number }): boolean`; `nextSessionBest(prev: number, savedScore: number): number`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/game/highscoreSession.test.ts
import { describe, expect, it } from 'vitest';
import {
  decideGameOverStatus,
  shouldAutoSave,
  nextSessionBest,
} from './highscoreSession';

describe('decideGameOverStatus', () => {
  it('returns noSave when score is 0 even without a name', () => {
    expect(decideGameOverStatus({ hasName: false, score: 0, sessionBest: 0 })).toBe('noSave');
  });
  it('returns noSave when score is 0 with a name', () => {
    expect(decideGameOverStatus({ hasName: true, score: 0, sessionBest: 10 })).toBe('noSave');
  });
  it('returns firstSave when there is no name and a positive score', () => {
    expect(decideGameOverStatus({ hasName: false, score: 5, sessionBest: 0 })).toBe('firstSave');
  });
  it('returns autoBest when named and score beats session best', () => {
    expect(decideGameOverStatus({ hasName: true, score: 12, sessionBest: 10 })).toBe('autoBest');
  });
  it('returns lowerManual when named and score ties the session best', () => {
    expect(decideGameOverStatus({ hasName: true, score: 10, sessionBest: 10 })).toBe('lowerManual');
  });
  it('returns lowerManual when named and score is below the session best', () => {
    expect(decideGameOverStatus({ hasName: true, score: 4, sessionBest: 10 })).toBe('lowerManual');
  });
});

describe('shouldAutoSave', () => {
  it('is true only for a named new session best', () => {
    expect(shouldAutoSave({ hasName: true, score: 11, sessionBest: 10 })).toBe(true);
  });
  it('is false for the first (nameless) save', () => {
    expect(shouldAutoSave({ hasName: false, score: 11, sessionBest: 0 })).toBe(false);
  });
  it('is false for a sub-best run', () => {
    expect(shouldAutoSave({ hasName: true, score: 9, sessionBest: 10 })).toBe(false);
  });
  it('is false for a zero score', () => {
    expect(shouldAutoSave({ hasName: true, score: 0, sessionBest: 0 })).toBe(false);
  });
});

describe('nextSessionBest', () => {
  it('keeps the higher of the two', () => {
    expect(nextSessionBest(10, 7)).toBe(10);
    expect(nextSessionBest(10, 14)).toBe(14);
    expect(nextSessionBest(0, 3)).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/highscoreSession.test.ts`
Expected: FAIL — "Cannot find module './highscoreSession'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/game/highscoreSession.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/game/highscoreSession.test.ts`
Expected: PASS — all 13 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/game/highscoreSession.ts src/game/highscoreSession.test.ts
git commit -m "feat(highscore): pure game-over state decision module"
```

---

### Task 2: Session identity storage helpers

**Files:**
- Modify: `src/game/highscoreSession.ts`
- Test: `src/game/highscoreSession.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: constants `PLAYER_NAME_KEY`, `SESSION_BEST_KEY`, `SESSION_BEST_ENTRY_KEY`; `type SessionIdentity = { playerName: string; sessionBest: number; sessionBestEntryId: string | null }`; `loadSessionIdentity(storage: Pick<Storage, 'getItem'>): SessionIdentity`; `persistPlayerName(storage: Pick<Storage, 'setItem'>, name: string): void`; `persistSessionBest(storage: Pick<Storage, 'setItem'>, best: number, entryId: string | null): void`.

- [ ] **Step 1: Write the failing test**

Append to `src/game/highscoreSession.test.ts`:

```typescript
import {
  PLAYER_NAME_KEY,
  SESSION_BEST_KEY,
  SESSION_BEST_ENTRY_KEY,
  loadSessionIdentity,
  persistPlayerName,
  persistSessionBest,
} from './highscoreSession';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

describe('loadSessionIdentity', () => {
  it('returns empty defaults when storage is empty', () => {
    expect(loadSessionIdentity(fakeStorage())).toEqual({
      playerName: '',
      sessionBest: 0,
      sessionBestEntryId: null,
    });
  });
  it('reads a stored identity', () => {
    const s = fakeStorage({
      [PLAYER_NAME_KEY]: 'Mopsík',
      [SESSION_BEST_KEY]: '42',
      [SESSION_BEST_ENTRY_KEY]: 'row-1',
    });
    expect(loadSessionIdentity(s)).toEqual({
      playerName: 'Mopsík',
      sessionBest: 42,
      sessionBestEntryId: 'row-1',
    });
  });
  it('treats a non-numeric stored best as 0', () => {
    const s = fakeStorage({ [SESSION_BEST_KEY]: 'oops' });
    expect(loadSessionIdentity(s).sessionBest).toBe(0);
  });
});

describe('persist helpers', () => {
  it('persistPlayerName writes the name', () => {
    const s = fakeStorage();
    persistPlayerName(s, 'Rex');
    expect(s._map.get(PLAYER_NAME_KEY)).toBe('Rex');
  });
  it('persistSessionBest writes best and entry id', () => {
    const s = fakeStorage();
    persistSessionBest(s, 17, 'row-9');
    expect(s._map.get(SESSION_BEST_KEY)).toBe('17');
    expect(s._map.get(SESSION_BEST_ENTRY_KEY)).toBe('row-9');
  });
  it('persistSessionBest clears the entry id key when null', () => {
    const s = fakeStorage({ [SESSION_BEST_ENTRY_KEY]: 'old' });
    persistSessionBest(s, 17, null);
    expect(s._map.get(SESSION_BEST_ENTRY_KEY)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/highscoreSession.test.ts`
Expected: FAIL — "PLAYER_NAME_KEY is not exported" / undefined.

- [ ] **Step 3: Write minimal implementation**

Append to `src/game/highscoreSession.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/game/highscoreSession.test.ts`
Expected: PASS — all storage assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/game/highscoreSession.ts src/game/highscoreSession.test.ts
git commit -m "feat(highscore): sessionStorage identity helpers"
```

---

### Task 3: i18n strings

**Files:**
- Modify: `src/game/i18n.ts` (the `cs` object `results`/`leaderboard`/`menu` blocks ~lines 16-81; the `en` object equivalents ~lines 145-210)

**Interfaces:**
- Produces (new keys on `Strings`): `results.savedToBoard: (name: string) => string`, `results.sessionBestLabel: (n: number) => string`, `results.saveAnyway: string`, `results.saveFirstNudge: string`, `leaderboard.enterNamePrompt: string`, `menu.playingAs: (name: string) => string`, `menu.yourBest: (n: number) => string`, `menu.changeName: string`, `menu.changeNameFuture: string`, `leaderboard.renameError: string`.

- [ ] **Step 1: Add the Czech strings**

In the `cs` object, add to `results` (after `again`):

```typescript
    savedToBoard: (name: string) => `Uloženo jako ${name}`,
    sessionBestLabel: (n: number) => `Tvůj nejlepší pokus: ${n}`,
    saveAnyway: 'Uložit i tak',
    saveFirstNudge: 'Ulož si nejdřív skóre!',
```

Add to `cs.leaderboard` (after `submitted`):

```typescript
    enterNamePrompt: 'Zapiš se do síně slávy',
    renameError: 'Přejmenování se nezdařilo.',
```

Add to `cs.menu` (after `installed`):

```typescript
    playingAs: (name: string) => `Hraješ jako ${name}`,
    yourBest: (n: number) => `tvůj rekord: ${n}`,
    changeName: 'změnit jméno',
    changeNameFuture: 'změnit jméno (platí pro další kolo)',
```

- [ ] **Step 2: Add the English strings**

In the `en` object, add to `results`:

```typescript
    savedToBoard: (name: string) => `Saved as ${name}`,
    sessionBestLabel: (n: number) => `Your best run: ${n}`,
    saveAnyway: 'Save anyway',
    saveFirstNudge: 'Save your run first!',
```

Add to `en.leaderboard`:

```typescript
    enterNamePrompt: 'Get on the board',
    renameError: 'Rename failed.',
```

Add to `en.menu`:

```typescript
    playingAs: (name: string) => `Playing as ${name}`,
    yourBest: (n: number) => `your best: ${n}`,
    changeName: 'change name',
    changeNameFuture: 'change name (applies next round)',
```

- [ ] **Step 3: Verify the types compile (this is the test for an `en: typeof cs` object)**

Run: `npm run build`
Expected: PASS — `tsc -b` reports no errors. (A missing key in `en` would fail here, which is the guard.)

- [ ] **Step 4: Commit**

```bash
git add src/game/i18n.ts
git commit -m "feat(i18n): strings for session highscore identity + save states"
```

---

### Task 4: App-level identity state, auto-save effect, and prop threading

**Files:**
- Modify: `src/App.tsx` (state near :112-160; `startRound` near :540-560; round-end reset near :511-519; the `<Overlay .../>` props near :640-710)

**Interfaces:**
- Consumes: `decideGameOverStatus`, `shouldAutoSave`, `nextSessionBest`, `loadSessionIdentity`, `persistPlayerName`, `persistSessionBest` (Tasks 1-2); `submitLeaderboard` ([useLeaderboard.ts](../../../src/game/useLeaderboard.ts)).
- Produces (new `Overlay` props consumed in Task 5): `playerName: string`, `sessionBest: number`, `autoSaveStatus: 'idle' | 'saving' | 'done'`, `onRename: (newName: string, source: 'round' | 'menu') => void`. Also re-points `highlightedEntryId` to `sessionBestEntryId ?? submittedEntryId`.

- [ ] **Step 1: Add imports and identity state**

Add to the imports at the top of `src/App.tsx`:

```typescript
import {
  decideGameOverStatus,
  shouldAutoSave,
  nextSessionBest,
  loadSessionIdentity,
  persistPlayerName,
  persistSessionBest,
} from './game/highscoreSession';
```

Immediately after the `const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);` line (:152), add:

```typescript
  const initialIdentity =
    globalThis.window === undefined
      ? { playerName: '', sessionBest: 0, sessionBestEntryId: null as string | null }
      : loadSessionIdentity(globalThis.sessionStorage);
  const [playerName, setPlayerName] = useState(initialIdentity.playerName);
  const [sessionBest, setSessionBest] = useState(initialIdentity.sessionBest);
  const [sessionBestEntryId, setSessionBestEntryId] = useState<string | null>(
    initialIdentity.sessionBestEntryId,
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  // One-shot guard: holds the roundId we already auto-saved, so an Overlay
  // remount while mode === 'gameOver' can't fire the save twice.
  const autoSavedRoundRef = useRef<number | null>(null);
```

- [ ] **Step 2: Reset the auto-save status when a round starts**

In `startRound` (near the `setScore(0);` line ~:553), add:

```typescript
    setAutoSaveStatus('idle');
```

- [ ] **Step 3: Add the auto-save effect**

Add this effect after the round-lifecycle effects (e.g. right after the `ROUND_END_HOLD_MS` effect, ~:460):

```typescript
  // Auto-save a new session best the moment we enter gameOver. Depends only on
  // `mode` — score/sessionBest/playerName are already final by the 1500ms hold.
  // The synchronous ref write is the one-shot guard (mirrors handleSubmit's
  // submitState flip-before-await).
  useEffect(() => {
    if (mode !== 'gameOver') return;
    if (autoSavedRoundRef.current === roundId) return;
    if (!shouldAutoSave({ hasName: playerName !== '', score, sessionBest })) return;
    autoSavedRoundRef.current = roundId;
    setAutoSaveStatus('saving');
    void (async () => {
      const entry = await submitLeaderboard({ name: playerName, score });
      if (entry) {
        setSubmittedEntryId(entry.id);
        setSessionBest((prev) => nextSessionBest(prev, score));
        setSessionBestEntryId(entry.id);
        if (globalThis.window !== undefined) {
          persistSessionBest(globalThis.sessionStorage, score, entry.id);
        }
        setAutoSaveStatus('done');
      } else {
        autoSavedRoundRef.current = null; // allow a retry next qualifying run
        setAutoSaveStatus('idle');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
```

- [ ] **Step 4: Update the manual submit handler and add the rename handler**

Replace the existing `onSubmitScore={...}` prop (:704-708) with:

```typescript
          onSubmitScore={async (name) => {
            if (score <= 0) return;
            const entry = await submitLeaderboard({ name, score });
            if (!entry) return;
            setSubmittedEntryId(entry.id);
            setPlayerName(name);
            if (globalThis.window !== undefined) {
              persistPlayerName(globalThis.sessionStorage, name);
            }
            // First save or a manual save that happens to beat the best
            // re-baselines the session best; a sub-best "save anyway" does not.
            if (score > sessionBest) {
              setSessionBest(score);
              setSessionBestEntryId(entry.id);
              if (globalThis.window !== undefined) {
                persistSessionBest(globalThis.sessionStorage, score, entry.id);
              }
            }
          }}
          onRename={(newName, source) => {
            // `source: 'round'` is the post-round handover — re-baseline the
            // session best to THIS run's score so the new player isn't stuck in
            // the "not a new best" state, and target this run's row.
            // `source: 'menu'` is a typo-fix — name only, target the best row,
            // and leave sessionBest UNCHANGED (menu `score` is stale).
            // The remote row relabel is gated until the rename endpoint ships
            // (added in Task 8).
            setPlayerName(newName);
            if (globalThis.window !== undefined) {
              persistPlayerName(globalThis.sessionStorage, newName);
            }
            const targetId = source === 'round' ? submittedEntryId : sessionBestEntryId;
            if (source === 'round') {
              setSessionBest(score);
              setSessionBestEntryId(submittedEntryId);
              if (globalThis.window !== undefined) {
                persistSessionBest(globalThis.sessionStorage, score, submittedEntryId);
              }
            }
            void targetId; // used by the gated remote relabel added in Task 8
          }}
```

- [ ] **Step 5: Pass identity props and re-point the highlight**

Change the `highlightedEntryId={submittedEntryId}` prop (:703) to:

```typescript
          highlightedEntryId={sessionBestEntryId ?? submittedEntryId}
```

And add these props alongside the other `Overlay` props (e.g. just before `onSubmitScore`):

```typescript
          playerName={playerName}
          sessionBest={sessionBest}
          autoSaveStatus={autoSaveStatus}
```

- [ ] **Step 6: Verify it builds (Overlay prop types land in Task 5)**

Run: `npm run build`
Expected: FAIL with TypeScript errors that `Overlay` does not accept `playerName` / `sessionBest` / `autoSaveStatus` / `onRename`. **This is expected** — Task 5 adds those props. Do not "fix" by removing them.

> If you are executing tasks strictly one-commit-at-a-time and want a green build here, do Task 5 Step 1 (the prop signature) before committing. Otherwise commit and let Task 5 close the build.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(highscore): App identity state + auto-save effect + rename handler"
```

---

### Task 5: Overlay three-state game-over status slot + auto-save confirmation

**Files:**
- Modify: `src/game/Overlay.tsx` (props type :268-298; the name-prefill effect :386-391; `handleSubmit` :393-407; the game-over block :979-1056)

**Interfaces:**
- Consumes: `playerName`, `sessionBest`, `autoSaveStatus`, `onRename` (Task 4); `decideGameOverStatus` (Task 1); the i18n keys (Task 3).
- Produces: the rendered States A/B/C. No new exports.

- [ ] **Step 1: Extend the props type**

Add to the `Overlay` props type (the `Readonly<{ ... }>` block ending ~:298), before the closing `}>`:

```typescript
  playerName: string;
  sessionBest: number;
  autoSaveStatus: 'idle' | 'saving' | 'done';
  onRename: (newName: string, source: 'round' | 'menu') => void;
```

And add them to the destructured params (the `{ ... }` list ~:238-267):

```typescript
  playerName,
  sessionBest,
  autoSaveStatus,
  onRename,
```

Add the import near the other game imports:

```typescript
import { decideGameOverStatus } from './highscoreSession';
```

- [ ] **Step 2: Replace the name-prefill effect (App now owns the name)**

Replace the effect at :386-391 (the one reading `pug-banger-fiesta-player-name` from sessionStorage) with a prefill from the new prop:

```typescript
  useEffect(() => {
    if (mode === 'gameOver' && submitState === 'idle') {
      setPendingName(playerName);
    }
  }, [mode, submitState, playerName]);
```

- [ ] **Step 3: Simplify `handleSubmit` (App persists the name now)**

Replace `handleSubmit` (:393-407) with — note the removed `sessionStorage.setItem`, which moved to App:

```typescript
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitState !== 'idle') return;
    if (pendingName.trim() === '') return;
    const cleaned = sanitizeName(pendingName);
    setPendingName(cleaned);
    setSubmitState('submitting');
    await onSubmitScore(cleaned);
    setSubmitState('done');
  };
```

- [ ] **Step 4: Add a local rename-editing state**

Near the other `useState` hooks at the top of `Overlay` (~:299-306), add:

```typescript
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
```

- [ ] **Step 5: Replace the submit form block with the three-state status slot**

Replace the entire block at :1024-1044 (the `{score > 0 && submitState !== 'done' && (<form ...>...</form>)}`) with:

```tsx
            {(() => {
              const status = decideGameOverStatus({
                hasName: playerName !== '',
                score,
                sessionBest,
              });

              const renameAffordance = renaming ? (
                <form
                  className="name-edit-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (renameValue.trim() === '') return;
                    onRename(sanitizeName(renameValue), 'round');
                    setRenaming(false);
                  }}
                >
                  <input
                    className="res-submit-input"
                    maxLength={24}
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button type="submit" className="res-submit-btn">
                    OK
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="name-edit"
                  onClick={() => {
                    setRenameValue(playerName);
                    setRenaming(true);
                  }}
                >
                  ✎ {strings.menu.changeName}
                </button>
              );

              // State B — auto-saved (or saving) new session best.
              if (autoSaveStatus !== 'idle') {
                return (
                  <div className="res-status res-status-saved">
                    {autoSaveStatus === 'saving' ? (
                      <p className="res-saving">{strings.leaderboard.submitting}</p>
                    ) : (
                      <p className="res-saved">
                        <span className="res-saved-check" aria-hidden="true">✓</span>
                        {strings.results.savedToBoard(playerName)}
                      </p>
                    )}
                    {autoSaveStatus === 'done' && renameAffordance}
                  </div>
                );
              }

              // State A — first save of the session (manual, prominent).
              if (status === 'firstSave') {
                return (
                  <form className="res-submit is-primary" onSubmit={handleSubmit}>
                    <p className="res-submit-eye">{strings.leaderboard.enterNamePrompt}</p>
                    <div className="res-submit-row">
                      <input
                        className="res-submit-input"
                        maxLength={24}
                        autoFocus
                        value={pendingName}
                        onChange={(event) => setPendingName(event.target.value)}
                        placeholder={strings.leaderboard.namePlaceholder}
                        disabled={submitState !== 'idle'}
                      />
                      <button
                        type="submit"
                        className="res-submit-btn is-primary"
                        disabled={submitState !== 'idle' || pendingName.trim() === ''}
                      >
                        {submitState === 'submitting'
                          ? strings.leaderboard.submitting
                          : strings.leaderboard.submit}
                      </button>
                    </div>
                  </form>
                );
              }

              // State C — named, not a new best: manual "save anyway".
              if (status === 'lowerManual') {
                if (submitState === 'done') {
                  return (
                    <div className="res-status">
                      <p className="res-saved">
                        <span className="res-saved-check" aria-hidden="true">✓</span>
                        {strings.results.savedToBoard(playerName)}
                      </p>
                      {renameAffordance}
                    </div>
                  );
                }
                return (
                  <div className="res-status">
                    <p className="res-best-line">{strings.results.sessionBestLabel(sessionBest)}</p>
                    <button
                      type="button"
                      className="res-save-anyway"
                      disabled={submitState !== 'idle'}
                      onClick={async () => {
                        setSubmitState('submitting');
                        await onSubmitScore(playerName);
                        setSubmitState('done');
                      }}
                    >
                      {submitState === 'submitting'
                        ? strings.leaderboard.submitting
                        : strings.results.saveAnyway}
                    </button>
                    {renameAffordance}
                  </div>
                );
              }

              return null; // noSave (score === 0)
            })()}
```

- [ ] **Step 6: Reset rename UI when leaving gameOver**

In the existing `useEffect` that resets `submitState` on `mode` change (:376-384), add inside the `if (mode !== 'gameOver')` branch:

```typescript
      setRenaming(false);
```

- [ ] **Step 7: Verify build + run**

Run: `npm run build`
Expected: PASS — no TypeScript errors (this closes the build that Task 4 Step 6 left open).

Run: `npm run dev`, open the game in a browser, and verify:
- **First run:** play, score > 0 → the name block appears at the top of the status slot, input autofocused; typing + Enter (or the Save button) saves; the block becomes a "✓ Saved as <name>" line with a "✎ change name" control.
- **Replay and beat it:** play again, beat the score → on the results screen it shows "Saved as <name>" with **no** typing/button needed.
- **Replay and score lower:** → it shows "Your best run: N" + a "Save anyway" button; clicking saves and shows the ✓ line.
- **Rename:** click "✎ change name", type a new name, OK → the displayed name updates.

- [ ] **Step 8: Commit**

```bash
git add src/game/Overlay.tsx
git commit -m "feat(highscore): three-state game-over status slot + auto-save confirmation"
```

---

### Task 6: Menu identity line

**Files:**
- Modify: `src/game/Overlay.tsx` (the menu footer block :782-793)

**Interfaces:**
- Consumes: `playerName`, `sessionBest`, `onRename` (already props after Task 5); `menu.playingAs`, `menu.yourBest`, `menu.changeName`, `menu.changeNameFuture` (Task 3).
- Produces: a `.menu-identity` element rendered above the footer when a session name exists.

- [ ] **Step 1: Add the identity line above the footer**

Immediately **before** the `<div className="menu-foot">` element (:782), add:

```tsx
            {playerName !== '' && (
              <div className="menu-identity">
                <span className="menu-identity-name">{strings.menu.playingAs(playerName)}</span>
                {sessionBest > 0 && (
                  <span className="menu-identity-best">· {strings.menu.yourBest(sessionBest)}</span>
                )}
                {renamingMenu ? (
                  <form
                    className="name-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (renameValueMenu.trim() === '') return;
                      onRename(sanitizeName(renameValueMenu), 'menu');
                      setRenamingMenu(false);
                    }}
                  >
                    <input
                      className="res-submit-input"
                      maxLength={24}
                      autoFocus
                      value={renameValueMenu}
                      onChange={(event) => setRenameValueMenu(event.target.value)}
                    />
                    <button type="submit" className="res-submit-btn">OK</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="name-edit"
                    onClick={() => {
                      setRenameValueMenu(playerName);
                      setRenamingMenu(true);
                    }}
                  >
                    ✎ {sessionBest > 0 ? strings.menu.changeName : strings.menu.changeNameFuture}
                  </button>
                )}
              </div>
            )}
```

- [ ] **Step 2: Add the menu rename state**

Near the other `useState` hooks at the top of `Overlay` (alongside the Task 5 `renaming` state), add:

```typescript
  const [renamingMenu, setRenamingMenu] = useState(false);
  const [renameValueMenu, setRenameValueMenu] = useState('');
```

And in the `useEffect` that resets on `mode !== 'menu'` (:380-383), add:

```typescript
      setRenamingMenu(false);
```

- [ ] **Step 3: Verify build + run**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev` and verify: after saving a score, return to the menu (quit or finish a round) → the menu shows "Playing as <name> · your best: N" with a "✎ change name" control above the footer. Renaming from here updates the name shown.

- [ ] **Step 4: Commit**

```bash
git add src/game/Overlay.tsx
git commit -m "feat(highscore): menu identity line with rename"
```

---

### Task 7: CSS — fixed status slot, celebration hierarchy, identity line, rename affordance

**Files:**
- Modify: `src/App.css` (add near the `.res-submit` block ~:1626-1679; the `@container (min-width: 460px)` block :1734-1765; the `.menu-foot` area :485-494; a `@media (prefers-reduced-motion)` block)

**Interfaces:**
- Consumes: class names emitted in Tasks 5-6 (`.res-status`, `.res-status-saved`, `.res-saved`, `.res-saving`, `.res-saved-check`, `.res-best-line`, `.res-save-anyway`, `.res-submit.is-primary`, `.res-submit-eye`, `.res-submit-row`, `.res-submit-btn.is-primary`, `.name-edit`, `.name-edit-form`, `.menu-identity`, `.menu-identity-name`, `.menu-identity-best`).
- Produces: no new tokens; reuses existing `--paper`, `--line`, `--accent`, `--warm-1/2`, `--ink-*` variables.

- [ ] **Step 1: Add the status-slot, celebration, and affordance styles**

Append after the `.res-submit-done` block (~:1679):

```css
/* One fixed-height slot the three game-over states render into, so the card
   never resizes between states or across replays. */
.res-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 64px;
  justify-content: center;
}

.res-submit.is-primary {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-height: 64px;
  padding: 10px 12px;
  background: var(--paper-2);
  border: 1px solid var(--line-strong);
  border-radius: 14px;
}
.res-submit-eye {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: var(--eyebrow-tracking);
  color: var(--accent);
}
.res-submit-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.res-submit-btn.is-primary {
  background: linear-gradient(135deg, var(--warm-1), var(--warm-2));
  color: #261208;
}

/* Quiet session-best confirmation — NOT the gold record pill. */
.res-saved,
.res-saving {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink-soft);
}
.res-saved-check {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  animation: savedCheckPop 180ms cubic-bezier(0.34, 1.4, 0.64, 1) 200ms both;
}
.res-best-line {
  margin: 0;
  font-size: 12.5px;
  color: var(--ink-soft);
}
.res-save-anyway {
  align-self: flex-start;
  border: 1px solid var(--line-strong);
  background: transparent;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  font: inherit;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--ui-font);
}
.res-save-anyway:hover { background: rgba(36, 16, 11, 0.06); }
.res-save-anyway:disabled { opacity: 0.6; cursor: default; }

.name-edit {
  align-self: flex-start;
  border: 0;
  background: none;
  padding: 2px 0;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-mute);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.name-edit:hover,
.name-edit:focus-visible { color: var(--accent); }
.name-edit-form {
  display: flex;
  gap: 6px;
  align-items: center;
}

@keyframes savedCheckPop {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* The leaderboard row pulse is the real "you landed here" signal. */
.res-mini.you {
  animation: youPulse 600ms ease 320ms 1;
}
@keyframes youPulse {
  0% { box-shadow: 0 0 0 0 rgba(209, 102, 54, 0); }
  40% { box-shadow: 0 0 0 4px rgba(209, 102, 54, 0.35); }
  100% { box-shadow: 0 0 0 0 rgba(209, 102, 54, 0); }
}
```

- [ ] **Step 2: Keep the status slot in the left grid column**

In the `@container (min-width: 460px)` block, extend the existing `.res-submit, .res-submit-done` selector (:1754-1757) to include the new slot classes:

```css
  .res-submit,
  .res-submit-done,
  .res-status {
    grid-column: 1 / 2;
  }
```

- [ ] **Step 3: Add the menu identity line styles**

Append near the `.menu-foot` styles (after :494):

```css
.menu-identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-soft);
  font-family: var(--ui-font);
}
.menu-identity-name { font-weight: 800; }
.menu-identity-best { color: var(--ink-mute); }
```

- [ ] **Step 4: Add reduced-motion guards**

Append at the end of `src/App.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .res-saved-check { animation: none; }
  .res-mini.you { animation: none; }
}
```

- [ ] **Step 5: Verify build + run**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev` and verify in a browser:
- The game-over card does **not** visibly resize when moving between first-save / auto-saved / save-anyway across replays (the status slot holds a fixed min-height).
- On a session best, the ✓ checkmark pops in *after* the card settles and the player's leaderboard row pulses once.
- A global record still shows the original gold "NEW RECORD" pill (unchanged), and it is the only gold celebration.
- With OS "reduce motion" on, the checkmark and row pulse do not animate.

- [ ] **Step 6: Commit**

```bash
git add src/App.css
git commit -m "feat(highscore): status-slot, quiet save celebration, identity + rename styles"
```

---

### Task 8: Rename client function (gated) and the State A leave-nudge

**Files:**
- Modify: `src/game/useLeaderboard.ts` (add `rename`); `src/App.tsx` (wire `renameLeaderboard` into `onRename` behind the flag; add the leave-nudge)

**Interfaces:**
- Consumes: the existing `getSupabase` is not used here (writes are server-only); `onRename` from Task 4.
- Produces: `useLeaderboard().rename(rowId: string, newName: string): Promise<boolean>`; const `RENAME_ENABLED`.

- [ ] **Step 1: Add the gated `rename` to useLeaderboard**

In `src/game/useLeaderboard.ts`, add to the `LeaderboardState` type:

```typescript
  /** Relabel an existing row's player_name. Gated until /api/rename-score ships. */
  rename: (rowId: string, newName: string) => Promise<boolean>;
```

Add the implementation before the `return` (after `submit`):

```typescript
  const rename = useCallback<LeaderboardState['rename']>(async (rowId, newName) => {
    try {
      const res = await fetch('/api/rename-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId, name: newName }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);
```

Add `rename` to the returned object:

```typescript
  return { entries, loading, error, refresh, startSession, submit, rename };
```

- [ ] **Step 2: Wire the gated remote relabel into App's `onRename`**

In `src/App.tsx`, add near the top of the component file (module scope, above the component):

```typescript
// Flip to true once /api/rename-score + its auth land (parallel security workstream).
const RENAME_ENABLED = false;
```

Pull `rename` out of the `useLeaderboard()` destructure (:153-160):

```typescript
    rename: renameLeaderboard,
```

Extend the `onRename` handler body (from Task 4): replace the `void targetId;` placeholder line with the gated remote relabel:

```typescript
            if (RENAME_ENABLED && targetId) {
              void renameLeaderboard(targetId, newName);
            }
```

- [ ] **Step 3: Add the State A leave-nudge**

The nudge fires when a first-time player (no name, score > 0, nothing saved) clicks "Again" or "Main menu". In `Overlay.tsx`, the game-over action buttons are at :1046-1053. Wrap their handlers so an unsaved first run shows a one-line confirm. Replace the `res-actions` block (:1046-1053) with:

```tsx
            <div className="res-actions">
              <button
                type="button"
                className="res-btn-prim"
                onClick={() => {
                  if (
                    playerName === '' &&
                    score > 0 &&
                    submitState !== 'done' &&
                    autoSaveStatus === 'idle' &&
                    !leaveNudged
                  ) {
                    setLeaveNudged(true);
                    return;
                  }
                  onStartRound();
                }}
              >
                ▶ {strings.results.again}
              </button>
              <button type="button" className="res-btn-sec" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
            {leaveNudged && (
              <p className="res-leave-nudge">{strings.results.saveFirstNudge}</p>
            )}
```

Add the nudge state near the other `Overlay` `useState` hooks:

```typescript
  const [leaveNudged, setLeaveNudged] = useState(false);
```

Reset it on leaving gameOver — in the `if (mode !== 'gameOver')` branch of the reset effect (:376-379):

```typescript
      setLeaveNudged(false);
```

Add the nudge style at the end of `src/App.css`:

```css
.res-leave-nudge {
  margin: 4px 0 0;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent);
  text-align: center;
}
```

> Behavior: the first "Again" click on an unsaved first run is swallowed and shows the nudge; a second click proceeds. "Main menu" is never blocked (we don't trap). This is the confirmed-in-scope, non-blocking nudge.

- [ ] **Step 4: Verify build + run**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev` and verify:
- On a first run with a score, clicking "Again" without saving shows "Save your run first!" once; clicking "Again" again starts the round.
- Rename still updates the local name (the remote relabel is a no-op while `RENAME_ENABLED` is false — confirm no network error is surfaced to the user).

- [ ] **Step 5: Commit**

```bash
git add src/game/useLeaderboard.ts src/App.tsx src/game/Overlay.tsx src/App.css
git commit -m "feat(highscore): gated rename client + State A leave-nudge"
```

---

### Task 9: Full regression pass

**Files:** none (verification only).

- [ ] **Step 1: Run the unit tests**

Run: `npm run test:run`
Expected: PASS — all suites including `highscoreSession.test.ts`, `scoring.test.ts`, `leaderboardUtils.test.ts`.

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: PASS for both.

- [ ] **Step 3: Manual smoke (browser)**

Run `npm run dev` and walk the full matrix:
- Fresh session (clear sessionStorage) → first positive run = State A (type+submit) → menu shows identity.
- New best on replay → auto-saved, ✓ + row pulse, no typing.
- Sub-best replay → "your best" + Save anyway.
- Rename post-round and from the menu → name updates everywhere; `sessionBest` re-baselines after a post-round rename.
- Score 0 run → no save offered, no empty-name leak.
- Reload the page (same tab) → identity persists (sessionStorage). Close tab + reopen → identity gone (sessionStorage only).

- [ ] **Step 4: Commit (if any verification-driven fixups were needed)**

```bash
git add -A
git commit -m "chore(highscore): regression pass fixups"
```

---

## Deferred (tracked, not in this plan)

Blocked on the parallel security workstream — revisit to un-gate rename:
- `/api/rename-score` endpoint + authorization (round token is consumed at submit).
- `/api/submit-score` returning the freshly-inserted row id (not an earliest `name+score` dedupe match), so `submittedEntryId`/`sessionBestEntryId` never reference a stranger's row.
- Flip `RENAME_ENABLED = true` and verify the live row relabel + failure-revert path.
