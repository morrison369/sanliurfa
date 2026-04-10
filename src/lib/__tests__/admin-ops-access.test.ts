import { describe, expect, it } from 'vitest';
import {
  ensureAdminOpsReadAccess,
  ensureAdminOpsWriteAccess,
  resetAdminOpsRateLimitForTests
} from '../admin-ops-access';

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

  it('rate limits repeated admin writes with stricter threshold', () => {
    const request = new Request('https://example.com/api/admin/system/integration-settings', {
      method: 'PUT',
      headers: { 'x-forwarded-for': '203.0.113.11' },
    });
    const locals = { user: { id: 'admin-2', role: 'admin' } };

    resetAdminOpsRateLimitForTests(request, locals as any, 'write');
    let lastResponse: Response | null = null;
    for (let index = 0; index < 31; index += 1) {
      lastResponse = ensureAdminOpsWriteAccess({
        request,
        locals: locals as any,
        endpoint: '/api/admin/system/integration-settings',
        requestId: `req-write-${index}`,
        startTime: Date.now(),
      });
    }

    expect(lastResponse?.status).toBe(429);
  });
});
