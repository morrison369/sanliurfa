/**
 * Unit Tests - api/api-keys.ts vi.mock postgres + cache
 *
 * - createApiKey sk_ prefix + 64-char hex (32 random bytes) + SHA-256 hash to DB
 * - expiresInDays Date calculation + null when undefined
 * - validateApiKey hash lookup → active/expires_at/rate-limit guards
 * - validateApiKey active=false → null + warn log
 * - validateApiKey expired → null
 * - validateApiKey rate limit exceeded → null
 * - deleteApiKey rowCount > 0 → true (owner-scoped via WHERE)
 * - getUserApiKeys ORDER BY created_at DESC
 * - getApiKeyUsageStats default 7-day + custom
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, poolQueryMock, checkRateLimitMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  poolQueryMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  pool: { query: poolQueryMock },
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  checkRateLimit: checkRateLimitMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  poolQueryMock.mockReset();
  poolQueryMock.mockResolvedValue({ rowCount: 1 });
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(true);
});

import {
  createApiKey,
  validateApiKey,
  deleteApiKey,
  getUserApiKeys,
  logApiKeyUsage,
  getApiKeyUsageStats,
} from '../api/api-keys';

describe('createApiKey', () => {
  it('returns sk_ prefix + 64 hex chars + DB id', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'key-1' });
    const r = await createApiKey('u-1', 'My Key', ['read', 'write']);
    expect(r?.id).toBe('key-1');
    expect(r?.key).toMatch(/^sk_[0-9a-f]{64}$/);
  });

  it('hash stored in DB is NOT plaintext key (SHA-256)', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'k-1' });
    const r = await createApiKey('u-1', 'Test', ['read']);
    const insertCall = queryOneMock.mock.calls[0];
    const storedHash = insertCall[1][2]; // key_hash position
    expect(storedHash).not.toBe(r?.key);
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
  });

  it('expiresInDays sets expires_at to future Date', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'k-1' });
    const before = Date.now();
    await createApiKey('u-1', 'Test', ['read'], 30);
    const insertCall = queryOneMock.mock.calls[0];
    const expiresAt = insertCall[1][4] as Date;
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(before + 29 * 86400000);
  });

  it('expiresInDays undefined → expires_at null', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'k-1' });
    await createApiKey('u-1', 'Test', ['read']);
    const insertCall = queryOneMock.mock.calls[0];
    expect(insertCall[1][4]).toBeNull();
  });

  it('default scopes - ["read"]', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'k-1' });
    await createApiKey('u-1', 'Test');
    expect(queryOneMock.mock.calls[0][1][3]).toEqual(['read']);
  });

  it('DB returns no id → null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await createApiKey('u-1', 'Test')).toBeNull();
  });

  it('DB throws → null (catch swallows)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB down'));
    expect(await createApiKey('u-1', 'Test')).toBeNull();
  });
});

describe('validateApiKey', () => {
  const baseKey = {
    id: 'k-1',
    user_id: 'u-1',
    scopes: ['read'],
    rate_limit: 100,
    rate_limit_window: 60,
    expires_at: null,
    active: true,
  };

  it('valid key + active + within rate limit → returns userId/scopes', async () => {
    queryOneMock.mockResolvedValueOnce(baseKey);
    const r = await validateApiKey('sk_abc123', '1.2.3.4');
    expect(r?.userId).toBe('u-1');
    expect(r?.scopes).toEqual(['read']);
  });

  it('hash lookup uses SHA-256 (not plaintext)', async () => {
    queryOneMock.mockResolvedValueOnce(baseKey);
    await validateApiKey('sk_test', '1.2.3.4');
    const lookupHash = queryOneMock.mock.calls[0][1][0];
    expect(lookupHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lookupHash).not.toBe('sk_test');
  });

  it('not found → null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await validateApiKey('sk_invalid')).toBeNull();
  });

  it('active=false → null (deactivated key)', async () => {
    queryOneMock.mockResolvedValueOnce({ ...baseKey, active: false });
    expect(await validateApiKey('sk_x')).toBeNull();
  });

  it('expires_at < NOW → null (expired)', async () => {
    queryOneMock.mockResolvedValueOnce({
      ...baseKey,
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(await validateApiKey('sk_x')).toBeNull();
  });

  it('rate limit exceeded (checkRateLimit returns false) → null', async () => {
    queryOneMock.mockResolvedValueOnce(baseKey);
    checkRateLimitMock.mockResolvedValueOnce(false);
    expect(await validateApiKey('sk_x', '1.2.3.4')).toBeNull();
  });

  it('valid → last_used_at + last_ip_address UPDATE', async () => {
    queryOneMock.mockResolvedValueOnce(baseKey);
    await validateApiKey('sk_x', '203.0.113.5');
    const updateCall = poolQueryMock.mock.calls[0];
    expect(updateCall[0]).toContain('UPDATE api_keys SET last_used_at = NOW()');
    expect(updateCall[1]).toEqual(['203.0.113.5', 'k-1']);
  });
});

describe('deleteApiKey', () => {
  it('owner check via WHERE user_id - rowCount > 0 → true', async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteApiKey('k-1', 'u-1')).toBe(true);
    const sql = poolQueryMock.mock.calls[0][0];
    expect(sql).toContain('WHERE id = $1 AND user_id = $2');
  });

  it('no rows affected (wrong owner / not found) → false', async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteApiKey('k-x', 'wrong-owner')).toBe(false);
  });

  it('DB throws → false', async () => {
    poolQueryMock.mockRejectedValueOnce(new Error('DB down'));
    expect(await deleteApiKey('k-1', 'u-1')).toBe(false);
  });
});

describe('getUserApiKeys', () => {
  it('ORDER BY created_at DESC + WHERE user_id', async () => {
    queryManyMock.mockResolvedValueOnce([
      { id: 'k-1', name: 'New', scopes: ['read'], active: true, created_at: 't' },
    ]);
    const r = await getUserApiKeys('u-1');
    expect(r).toHaveLength(1);
    const sql = queryManyMock.mock.calls[0][0];
    expect(sql).toContain('WHERE user_id = $1');
    expect(sql).toContain('ORDER BY created_at DESC');
  });

  it('exception - empty array fallback', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getUserApiKeys('u-1')).toEqual([]);
  });
});

describe('logApiKeyUsage / getApiKeyUsageStats', () => {
  it('logApiKeyUsage - INSERT with optional fields nullable', async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1 });
    await logApiKeyUsage('k-1', '/api/x', 'GET', 200);
    const params = poolQueryMock.mock.calls[0][1];
    expect(params[0]).toBe('k-1');
    expect(params[3]).toBe(200);
    expect(params[4]).toBeNull(); // ip
    expect(params[5]).toBeNull(); // ua
    expect(params[6]).toBeNull(); // responseTimeMs
  });

  it('getApiKeyUsageStats - default 7-day window', async () => {
    queryOneMock.mockResolvedValueOnce({ total_requests: 100 });
    await getApiKeyUsageStats('k-1');
    expect(queryOneMock.mock.calls[0][1]).toEqual(['k-1', 7]);
  });

  it('getApiKeyUsageStats - custom days', async () => {
    queryOneMock.mockResolvedValueOnce({ total_requests: 1 });
    await getApiKeyUsageStats('k-1', 30);
    expect(queryOneMock.mock.calls[0][1]).toEqual(['k-1', 30]);
  });

  it('getApiKeyUsageStats - exception → empty {}', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB'));
    expect(await getApiKeyUsageStats('k-1')).toEqual({});
  });
});
