/**
 * API Contract Tests - GET + POST /api/admin/users/[id]
 *
 * GET:
 * - HARD RULE #52: locals.user.role !== 'admin' → 403 (NOT isAdmin — moderator excluded)
 * - User not found → 404
 * - Success → 200 with details
 *
 * POST (5-action dispatch):
 * - admin role check + action required → 422
 * - action=suspend / activate → updateAdminUserStatus called
 * - action=flag → flagType + reason required + flagType allowlist + severity allowlist + reason maxLength 1000
 * - HARD RULE #53: action=changeRole → newRole allowlist (user/admin/moderator/vendor)
 * - action=log → actionType maxLength 100 + changes object size cap 10000 chars JSON
 *
 * vi.hoisted - admin-users helpers + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext } from './helpers/api-test-helpers';

const {
  changeUserRoleMock, flagUserAccountMock, getUserDetailsMock,
  logAdminActionMock, updateAdminUserStatusMock,
} = vi.hoisted(() => ({
  changeUserRoleMock: vi.fn(),
  flagUserAccountMock: vi.fn(),
  getUserDetailsMock: vi.fn(),
  logAdminActionMock: vi.fn(),
  updateAdminUserStatusMock: vi.fn(),
}));

vi.mock('../admin/admin-users', () => ({
  changeUserRole: changeUserRoleMock,
  flagUserAccount: flagUserAccountMock,
  getUserDetails: getUserDetailsMock,
  logAdminAction: logAdminActionMock,
  updateAdminUserStatus: updateAdminUserStatusMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  changeUserRoleMock.mockReset();
  changeUserRoleMock.mockResolvedValue(undefined);
  flagUserAccountMock.mockReset();
  flagUserAccountMock.mockResolvedValue(undefined);
  getUserDetailsMock.mockReset();
  getUserDetailsMock.mockResolvedValue({ id: 'u-1', email: 'u@t.com' });
  logAdminActionMock.mockReset();
  logAdminActionMock.mockResolvedValue(undefined);
  updateAdminUserStatusMock.mockReset();
  updateAdminUserStatusMock.mockResolvedValue(undefined);
});

import { GET, POST } from '../../pages/api/admin/users/[id]';

const ADMIN = { id: 'admin-1', email: 'a@t.com', role: 'admin' };
const MOD = { id: 'mod-1', email: 'm@t.com', role: 'moderator' };

function ctx(opts: { method?: string; body?: any; user?: any; id?: string } = {}) {
  return createApiContext({
    method: opts.method || 'GET',
    body: opts.body,
    locals: opts.user ? { user: opts.user } : {},
    params: { id: opts.id || 'target-user-1' },
  });
}

describe('GET /api/admin/users/[id]', () => {
  it('HARD RULE #52: moderator → 403 (NOT isAdmin)', async () => {
    const resp = await GET(ctx({ user: MOD }));
    expect(resp.status).toBe(403);
    expect(getUserDetailsMock).not.toHaveBeenCalled();
  });

  it('no auth → 403', async () => {
    const resp = await GET(ctx());
    expect(resp.status).toBe(403);
  });

  it('user not found → 404', async () => {
    getUserDetailsMock.mockResolvedValueOnce(null);
    const resp = await GET(ctx({ user: ADMIN, id: 'non-existent' }));
    expect(resp.status).toBe(404);
  });

  it('admin success → 200 with user details', async () => {
    const resp = await GET(ctx({ user: ADMIN }));
    expect(resp.status).toBe(200);
    expect(getUserDetailsMock).toHaveBeenCalledWith('target-user-1');
  });
});

describe('POST /api/admin/users/[id]', () => {
  it('HARD RULE #52: moderator → 403', async () => {
    const resp = await POST(ctx({ method: 'POST', body: { action: 'suspend' }, user: MOD }));
    expect(resp.status).toBe(403);
  });

  it('missing action → 422', async () => {
    const resp = await POST(ctx({ method: 'POST', body: {}, user: ADMIN }));
    expect(resp.status).toBe(422);
  });

  it('action=suspend → updateAdminUserStatus called', async () => {
    const resp = await POST(ctx({ method: 'POST', body: { action: 'suspend' }, user: ADMIN }));
    expect(resp.status).toBe(200);
    expect(updateAdminUserStatusMock).toHaveBeenCalledWith('target-user-1', 'admin-1', 'suspend');
  });

  it('action=activate → updateAdminUserStatus(activate)', async () => {
    const resp = await POST(ctx({ method: 'POST', body: { action: 'activate' }, user: ADMIN }));
    expect(resp.status).toBe(200);
    expect(updateAdminUserStatusMock).toHaveBeenCalledWith('target-user-1', 'admin-1', 'activate');
  });

  it('action=flag - missing flagType/reason → 422', async () => {
    const resp = await POST(ctx({ method: 'POST', body: { action: 'flag' }, user: ADMIN }));
    expect(resp.status).toBe(422);
    expect(flagUserAccountMock).not.toHaveBeenCalled();
  });

  it('action=flag - invalid flagType (not in allowlist) → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'flag', flagType: 'sneeze', reason: 'test' },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('action=flag - invalid severity → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'flag', flagType: 'spam', reason: 'r', severity: 'EXTREME' },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('action=flag - reason > 1000 chars → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'flag', flagType: 'spam', reason: 'a'.repeat(1001) },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('action=flag valid - default severity "medium"', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'flag', flagType: 'spam', reason: 'spam content' },
      user: ADMIN,
    }));
    expect(resp.status).toBe(200);
    const call = flagUserAccountMock.mock.calls[0];
    expect(call[2]).toBe('spam');
    expect(call[3]).toBe('spam content');
    expect(call[4]).toBe('medium');
  });

  it('HARD RULE #53: changeRole - invalid role → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'changeRole', newRole: 'super_admin' },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
    expect(changeUserRoleMock).not.toHaveBeenCalled();
  });

  it('HARD RULE #53: changeRole - missing newRole → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'changeRole' },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('changeRole valid (4 allowlisted roles)', async () => {
    for (const role of ['user', 'admin', 'moderator', 'vendor']) {
      changeUserRoleMock.mockClear();
      const resp = await POST(ctx({
        method: 'POST',
        body: { action: 'changeRole', newRole: role },
        user: ADMIN,
      }));
      expect(resp.status).toBe(200);
      expect(changeUserRoleMock).toHaveBeenCalledWith('target-user-1', 'admin-1', role);
    }
  });

  it('action=log - actionType > 100 chars → 422', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'log', actionType: 'a'.repeat(101) },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('action=log - changes JSON > 10000 chars → 422', async () => {
    const big: any = {};
    for (let i = 0; i < 1500; i++) big[`k${i}`] = 'value';
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'log', actionType: 'edit', changes: big },
      user: ADMIN,
    }));
    expect(resp.status).toBe(422);
  });

  it('action=log valid → logAdminAction called', async () => {
    const resp = await POST(ctx({
      method: 'POST',
      body: { action: 'log', actionType: 'edit_profile', changes: { field: 'email' } },
      user: ADMIN,
    }));
    expect(resp.status).toBe(200);
    expect(logAdminActionMock).toHaveBeenCalledWith('admin-1', 'target-user-1', 'edit_profile', { field: 'email' });
  });
});
