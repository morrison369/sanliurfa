/**
 * Security Test — `/api/analytics/performance` GET ?byUrl=1 extension
 *
 * Migration 168 sonrası endpoint'e per-URL breakdown extension eklendi:
 *   ?byUrl=1&limit=N&minSamples=M
 *
 * Bu test:
 * 1. Admin auth zorunlu — non-admin 401 alır
 * 2. limit + minSamples integer-coerced + range-bounded (SQL injection safety)
 * 3. SQL injection: limit/minSamples'ta arbitrary string input → throw veya safe default
 * 4. URL field response'da raw döner ama whitelist'ten geçmez (bilinçli — URL = path string, attacker tarafından client'a yansıtılırsa XSS riski VAR — render tarafının escape etmesi gerek)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/postgres', () => ({
  query: vi.fn(),
}));

vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), setRequestId: vi.fn() },
}));

import { query } from '../../lib/postgres';

function makeRequest(qs: string, locals: any = { user: { role: 'admin', id: 'a-1' } }) {
  return {
    request: new Request(`http://localhost/api/analytics/performance?${qs}`),
    locals,
  } as any;
}

describe('Security — /api/analytics/performance ?byUrl=1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty aggregate + empty URL breakdown
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{}], rowCount: 1, command: 'SELECT' } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' } as any);
  });

  it('rejects non-admin (returns 401)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    const response = await GET(makeRequest('byUrl=1', { user: { role: 'user', id: 'u-1' } }));
    expect(response.status).toBe(401);
  });

  it('rejects unauthenticated (no locals.user)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    const response = await GET(makeRequest('byUrl=1', {}));
    expect(response.status).toBe(401);
  });

  it('admin role gets 200 with byUrl=1', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    const response = await GET(makeRequest('byUrl=1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('urlBreakdown');
  });

  it('omits urlBreakdown when byUrl is not set', async () => {
    vi.clearAllMocks();
    vi.mocked(query).mockResolvedValueOnce({ rows: [{}], rowCount: 1, command: 'SELECT' } as any);

    const { GET } = await import('../../pages/api/analytics/performance');
    const response = await GET(makeRequest('')); // no byUrl param
    const body = await response.json();
    expect(body.urlBreakdown).toBeUndefined();
    // Only 1 query call — no per-URL aggregation
    expect(vi.mocked(query)).toHaveBeenCalledTimes(1);
  });

  it('limit param is integer-coerced + range-bounded (1-50)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');

    // Test SQL injection attempt — string with potential SQL chars
    await GET(makeRequest('byUrl=1&limit=10;DROP+TABLE+users--'));

    // Verify the LIMIT param passed to query is integer (parseInt of malicious string → 10)
    const calls = vi.mocked(query).mock.calls;
    const urlBreakdownCall = calls.find(c => String(c[0]).includes('GROUP BY url'));
    expect(urlBreakdownCall).toBeDefined();
    const limitParam = (urlBreakdownCall![1] as any[])[urlBreakdownCall![1]!.length - 1];
    expect(typeof limitParam).toBe('number');
    expect(limitParam).toBe(10); // parseInt('10;DROP...', 10) === 10
    expect(limitParam).toBeGreaterThanOrEqual(1);
    expect(limitParam).toBeLessThanOrEqual(50);
  });

  it('limit > 50 is clamped to 50 (DoS prevention)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    await GET(makeRequest('byUrl=1&limit=10000'));

    const calls = vi.mocked(query).mock.calls;
    const urlBreakdownCall = calls.find(c => String(c[0]).includes('GROUP BY url'));
    const limitParam = (urlBreakdownCall![1] as any[])[urlBreakdownCall![1]!.length - 1];
    expect(limitParam).toBe(50); // Math.min(50, 10000)
  });

  it('limit < 1 (invalid) coerces to 1 minimum', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    await GET(makeRequest('byUrl=1&limit=0'));

    const calls = vi.mocked(query).mock.calls;
    const urlBreakdownCall = calls.find(c => String(c[0]).includes('GROUP BY url'));
    const limitParam = (urlBreakdownCall![1] as any[])[urlBreakdownCall![1]!.length - 1];
    expect(limitParam).toBeGreaterThanOrEqual(1);
  });

  it('minSamples param is integer-coerced (SQL injection safety)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    await GET(makeRequest("byUrl=1&minSamples='OR+1=1--"));

    const calls = vi.mocked(query).mock.calls;
    const urlBreakdownCall = calls.find(c => String(c[0]).includes('GROUP BY url'));
    const params = urlBreakdownCall![1] as any[];
    // minSamples is parameterized as $idx, integer-coerced
    const minSamplesParam = params[params.length - 2]; // second-to-last (last is limit)
    expect(typeof minSamplesParam).toBe('number');
    expect(Number.isInteger(minSamplesParam)).toBe(true);
    expect(minSamplesParam).toBeGreaterThanOrEqual(1);
  });

  it('uses parametrized SQL for url breakdown (no string interpolation of user input)', async () => {
    const { GET } = await import('../../pages/api/analytics/performance');
    await GET(makeRequest('byUrl=1&from=2025-01-01&to=2025-12-31'));

    const calls = vi.mocked(query).mock.calls;
    const urlBreakdownCall = calls.find(c => String(c[0]).includes('GROUP BY url'));
    const sql = String(urlBreakdownCall![0]);

    // SQL must use $1, $2, ... parameter placeholders (not string interpolation)
    expect(sql).toMatch(/\$\d+/);
    // SQL must NOT contain raw user input in the query text
    expect(sql).not.toContain('2025-01-01');
    expect(sql).not.toContain('2025-12-31');
  });
});
