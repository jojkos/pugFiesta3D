import { beforeEach, describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './scoreToken';

describe('scoreToken', () => {
  beforeEach(() => {
    process.env.SCORE_SIGNING_SECRET = 'test-secret-123';
  });

  it('round-trips a signed token', () => {
    const token = signToken({ nonce: 'n1', iat: 1000 });
    expect(verifyToken(token)).toEqual({ nonce: 'n1', iat: 1000 });
  });

  it('rejects a tampered signature', () => {
    const token = signToken({ nonce: 'n1', iat: 1000 });
    const [body] = token.split('.');
    expect(verifyToken(`${body}.deadbeef`)).toBeNull();
  });

  it('rejects a tampered payload reusing the old signature', () => {
    const token = signToken({ nonce: 'n1', iat: 1000 });
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ nonce: 'evil', iat: 1000 })).toString(
      'base64url',
    );
    expect(verifyToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('nodot')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('a.b.c')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signToken({ nonce: 'n1', iat: 1000 });
    process.env.SCORE_SIGNING_SECRET = 'different-secret';
    expect(verifyToken(token)).toBeNull();
  });
});
