/**
 * API Contract Tests - POST /api/auth/login/verify-2fa
 *
 * - tempToken + code required → 400 problem+json
 * - Code format: 6-digit numeric only → 400
 * - Success → 200 success message (cookies set by runLoginTwoFactorFlow)
 * - TwoFactorRateLimitError → 429 (HARD RULE #39 brute-force lockout)
 * - TwoFactorCodeError → 401 (invalid code or expired)
 * - Other error → 500
 *
 * vi.hoisted - runLoginTwoFactorFlow + error class mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { runLoginTwoFactorFlowMock } = vi.hoisted(() => ({
  runLoginTwoFactorFlowMock: vi.fn(),
}));

vi.mock('../auth/auth-flows', async () => {
  // Real error classes for instanceof checks
  class TwoFactorCodeError extends Error {
    constructor(message = '2FA kodu geçersiz') {
      super(message);
      this.name = 'TwoFactorCodeError';
    }
  }
  class TwoFactorRateLimitError extends Error {
    constructor(message = 'Çok fazla başarısız deneme') {
      super(message);
      this.name = 'TwoFactorRateLimitError';
    }
  }
  return {
    runLoginTwoFactorFlow: runLoginTwoFactorFlowMock,
    TwoFactorCodeError,
    TwoFactorRateLimitError,
  };
});

beforeEach(() => {
  runLoginTwoFactorFlowMock.mockReset();
});

import { POST } from '../../pages/api/auth/login/verify-2fa';
import { TwoFactorCodeError, TwoFactorRateLimitError } from '../auth/auth-flows';

const validBody = { tempToken: 'temp-abc-123', code: '123456' };

describe('POST /api/auth/login/verify-2fa', () => {
  it('missing tempToken → 400 /problems/auth-2fa-validation', async () => {
    const ctx: any = createApiContext({
      method: 'POST',
      body: { code: '123456' },
      locals: {},
    });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-validation');
  });

  it('missing code → 400', async () => {
    const ctx: any = createApiContext({
      method: 'POST',
      body: { tempToken: 'temp-1' },
      locals: {},
    });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('non-6-digit code → 400 /problems/auth-2fa-code-format', async () => {
    const ctx: any = createApiContext({
      method: 'POST',
      body: { tempToken: 'temp-1', code: '12345' },
      locals: {},
    });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-code-format');
  });

  it('non-numeric code → 400 (regex /^\\d{6}$/)', async () => {
    const ctx: any = createApiContext({
      method: 'POST',
      body: { tempToken: 'temp-1', code: 'abc123' },
      locals: {},
    });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-code-format');
  });

  it('valid - flow called, returns 200 success', async () => {
    runLoginTwoFactorFlowMock.mockResolvedValueOnce(undefined);
    const ctx: any = createApiContext({ method: 'POST', body: validBody, locals: {} });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(runLoginTwoFactorFlowMock).toHaveBeenCalledWith({ tempToken: 'temp-abc-123', code: '123456' }, ctx.cookies);
  });

  it('HARD RULE #39 - TwoFactorRateLimitError → 429 /problems/auth-2fa-rate-limited', async () => {
    runLoginTwoFactorFlowMock.mockRejectedValueOnce(new TwoFactorRateLimitError());
    const ctx: any = createApiContext({ method: 'POST', body: validBody, locals: {} });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(429);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-rate-limited');
  });

  it('TwoFactorCodeError (invalid/expired) → 401 /problems/auth-2fa-invalid-code', async () => {
    runLoginTwoFactorFlowMock.mockRejectedValueOnce(new TwoFactorCodeError());
    const ctx: any = createApiContext({ method: 'POST', body: validBody, locals: {} });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-invalid-code');
  });

  it('Generic error → 500 /problems/auth-2fa-verification-failed', async () => {
    runLoginTwoFactorFlowMock.mockRejectedValueOnce(new Error('DB timeout'));
    const ctx: any = createApiContext({ method: 'POST', body: validBody, locals: {} });
    ctx.cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-2fa-verification-failed');
  });
});
