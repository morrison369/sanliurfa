/**
 * API Contract Tests - POST /api/auth/2fa/verify
 *
 * - Auth required → 401 "Oturum gerekli"
 * - Body validation: method_id + code as strings
 * - Method lookup → 404 if not found
 * - IDOR guard: method.user_id !== locals.user.id → 403
 * - TOTP verifyTOTPCode + activate2FAMethod + recovery codes
 * - Invalid code → 401 AUTHENTICATION_FAILED
 * - activate2FAMethod returns false → 500
 *
 * vi.hoisted - two-factor + postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  verifyTOTPCodeMock, activate2FAMethodMock, generateRecoveryCodesMock,
  queryOneMock, updateMock, deleteCacheMock,
} = vi.hoisted(() => ({
  verifyTOTPCodeMock: vi.fn(),
  activate2FAMethodMock: vi.fn(),
  generateRecoveryCodesMock: vi.fn(),
  queryOneMock: vi.fn(),
  updateMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../two-factor', () => ({
  verifyTOTPCode: verifyTOTPCodeMock,
}));

vi.mock('../two-factor-auth', () => ({
  activate2FAMethod: activate2FAMethodMock,
  generateRecoveryCodes: generateRecoveryCodesMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  update: updateMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  verifyTOTPCodeMock.mockReset();
  activate2FAMethodMock.mockReset();
  generateRecoveryCodesMock.mockReset();
  queryOneMock.mockReset();
  updateMock.mockReset();
  updateMock.mockResolvedValue(undefined);
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(undefined);
});

import { POST } from '../../pages/api/auth/2fa/verify';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };
const totpMethod = {
  id: 'method-1',
  user_id: 'user-1',
  method_type: 'totp',
  secret_key: 'JBSWY3DPEHPK3PXP',
};

describe('POST /api/auth/2fa/verify', () => {
  it('no auth → 401 "Oturum gerekli"', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'm1', code: '123456' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('non-string method_id → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 123, code: '123456' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('non-string code → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'm1', code: null },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('method not found → 404', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'm1', code: '123456' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(404);
  });

  it('IDOR guard: method belongs to other user → 403 "erişim izniniz yok"', async () => {
    queryOneMock.mockResolvedValueOnce({ ...totpMethod, user_id: 'other-user' });
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: '123456' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
    expect(verifyTOTPCodeMock).not.toHaveBeenCalled();
    expect(activate2FAMethodMock).not.toHaveBeenCalled();
  });

  it('TOTP code invalid → 401 AUTHENTICATION_FAILED', async () => {
    queryOneMock.mockResolvedValueOnce(totpMethod);
    verifyTOTPCodeMock.mockReturnValueOnce(false);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: '999999' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(activate2FAMethodMock).not.toHaveBeenCalled();
  });

  it('TOTP valid → activate + recovery codes returned', async () => {
    queryOneMock.mockResolvedValueOnce(totpMethod);
    verifyTOTPCodeMock.mockReturnValueOnce(true);
    activate2FAMethodMock.mockResolvedValueOnce(true);
    generateRecoveryCodesMock.mockResolvedValueOnce(['CODE-1', 'CODE-2', 'CODE-3']);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: '123456' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    const data = await parseJson(resp);
    expect(data.data.data.recovery_codes).toEqual(['CODE-1', 'CODE-2', 'CODE-3']);
    expect(activate2FAMethodMock).toHaveBeenCalledWith('method-1');
  });

  it('TOTP valid → cache invalidated `user:2fa:{userId}`', async () => {
    queryOneMock.mockResolvedValueOnce(totpMethod);
    verifyTOTPCodeMock.mockReturnValueOnce(true);
    activate2FAMethodMock.mockResolvedValueOnce(true);
    generateRecoveryCodesMock.mockResolvedValueOnce([]);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: '123456' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(deleteCacheMock).toHaveBeenCalledWith('user:2fa:user-1');
  });

  it('email/sms method - no TOTP check (validated externally)', async () => {
    queryOneMock.mockResolvedValueOnce({ ...totpMethod, method_type: 'email' });
    activate2FAMethodMock.mockResolvedValueOnce(true);
    generateRecoveryCodesMock.mockResolvedValueOnce([]);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: 'whatever' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(verifyTOTPCodeMock).not.toHaveBeenCalled();
  });

  it('activate2FAMethod returns false → 500', async () => {
    queryOneMock.mockResolvedValueOnce(totpMethod);
    verifyTOTPCodeMock.mockReturnValueOnce(true);
    activate2FAMethodMock.mockResolvedValueOnce(false);
    const ctx = createApiContext({
      method: 'POST',
      body: { method_id: 'method-1', code: '123456' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});
