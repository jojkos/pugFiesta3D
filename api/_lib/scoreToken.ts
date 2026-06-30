import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stateless, signed session token. The nonce ties a submission to a real
 * score_sessions row (single-use); iat is the issue time so the server can
 * enforce a minimum elapsed time (anti-instant-submit) and an expiry — all
 * without trusting the client, because the HMAC makes the payload tamper-proof.
 *
 * Format: base64url(JSON{nonce, iat}) + "." + base64url(HMAC_SHA256(body)).
 */
export type TokenPayload = { nonce: string; iat: number };

function secret(): string {
  const value = process.env.SCORE_SIGNING_SECRET;
  if (!value) throw new Error('SCORE_SIGNING_SECRET is not set');
  return value;
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, providedSig] = parts;

  const expectedSig = sign(body);
  const provided = Buffer.from(providedSig);
  const expected = Buffer.from(expectedSig);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      payload &&
      typeof payload.nonce === 'string' &&
      typeof payload.iat === 'number' &&
      Number.isFinite(payload.iat)
    ) {
      return payload as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
