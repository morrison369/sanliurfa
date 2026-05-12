/**
 * API Contract Tests - POST /api/users/password
 *
 * - Auth required → 401
 * - Validation: current_password / new_password (min 8 + complex regex) / confirm_password
 * - new_password !== confirm_password → 422
 * - new_password === current_password → 422 (must change)
 * - User not in DB → 404
 * - verifyPassword false → 401 AUTH_FAILED
 * - changePassword false → 500
 * - HARD RULE #50: Success → deleteCache(`session:{authToken}`) called (revoke current session)
 *
 * vi.hoisted - user + auth + postgres + cache + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  changePasswordMock, verifyPasswordMock, queryOneMock, deleteCacheMock,
} = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  queryOneMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../user', () => ({
  changePassword: changePasswordMock,
}));

vi.mock('../auth', () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  changePasswordMock.mockReset();
  changePasswordMock.mockResolvedValue(true);
  verifyPasswordMock.mockReset();
  verifyPasswordMock.mockResolvedValue(true);
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue({ password_hash: '$2a$12$dummy' });
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(undefined);
});

import { POST } from '../../pages/api/users/password';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };
const validBody = {
  current_password: 'OldP4ss!',
  new_password: 'NewP4ssw0rd!',
  confirm_password: 'NewP4ssw0rd!',
};

function ctxWith(body: any, user: any = authedUser, opts: { noAuthToken?: boolean } = {}) {
  const locals = user ? { user } : {};
  const ctx: any = createApiContext({ method: 'POST', body, locals });
  const authToken = opts.noAuthToken ? undefined : 'auth-token-abc';
  ctx.cookies = {
    get: vi.fn((name: string) => name === 'auth-token' && authToken ? { value: authToken } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  };
  return ctx;
}

describe('POST /api/users/password', () => {
  it('no auth → 401', async () => {
    const resp = await POST(ctxWith(validBody, null));
    expect(resp.status).toBe(401);
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it('weak new_password (no uppercase) → 422', async () => {
    const resp = await POST(ctxWith({
      ...validBody,
      new_password: 'weakp4ss!',
      confirm_password: 'weakp4ss!',
    }));
    expect(resp.status).toBe(422);
  });

  it('new_password missing special char → 422', async () => {
    const resp = await POST(ctxWith({
      ...validBody,
      new_password: 'NoSpecial1',
      confirm_password: 'NoSpecial1',
    }));
    expect(resp.status).toBe(422);
  });

  it('new_password !== confirm_password → 422 "Şifreler eşleşmiyor"', async () => {
    const resp = await POST(ctxWith({
      ...validBody,
      confirm_password: 'DifferentP4ss!',
    }));
    expect(resp.status).toBe(422);
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it('new_password === current_password → 422 "aynı olamaz"', async () => {
    const resp = await POST(ctxWith({
      current_password: 'SameP4ss!',
      new_password: 'SameP4ss!',
      confirm_password: 'SameP4ss!',
    }));
    expect(resp.status).toBe(422);
  });

  it('user not in DB → 404', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const resp = await POST(ctxWith(validBody));
    expect(resp.status).toBe(404);
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it('current password wrong → 401 AUTH_FAILED', async () => {
    verifyPasswordMock.mockResolvedValueOnce(false);
    const resp = await POST(ctxWith(validBody));
    expect(resp.status).toBe(401);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('changePassword returns false → 500', async () => {
    changePasswordMock.mockResolvedValueOnce(false);
    const resp = await POST(ctxWith(validBody));
    expect(resp.status).toBe(500);
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('HARD RULE #50 - success → deleteCache("session:{authToken}") called', async () => {
    const resp = await POST(ctxWith(validBody));
    expect(resp.status).toBe(200);
    expect(deleteCacheMock).toHaveBeenCalledWith('session:auth-token-abc');
  });

  it('success without auth-token cookie → no deleteCache (graceful)', async () => {
    const resp = await POST(ctxWith(validBody, authedUser, { noAuthToken: true }));
    expect(resp.status).toBe(200);
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('changePassword called with userId + new_password', async () => {
    await POST(ctxWith(validBody));
    expect(changePasswordMock).toHaveBeenCalledWith('user-1', 'NewP4ssw0rd!');
  });

  it('success message indicates re-login required', async () => {
    const resp = await POST(ctxWith(validBody));
    const data = await parseJson(resp);
    expect(data.data.message).toMatch(/tekrar giriş/i);
  });
});
