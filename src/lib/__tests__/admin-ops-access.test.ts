import { describe, expect, it } from 'vitest';
import { ensureAdminOpsReadAccess, resetAdminOpsRateLimitForTests } from '../admin-ops-access';

describe('admin ops access helper', () => {
  it('rejects non-admin access', () => {
    const request = new Request('https://example.com/api/admin/dashboard/overview');

    const response = ensureAdminOpsReadAccess({
      request,
      locals: {},
      endpoint: '/api/admin/dashboard/overview',
      requestId: 'req-1',
      startTime: Date.now(),
    });

    expect(response?.status).toBe(403);
  });

  it('rate limits repeated admin reads', () => {
    const request = new Request('https://example.com/api/admin/dashboard/overview', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const locals = { user: { id: 'admin-1', role: 'admin' } };

    resetAdminOpsRateLimitForTests(request, locals as any);
    let lastResponse: Response | null = null;
    for (let index = 0; index < 121; index += 1) {
      lastResponse = ensureAdminOpsReadAccess({
        request,
        locals: locals as any,
        endpoint: '/api/admin/dashboard/overview',
        requestId: `req-${index}`,
        startTime: Date.now(),
      });
    }

    expect(lastResponse?.status).toBe(429);
  });
});
