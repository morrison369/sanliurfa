/**
 * API Contract Tests - POST /api/auth/2fa/setup
 *
 * - HARD RULE #42: Password re-auth required (bcrypt.compare)
 * - Method type allowlist: totp / email / sms (others → 422)
 * - method_identifier required for non-totp
 * - Wrong password → 401 (NOT 403 — to match generic auth fail)
 * - User not found → 401
 * - TOTP path: response includes totp_uri + secret_key
 * - Email/SMS path: only method_id + backup_codes_count
 *
 * vi.hoisted - bcrypt + create2FAMethod + postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { bcryptCompareMock, create2FAMethodMock, queryOneMock } = vi.hoisted(() => ({
  bcryptCompareMock: vi.fn(),
  create2FAMethodMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: bcryptCompareMock },
  compare: bcryptCompareMock,
}));

vi.mock('../two-factor-auth', () => ({
  create2FAMethod: create2FAMethodMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

beforeEach(() => {
  bcryptCompareMock.mockReset();
  bcryptCompareMock.mockResolvedValue(true);
  create2FAMethodMock.mockReset();
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue({ password_hash: '$2a$12$dummy' });
});

import { POST } from '../../pages/api/auth/2fa/setup';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };
const totpMethod = {
  id: 'method-1',
  method_type: 'totp' as const,
  secret_key: 'JBSWY3DPEHPK3PXP',
  backup_codes: ['CODE1', 'CODE2', 'CODE3'],
};

describe('POST /api/auth/2fa/setup', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp', password: 'pass' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(create2FAMethodMock).not.toHaveBeenCalled();
  });

  it('missing password → 422 "Şifre gerekli"', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
  });

  it('invalid method_type → 422 "geçersiz"', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'biometric', password: 'pass' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('non-totp without method_identifier → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'email', password: 'pass' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('user not found → 401', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp', password: 'pass' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('HARD RULE #42 - wrong password → 401 AUTHENTICATION_FAILED', async () => {
    bcryptCompareMock.mockResolvedValueOnce(false);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp', password: 'wrong' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(create2FAMethodMock).not.toHaveBeenCalled();
  });

  it('TOTP success → 201 + totp_uri + secret_key', async () => {
    create2FAMethodMock.mockResolvedValueOnce(totpMethod);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp', password: 'right' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    const data = await parseJson(resp);
    const inner = data.data.data;
    expect(inner.method_id).toBe('method-1');
    expect(inner.method_type).toBe('totp');
    expect(inner.totp_uri).toContain('otpauth://totp/Sanliurfa:');
    expect(inner.totp_uri).toContain('issuer=Sanliurfa');
    expect(inner.secret_key).toBe('JBSWY3DPEHPK3PXP');
    expect(inner.backup_codes_count).toBe(3);
  });

  it('Email method success - method_identifier passed to helper', async () => {
    create2FAMethodMock.mockResolvedValueOnce({
      ...totpMethod,
      method_type: 'email',
    });
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'email', method_identifier: 'alt@t.com', password: 'right' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(create2FAMethodMock).toHaveBeenCalledWith('user-1', 'email', 'alt@t.com');
    const data = await parseJson(resp);
    expect(data.data.data.totp_uri).toBeUndefined();
    expect(data.data.data.secret_key).toBeUndefined();
  });

  it('create2FAMethod returns null → 500', async () => {
    create2FAMethodMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_type: 'totp', password: 'right' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});
