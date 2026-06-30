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
