/**
 * Unit Tests — social/request-guard.ts buildSocialAuditContext (pure)
 *
 * - User id + email + role passthrough
 * - x-forwarded-for IP extraction (split first)
 * - user-agent extraction
 * - null fallback when headers missing
 *
 * NOT: enforceSocialAction DB+rate-limit bağımlı (postgres + abuse-policy).
 */

import { describe, it, expect } from 'vitest';
import { buildSocialAuditContext } from '../social/request-guard';

const mkRequest = (headers: Record<string, string>) => ({
  request: new Request('http://localhost/test', { headers }),
});

describe('buildSocialAuditContext', () => {
  it('full headers — userId/email/IP/UA döner', () => {
    const ctx = buildSocialAuditContext(
      mkRequest({
        'x-forwarded-for': '1.2.3.4',
        'user-agent': 'Mozilla/5.0',
      }),
      { id: 'u-1', email: 'a@b.com' }
    );
    expect(ctx.userId).toBe('u-1');
    expect(ctx.actorEmail).toBe('a@b.com');
    expect(ctx.ipAddress).toBe('1.2.3.4');
    expect(ctx.userAgent).toBe('Mozilla/5.0');
  });

  it('x-forwarded-for chain — ilk IP alınır', () => {
    const ctx = buildSocialAuditContext(
      mkRequest({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1, 8.8.8.8' }),
      { id: 'u' }
    );
    expect(ctx.ipAddress).toBe('10.0.0.1');
  });

  it('x-forwarded-for trim whitespace', () => {
    const ctx = buildSocialAuditContext(
      mkRequest({ 'x-forwarded-for': '  1.1.1.1  ' }),
      { id: 'u' }
    );
    expect(ctx.ipAddress).toBe('1.1.1.1');
  });

  it('header yoksa null fallback (IP + UA)', () => {
    const ctx = buildSocialAuditContext(
      mkRequest({}),
      { id: 'u' }
    );
    expect(ctx.ipAddress).toBeNull();
    expect(ctx.userAgent).toBeNull();
  });

  it('email yoksa null', () => {
    const ctx = buildSocialAuditContext(
      mkRequest({}),
      { id: 'u', email: null }
    );
    expect(ctx.actorEmail).toBeNull();
  });
});
