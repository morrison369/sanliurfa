/**
 * Unit Tests - auth/middleware.ts API authentication helpers
 *
 * - authenticateUser (locals.user → AuthenticatedUser shape + null fallback)
 * - requireAuth (delegate to authenticateUser + return user or null)
 * - requireRole (role allowlist check)
 *
 * All helpers read from Astro context.locals.user (set by src/middleware.ts).
 * No DB dependency.
 */

import { describe, it, expect } from 'vitest';
import { authenticateUser, requireAuth, requireRole } from '../auth/middleware';

const mkContext = (user: any) => ({
  locals: { user },
}) as any;

describe('authenticateUser', () => {
  it('locals.user yok → null', async () => {
    const r = await authenticateUser(mkContext(undefined));
    expect(r).toBeNull();
  });

  it('locals.user var → AuthenticatedUser shape', async () => {
    const r = await authenticateUser(mkContext({
      id: 'u-1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'admin',
    }));
    expect(r?.user.id).toBe('u-1');
    expect(r?.user.email).toBe('test@example.com');
    expect(r?.user.name).toBe('Test User');
    expect(r?.user.role).toBe('admin');
  });

  it('fullName yok → email fallback as name', async () => {
    const r = await authenticateUser(mkContext({
      id: 'u-2',
      email: 'noname@example.com',
    }));
    expect(r?.user.name).toBe('noname@example.com');
  });

  it('role yok → "user" default', async () => {
    const r = await authenticateUser(mkContext({
      id: 'u-3',
      email: 'r@example.com',
    }));
    expect(r?.user.role).toBe('user');
  });
});

describe('requireAuth', () => {
  it('locals.user yok → null', async () => {
    expect(await requireAuth(mkContext(undefined))).toBeNull();
  });

  it('locals.user var → user object (no wrapper)', async () => {
    const u = await requireAuth(mkContext({ id: 'u-1', email: 'a@b.com' }));
    expect(u?.id).toBe('u-1');
  });
});

describe('requireRole', () => {
  it('locals.user yok → null', async () => {
    expect(await requireRole(mkContext(undefined), ['admin'])).toBeNull();
  });

  it('role allowlist match → user', async () => {
    const u = await requireRole(mkContext({ id: 'u', email: 'e', role: 'admin' }), ['admin']);
    expect(u?.role).toBe('admin');
  });

  it('role not in allowlist → null', async () => {
    expect(await requireRole(mkContext({ id: 'u', email: 'e', role: 'user' }), ['admin'])).toBeNull();
  });

  it('multi role allowlist - moderator OR admin', async () => {
    const r = await requireRole(mkContext({ id: 'u', email: 'e', role: 'moderator' }), ['admin', 'moderator']);
    expect(r?.role).toBe('moderator');
  });
});
