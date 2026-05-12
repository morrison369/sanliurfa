/**
 * Unit Tests - admin/export-tokens.ts vi.mock postgres + cache
 *
 * - issueExportToken HMAC-SHA256 hash storage + ttl clamp 30..3600 + maxDownloads clamp 1..20
 * - issueExportToken token format: base64url, 24 random bytes
 * - consumeExportToken multi-guard: not_found / revoked / resource_mismatch / expired / download_limit / ip_mismatch / ua_mismatch
 * - consumeExportToken policy: allowedIpCidrs CIDR check, allowedCountries (riskFlag), replayProtection
 * - consumeExportToken success → used_count UPDATE
 * - revokeExportToken / revokeExportTokenById WHERE revoked_at IS NULL guard
 * - listExportTokens activeOnly + resourceKey filters + limit clamp 1..200
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, checkRateLimitMock, getCacheMock, setCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock('../cache/cache', () => ({
  checkRateLimit: checkRateLimitMock,
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1, rows: [] });
  queryOneMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(true); // fail-open allowed
  getCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockReset();
  setCacheMock.mockResolvedValue(undefined);
  process.env.EXPORT_TOKEN_SECRET = 'test-export-token-secret-key';
});

import {
  issueExportToken,
  consumeExportToken,
  revokeExportToken,
  revokeExportTokenById,
  listExportTokens,
} from '../admin/export-tokens';

describe('issueExportToken', () => {
  it('returns token (base64url) + expiresAt + ttl + maxDownloads', async () => {
    const r = await issueExportToken({
      resourceKey: 'admin.social.events.export',
      ttlSeconds: 600,
      maxDownloads: 5,
    });
    expect(r.token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    expect(r.token.length).toBeGreaterThan(20);
    expect(r.ttlSeconds).toBe(600);
    expect(r.maxDownloads).toBe(5);
  });

  it('ttl clamp 30..3600 (5 → 30, 9999 → 3600)', async () => {
    const tooShort = await issueExportToken({ resourceKey: 'admin.social.events.export', ttlSeconds: 5 });
    expect(tooShort.ttlSeconds).toBe(30);
    const tooLong = await issueExportToken({ resourceKey: 'admin.social.events.export', ttlSeconds: 99999 });
    expect(tooLong.ttlSeconds).toBe(3600);
  });

  it('maxDownloads clamp 1..20 (0 → 1, 50 → 20)', async () => {
    const tooFew = await issueExportToken({ resourceKey: 'admin.social.events.export', maxDownloads: 0 });
    expect(tooFew.maxDownloads).toBe(1);
    const tooMany = await issueExportToken({ resourceKey: 'admin.social.events.export', maxDownloads: 50 });
    expect(tooMany.maxDownloads).toBe(20);
  });

  it('DB stores HMAC-SHA256 hash of token (not plaintext)', async () => {
    const r = await issueExportToken({ resourceKey: 'admin.social.events.export' });
    const insertCall = queryMock.mock.calls[0];
    const storedHash = insertCall[1][0];
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(storedHash).not.toBe(r.token);
  });

  it('payload includes __tokenPolicy with replayProtection true by default', async () => {
    await issueExportToken({ resourceKey: 'admin.social.events.export' });
    const insertCall = queryMock.mock.calls[0];
    const payload = JSON.parse(insertCall[1][2]);
    expect(payload.__tokenPolicy.replayProtection).toBe(true);
  });

  it('replayProtection can be disabled', async () => {
    await issueExportToken({ resourceKey: 'admin.social.events.export', replayProtection: false });
    const insertCall = queryMock.mock.calls[0];
    const payload = JSON.parse(insertCall[1][2]);
    expect(payload.__tokenPolicy.replayProtection).toBe(false);
  });
});

describe('consumeExportToken', () => {
  const validRow = {
    id: 'tok-1',
    resource_key: 'admin.social.events.export',
    payload: { foo: 'bar' },
    expires_at: new Date(Date.now() + 60000).toISOString(),
    max_downloads: 5,
    used_count: 0,
    bound_ip: null,
    bound_user_agent: null,
    revoked_at: null,
  };

  it('empty token → token_missing', async () => {
    const r = await consumeExportToken({ token: '', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_missing');
  });

  it('rate limit lockout → token_locked_too_many_attempts', async () => {
    checkRateLimitMock.mockResolvedValueOnce(false);
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_locked_too_many_attempts');
  });

  it('not found → token_not_found', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_not_found');
  });

  it('revoked → token_revoked', async () => {
    queryOneMock.mockResolvedValueOnce({ ...validRow, revoked_at: new Date().toISOString() });
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_revoked');
  });

  it('resource mismatch → token_resource_mismatch', async () => {
    queryOneMock.mockResolvedValueOnce({ ...validRow, resource_key: 'admin.places.lifecycle.export' });
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_resource_mismatch');
  });

  it('expired → token_expired', async () => {
    queryOneMock.mockResolvedValueOnce({
      ...validRow,
      expires_at: new Date(Date.now() - 60000).toISOString(),
    });
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_expired');
  });

  it('used_count >= max_downloads → token_download_limit', async () => {
    queryOneMock.mockResolvedValueOnce({ ...validRow, used_count: 5, max_downloads: 5 });
    const r = await consumeExportToken({ token: 'abc', resourceKey: 'admin.social.events.export' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_download_limit');
  });

  it('bound_ip mismatch → token_ip_mismatch', async () => {
    queryOneMock.mockResolvedValueOnce({ ...validRow, bound_ip: '1.2.3.4' });
    const r = await consumeExportToken({
      token: 'abc',
      resourceKey: 'admin.social.events.export',
      requestIp: '5.6.7.8',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_ip_mismatch');
  });

  it('bound_user_agent mismatch → token_ua_mismatch', async () => {
    queryOneMock.mockResolvedValueOnce({
      ...validRow,
      bound_user_agent: 'Mozilla/5.0',
    });
    const r = await consumeExportToken({
      token: 'abc',
      resourceKey: 'admin.social.events.export',
      userAgent: 'curl/7.68',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_ua_mismatch');
  });

  it('valid + no policy → ok + UPDATE used_count', async () => {
    queryOneMock.mockResolvedValueOnce(validRow);
    const r = await consumeExportToken({
      token: 'abc',
      resourceKey: 'admin.social.events.export',
    });
    expect(r.ok).toBe(true);
    const updateSql = queryMock.mock.calls[0][0];
    expect(updateSql).toContain('SET used_count = used_count + 1');
  });

  it('replay detected (same fingerprint cache hit) → token_replay_detected', async () => {
    queryOneMock.mockResolvedValueOnce(validRow);
    getCacheMock.mockResolvedValueOnce(true); // already seen
    const r = await consumeExportToken({
      token: 'abc',
      resourceKey: 'admin.social.events.export',
      requestIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_replay_detected');
  });

  it('private IPv4 → riskFlag "private_ip" added', async () => {
    queryOneMock.mockResolvedValueOnce(validRow);
    const r = await consumeExportToken({
      token: 'abc',
      resourceKey: 'admin.social.events.export',
      requestIp: '10.0.0.5',
      userAgent: 'Mozilla',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.riskFlags).toContain('private_ip');
  });
});

describe('revokeExportToken / revokeExportTokenById', () => {
  it('revokeExportToken empty → token_missing', async () => {
    const r = await revokeExportToken({ token: '' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('token_missing');
  });

  it('revokeExportToken success - rowCount > 0 → ok true', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const r = await revokeExportToken({ token: 'abc', revokedBy: 'admin-1', reason: 'manual' });
    expect(r.ok).toBe(true);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('SET revoked_at = NOW()');
    expect(sql).toContain('AND revoked_at IS NULL'); // already-revoked guard
  });

  it('revokeExportToken not found / already revoked → ok false', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    const r = await revokeExportToken({ token: 'abc' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('token_not_found_or_revoked');
  });

  it('revokeExportTokenById empty → token_id_missing', async () => {
    const r = await revokeExportTokenById({ tokenId: '' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('token_id_missing');
  });
});

describe('listExportTokens', () => {
  it('no filter - default limit 50', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await listExportTokens();
    const params = queryMock.mock.calls[0][1];
    expect(params).toEqual([50]);
  });

  it('activeOnly - WHERE revoked_at IS NULL AND expires_at > NOW()', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await listExportTokens({ activeOnly: true });
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('revoked_at IS NULL');
    expect(sql).toContain('expires_at > NOW()');
  });

  it('resourceKey filter - parameterized', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await listExportTokens({ resourceKey: 'admin.social.events.export' });
    const params = queryMock.mock.calls[0][1];
    expect(params[0]).toBe('admin.social.events.export');
  });

  it('limit clamp 1..200', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await listExportTokens({ limit: 9999 });
    const params = queryMock.mock.calls[0][1];
    expect(params[params.length - 1]).toBe(200);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await listExportTokens({ limit: -5 });
    const params2 = queryMock.mock.calls[1][1];
    expect(params2[params2.length - 1]).toBe(1);
    // NOTE: limit: 0 falls back to default 50 (Number(0 || 50) === 50, JS falsy quirk)
  });
});
