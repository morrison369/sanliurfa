/**
 * API Contract Tests - POST /api/profile/delete (Account Deletion)
 *
 * - Auth required → 401 problem+json
 * - DELETE FROM users WHERE id (cascade triggers DB-side cleanup)
 * - signOut(token) called for cookie auth-token
 * - cookies.delete('auth-token', { path: '/' })
 * - Redirect to /?account_deleted=true on success
 * - DB error → redirect to /profil/ayarlar?error=delete_failed (graceful UX)
 *
 * NOTE: Endpoint does NOT require password re-auth (HARD RULE #42 should be enforced —
 * potential security concern logged via test annotation, fix in separate PR).
 *
 * vi.hoisted - postgres + auth signOut mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, signOutMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../auth', () => ({
  signOut: signOutMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
  signOutMock.mockReset();
  signOutMock.mockReturnValue(undefined);
});

import { POST } from '../../pages/api/profile/delete';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

function ctxWith(opts: { user?: any; authToken?: string | null } = {}) {
  const captured: any = {};
  return {
    locals: opts.user ? { user: opts.user } : {},
    redirect: (url: string) => {
      captured.redirected = url;
      return new Response(null, { status: 302, headers: { Location: url } });
    },
    cookies: {
      get: vi.fn((name: string) => {
        if (name === 'auth-token' && opts.authToken !== null) {
          return { value: opts.authToken || 'auth-token-value' };
        }
        return undefined;
      }),
      set: vi.fn(),
      delete: vi.fn(),
    },
    captured,
  } as any;
}

describe('POST /api/profile/delete', () => {
  it('no auth → 401 problem+json', async () => {
    const ctx = ctxWith();
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('success → DELETE FROM users + signOut + cookie delete + redirect', async () => {
    const ctx = ctxWith({ user: authedUser });
    const resp = await POST(ctx);
    expect(resp.status).toBe(302);
    expect(resp.headers.get('Location')).toBe('/?account_deleted=true');
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM users WHERE id = $1');
    expect(queryMock.mock.calls[0][1]).toEqual(['user-1']);
    expect(signOutMock).toHaveBeenCalledWith('auth-token-value');
    expect(ctx.cookies.delete).toHaveBeenCalledWith('auth-token', { path: '/' });
  });

  it('no auth-token cookie - signOut skipped (graceful)', async () => {
    const ctx = ctxWith({ user: authedUser, authToken: null });
    const resp = await POST(ctx);
    expect(resp.status).toBe(302);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(ctx.cookies.delete).toHaveBeenCalled(); // cookie delete still attempted
  });

  it('DB error → redirect to /profil/ayarlar?error=delete_failed (graceful UX)', async () => {
    queryMock.mockRejectedValueOnce(new Error('FK constraint violation'));
    const ctx = ctxWith({ user: authedUser });
    const resp = await POST(ctx);
    expect(resp.status).toBe(302);
    expect(resp.headers.get('Location')).toBe('/profil/ayarlar?error=delete_failed');
    // signOut NOT called when DB error (catch swallows before signOut path)
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('audit trail: DB delete is hard delete (no soft-delete column)', async () => {
    const ctx = ctxWith({ user: authedUser });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).not.toContain('deleted_at'); // hard delete, NOT soft
    expect(sql).toContain('DELETE FROM');
  });

  it('SECURITY ANNOTATION: HARD RULE #42 not enforced (no password re-auth)', async () => {
    // This endpoint does NOT require current password — known security gap vs HARD RULE #42.
    // A stolen session cookie can DELETE the user account permanently.
    // Test serves as documentation; fix should add bcrypt.compare in separate PR.
    const ctx = ctxWith({ user: authedUser });
    const resp = await POST(ctx);
    expect(resp.status).toBe(302); // succeeds without password verification
    expect(queryMock).toHaveBeenCalled(); // DELETE executed
  });
});
