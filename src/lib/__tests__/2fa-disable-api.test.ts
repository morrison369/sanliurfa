/**
 * API Contract Tests - DELETE /api/auth/2fa
 *
 * - HARD RULE #42: Password re-auth required (defense against session-theft)
 * - Auth required → 401
 * - Empty body / missing password → 422
 * - User not in DB → 401
 * - Wrong password → 401
 * - disableTwoFactor returns false → 500
 * - Success → 200 + recordRequest metrics
 *
 * vi.hoisted - bcrypt + disableTwoFactor + postgres + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { bcryptCompareMock, disableTwoFactorMock, queryOneMock, recordRequestMock } = vi.hoisted(() => ({
  bcryptCompareMock: vi.fn(),
  disableTwoFactorMock: vi.fn(),
  queryOneMock: vi.fn(),
  recordRequestMock: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: bcryptCompareMock },
  compare: bcryptCompareMock,
}));

vi.mock('../two-factor', () => ({
  disableTwoFactor: disableTwoFactorMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: recordRequestMock,
}));

beforeEach(() => {
  bcryptCompareMock.mockReset();
  bcryptCompareMock.mockResolvedValue(true);
  disableTwoFactorMock.mockReset();
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue({ password_hash: '$2a$12$dummy' });
  recordRequestMock.mockReset();
});

import { DELETE } from '../../pages/api/auth/2fa/disable';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('DELETE /api/auth/2fa', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'pass' },
      locals: {},
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(401);
    expect(disableTwoFactorMock).not.toHaveBeenCalled();
  });

  it('missing password → 422', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: {},
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(422);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
  });

  it('empty body (invalid JSON catch) → 422', async () => {
    // request.json() may throw on empty body; endpoint catches and treats as {}
    const req = new Request('http://localhost/api/auth/2fa', { method: 'DELETE' });
    const ctx: any = { request: req, locals: { user: authedUser } };
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(422);
  });

  it('non-string password → 422', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 12345 },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(422);
  });

  it('user not in DB → 401 "Kullanıcı bulunamadı"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'pass' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(401);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
  });

  it('HARD RULE #42 - wrong password → 401 (NOT 200)', async () => {
    bcryptCompareMock.mockResolvedValueOnce(false);
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'wrong' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(401);
    expect(disableTwoFactorMock).not.toHaveBeenCalled();
  });

  it('disableTwoFactor returns false → 500', async () => {
    disableTwoFactorMock.mockResolvedValueOnce(false);
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'right' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(500);
  });

  it('success → 200 + helper called with userId', async () => {
    disableTwoFactorMock.mockResolvedValueOnce(true);
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'right' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(200);
    expect(disableTwoFactorMock).toHaveBeenCalledWith('user-1');
    const data = await parseJson(resp);
    expect(data.data.message).toMatch(/devre dışı/);
  });

  it('recordRequest called for each path (metrics)', async () => {
    disableTwoFactorMock.mockResolvedValueOnce(true);
    const ctx = createApiContext({
      method: 'DELETE',
      body: { password: 'right' },
      locals: { user: authedUser },
    });
    await DELETE(ctx);
    expect(recordRequestMock).toHaveBeenCalled();
    const call = recordRequestMock.mock.calls[0];
    expect(call[0]).toBe('DELETE');
    expect(call[1]).toBe('/api/auth/2fa');
  });
});
