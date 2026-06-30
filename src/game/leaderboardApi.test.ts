import { describe, expect, it } from 'vitest';
import { postScore, requestSessionToken } from './leaderboardApi';

type Call = { input: string; init?: RequestInit };

function fakeFetch(ok: boolean, body: unknown, calls: Call[] = []): typeof fetch {
  return ((input: string, init?: RequestInit) => {
    calls.push({ input, init });
    return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
  }) as unknown as typeof fetch;
}

const throwingFetch = (() => Promise.reject(new Error('network'))) as unknown as typeof fetch;

describe('requestSessionToken', () => {
  it('returns the token on a 200 with a token', async () => {
    expect(await requestSessionToken(fakeFetch(true, { token: 'abc.def' }))).toBe('abc.def');
  });

  it('returns null when the 200 body has no token', async () => {
    expect(await requestSessionToken(fakeFetch(true, {}))).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    expect(await requestSessionToken(fakeFetch(false, { error: 'nope' }))).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    expect(await requestSessionToken(throwingFetch)).toBeNull();
  });
});

describe('postScore', () => {
  it('returns the entry and POSTs the right body on success', async () => {
    const calls: Call[] = [];
    const entry = { id: '1', player_name: 'Bob', score: 10, created_at: 't' };
    const result = await postScore(fakeFetch(true, { entry }, calls), {
      token: 'tok',
      name: 'Bob',
      score: 10,
    });
    expect(result).toEqual(entry);
    expect(calls[0]?.input).toBe('/api/submit-score');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      token: 'tok',
      name: 'Bob',
      score: 10,
    });
  });

  it('returns null on a non-ok response (e.g. 403 too soon / 400 implausible)', async () => {
    const result = await postScore(fakeFetch(false, { error: 'Implausible score' }), {
      token: 't',
      name: 'n',
      score: 99999,
    });
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    expect(await postScore(throwingFetch, { token: 't', name: 'n', score: 1 })).toBeNull();
  });
});
