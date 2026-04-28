/**
 * Security Test — JWT Signature Constant-Time Comparison
 *
 * 2026-04-25 audit'inde `auth.ts:decodeToken` `signature !== expectedSig`
 * non-constant-time string compare kullanıyordu. Teorik timing oracle.
 *
 * CLAUDE.md "SECURITY HARD RULES" #6: `crypto.timingSafeEqual()` zorunlu.
 *
 * Bu test:
 * 1. Tampered signature → null döner (reject)
 * 2. Different-length signature → null (length mismatch handled)
 * 3. Valid signature → payload decode edilir
 * 4. alg field tampering → ignore (HS256 hardcoded)
 * 5. Empty signature → null
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Mock postgres + cache for auth import
import { vi } from 'vitest';
vi.mock('../../lib/postgres', () => ({ queryOne: vi.fn() }));
// getRedisClient mock: get() resolves with a valid session JSON so the
// HARD RULE #35 Redis-session check passes for valid tokens.
// Invalid/tampered tokens return null from decodeToken() before Redis is called.
vi.mock('../../lib/cache/cache', () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(JSON.stringify({ userId: 'u-1', email: 'a@x.com', role: 'user' })),
    setEx: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  }),
  prefixKey: (k: string) => `sanliurfa:${k}`,
}));
vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TEST_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function makeToken(payload: object, secret = TEST_SECRET): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('JWT Signature Constant-Time Comparison', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalEnv) process.env.NODE_ENV = originalEnv;
    else delete process.env.NODE_ENV;
    if (originalSecret) process.env.JWT_SECRET = originalSecret;
    else delete process.env.JWT_SECRET;
  });

  it('valid token → decoded payload', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const token = makeToken({ userId: 'u-1', email: 'a@x.com', role: 'user' });

    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('u-1');
    expect(result?.email).toBe('a@x.com');
  });

  it('tampered signature (one char flip) → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const token = makeToken({ userId: 'u-1', email: 'a@x.com' });

    // Flip last char of signature
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A');
    const tampered = parts.join('.');

    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it('signature with different length → null (timingSafeEqual length pre-check)', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const token = makeToken({ userId: 'u-1', email: 'a@x.com' });

    const parts = token.split('.');
    // Truncate signature
    parts[2] = parts[2].slice(0, 10);
    const shortSig = parts.join('.');

    // Without length pre-check, timingSafeEqual would throw — must return null gracefully
    const result = await verifyToken(shortSig);
    expect(result).toBeNull();
  });

  it('empty signature → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const parts = makeToken({ userId: 'u-1', email: 'a@x.com' }).split('.');
    parts[2] = '';
    const result = await verifyToken(parts.join('.'));
    expect(result).toBeNull();
  });

  it('token signed with different secret → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const token = makeToken({ userId: 'u-1', email: 'a@x.com' }, 'different-secret-key-32-chars-min!');
    const result = await verifyToken(token);
    expect(result).toBeNull();
  });

  it('alg=none header → still rejected (HS256 hardcoded in verifier)', async () => {
    const { verifyToken } = await import('../../lib/auth');

    // Construct token with alg=none header but valid HS256 signature → would still pass
    // (verifier ignores alg field, always recomputes HMAC). Test ensures attacker tampering
    // alg field doesn't bypass verification.
    const noneHeader = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = base64url(JSON.stringify({ userId: 'attacker', email: 'a@x.com', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const fakeToken = `${noneHeader}.${body}.`;

    const result = await verifyToken(fakeToken);
    expect(result).toBeNull();
  });

  it('expired token → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify({ userId: 'u-1', email: 'a@x.com', exp: Math.floor(Date.now() / 1000) - 60 }));
    const sig = crypto.createHmac('sha256', TEST_SECRET).update(`${header}.${body}`).digest('base64url');

    const result = await verifyToken(`${header}.${body}.${sig}`);
    expect(result).toBeNull();
  });

  it('malformed token (not 3 parts) → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    expect(await verifyToken('only.two')).toBeNull();
    expect(await verifyToken('a.b.c.d')).toBeNull();
    expect(await verifyToken('')).toBeNull();
  });

  it('token with missing required fields → null', async () => {
    const { verifyToken } = await import('../../lib/auth');
    // No userId/email
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify({ random: 'data', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const sig = crypto.createHmac('sha256', TEST_SECRET).update(`${header}.${body}`).digest('base64url');

    const result = await verifyToken(`${header}.${body}.${sig}`);
    expect(result).toBeNull();
  });
});
