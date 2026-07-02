import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_NAME,
  MAX_NAME_LEN,
  celebrationTier,
  prospectiveRank,
  sanitizeName,
} from './leaderboardUtils';

describe('sanitizeName', () => {
  it('returns a normal name unchanged', () => {
    expect(sanitizeName('Joe')).toBe('Joe');
  });

  it('trims leading whitespace', () => {
    expect(sanitizeName('   Joe')).toBe('Joe');
  });

  it('trims trailing whitespace', () => {
    expect(sanitizeName('Joe   ')).toBe('Joe');
  });

  it('trims both sides', () => {
    expect(sanitizeName('  Joe  ')).toBe('Joe');
  });

  it('preserves internal whitespace', () => {
    expect(sanitizeName('  Joe Doe  ')).toBe('Joe Doe');
    expect(sanitizeName('Joe   Doe')).toBe('Joe   Doe');
  });

  it('preserves casing exactly as typed', () => {
    expect(sanitizeName('joe')).toBe('joe');
    expect(sanitizeName('JOE')).toBe('JOE');
    expect(sanitizeName('JoE DoE')).toBe('JoE DoE');
    // Czech diacritics are case-sensitive too — Ž stays Ž.
    expect(sanitizeName('Žaneta')).toBe('Žaneta');
  });

  it('preserves non-ASCII characters (diacritics, emoji, etc.)', () => {
    // Kept within MAX_NAME_LEN so this checks preservation, not truncation.
    expect(sanitizeName('žluťoučký')).toBe('žluťoučký');
    expect(sanitizeName('🐶 Mops')).toBe('🐶 Mops');
  });

  it('caps at MAX_NAME_LEN characters', () => {
    const long = 'a'.repeat(MAX_NAME_LEN + 10);
    expect(sanitizeName(long)).toHaveLength(MAX_NAME_LEN);
    expect(sanitizeName(long)).toBe('a'.repeat(MAX_NAME_LEN));
  });

  it('trims first, then caps — leading whitespace does not eat the cap', () => {
    // If we capped before trimming, leading spaces would steal characters
    // from the visible portion of the name.
    const input = '   ' + 'a'.repeat(MAX_NAME_LEN);
    expect(sanitizeName(input)).toBe('a'.repeat(MAX_NAME_LEN));
  });

  it('falls back to ANONYMOUS_NAME for empty input', () => {
    expect(sanitizeName('')).toBe(ANONYMOUS_NAME);
  });

  it('falls back to ANONYMOUS_NAME for whitespace-only input', () => {
    expect(sanitizeName('   ')).toBe(ANONYMOUS_NAME);
    expect(sanitizeName('\t\n  ')).toBe(ANONYMOUS_NAME);
  });

  it('does NOT collapse internal whitespace', () => {
    // Style call: we let the user have "Joe   Doe" if they want it. Submit
    // de-dup logic uses exact equality, so this is intentional behavior.
    const result = sanitizeName('  Joe    Doe  ');
    expect(result).toBe('Joe    Doe');
  });
});

const board = (...scores: number[]) => scores.map((score) => ({ score }));

describe('prospectiveRank', () => {
  it('ranks 1 on an empty board', () => {
    expect(prospectiveRank([], 5)).toBe(1);
  });

  it('ranks 1 when beating every existing score', () => {
    expect(prospectiveRank(board(20, 15, 10), 21)).toBe(1);
  });

  it('ranks below an existing equal score (earlier save wins ties)', () => {
    // Server orders score desc, created_at asc — the new run is always the
    // latest, so it slots under the tied incumbent.
    expect(prospectiveRank(board(20, 15, 10), 15)).toBe(3);
  });

  it('ranks last+1 when below every existing score', () => {
    expect(prospectiveRank(board(20, 15, 10), 3)).toBe(4);
  });

  it('slots between scores', () => {
    expect(prospectiveRank(board(20, 15, 10), 17)).toBe(2);
  });
});

describe('celebrationTier', () => {
  it('rank 1 → first', () => {
    expect(celebrationTier(1)).toBe('first');
  });

  it('ranks 2-3 → top3', () => {
    expect(celebrationTier(2)).toBe('top3');
    expect(celebrationTier(3)).toBe('top3');
  });

  it('ranks 4-10 → top10', () => {
    expect(celebrationTier(4)).toBe('top10');
    expect(celebrationTier(10)).toBe('top10');
  });

  it('ranks 11+ → none', () => {
    expect(celebrationTier(11)).toBe('none');
    expect(celebrationTier(99)).toBe('none');
  });
});
