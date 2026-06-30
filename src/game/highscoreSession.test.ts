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
