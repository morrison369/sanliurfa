import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock postgres pool + queryOne BEFORE importing the route, since handler
// dynamic-imports them at request time.
const queryOneMock = vi.fn();
const poolQueryMock = vi.fn();
vi.mock('../postgres', () => ({
  pool: { query: poolQueryMock },
  queryOne: queryOneMock,
  getPoolStatus: () => ({ idle: 1, total: 1, waiting: 0 }),
}));

// Mock redis client used by health probe.
const redisPingMock = vi.fn();
vi.mock('../cache/cache', () => ({
  getRedisClient: vi.fn().mockResolvedValue({ ping: redisPingMock }),
}));

import { GET, _resetIntegrationsCacheForTests } from '../../pages/api/health';
import { createApiContext, parseJson } from './helpers';

describe('GET /api/health — integrations summary', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.UNSPLASH_ACCESS_KEY;
    delete process.env.PEXELS_API_KEY;
    queryOneMock.mockReset();
    poolQueryMock.mockReset();
    redisPingMock.mockReset();
    _resetIntegrationsCacheForTests();
    poolQueryMock.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    redisPingMock.mockResolvedValue('PONG');
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports all integrations as unconfigured when DB rows are empty and env is clean', async () => {
    queryOneMock.mockResolvedValue(null); // every site_settings lookup returns null
    const ctx = createApiContext({ method: 'GET' });
    const res = await GET(ctx);
    const body = await parseJson(res);
    const integrations = body.data.integrations;
    expect(integrations.resend).toBe('unconfigured');
    expect(integrations.smtp).toBe('unconfigured');
    expect(integrations.stripe).toBe('unconfigured');
    expect(integrations.analytics).toBe('unconfigured');
    expect(integrations.image_providers).toBe('unconfigured');
  });

  it('reports each integration as configured when its DB row has the relevant key', async () => {
    queryOneMock.mockImplementation((sql: string) => {
      if (sql.includes("'integrations.email'")) return Promise.resolve({ setting_value: { api_key: 're_x' } });
      if (sql.includes("'integrations.smtp'")) return Promise.resolve({ setting_value: { host: 'h', user: 'u', pass: 'p' } });
      if (sql.includes("'integrations.payment'")) return Promise.resolve({ setting_value: { secret_key: 'sk_x' } });
      if (sql.includes("'integrations.analytics'")) return Promise.resolve({ setting_value: { ga_id: 'G-X' } });
      if (sql.includes("'integrations.image_providers'")) return Promise.resolve({ setting_value: { unsplash_access_key: 'u' } });
      return Promise.resolve(null);
    });
    const ctx = createApiContext({ method: 'GET' });
    const res = await GET(ctx);
    const body = await parseJson(res);
    expect(body.data.integrations.resend).toBe('configured');
    expect(body.data.integrations.smtp).toBe('configured');
    expect(body.data.integrations.stripe).toBe('configured');
    expect(body.data.integrations.analytics).toBe('configured');
    expect(body.data.integrations.image_providers).toBe('configured');
  });

  it('SMTP requires all three (host + user + pass) — partial config = unconfigured', async () => {
    queryOneMock.mockImplementation((sql: string) => {
      if (sql.includes("'integrations.smtp'")) return Promise.resolve({ setting_value: { host: 'h' } }); // missing user/pass
      return Promise.resolve(null);
    });
    const ctx = createApiContext({ method: 'GET' });
    const res = await GET(ctx);
    const body = await parseJson(res);
    expect(body.data.integrations.smtp).toBe('unconfigured');
  });

  it('falls back to env variables when DB is empty', async () => {
    process.env.RESEND_API_KEY = 're_env_only';
    process.env.STRIPE_SECRET_KEY = 'sk_env_only';
    queryOneMock.mockResolvedValue(null);
    const ctx = createApiContext({ method: 'GET' });
    const res = await GET(ctx);
    const body = await parseJson(res);
    expect(body.data.integrations.resend).toBe('configured');
    expect(body.data.integrations.stripe).toBe('configured');
    expect(body.data.integrations.analytics).toBe('unconfigured'); // no env fallback for GA in summary
  });

  it('integrations summary is null when DB is down so the health field still parses', async () => {
    poolQueryMock.mockRejectedValue(new Error('connection refused'));
    const ctx = createApiContext({ method: 'GET' });
    const res = await GET(ctx);
    expect(res.status).toBe(503);
    const body = await parseJson(res);
    expect(body.data.integrations).toBeNull();
  });

  it('caches the integrations summary across calls within TTL (5 DB queries become 0 on hit)', async () => {
    queryOneMock.mockResolvedValue({ setting_value: { api_key: 're_x' } });
    const ctx = createApiContext({ method: 'GET' });

    await GET(ctx);
    const firstCallCount = queryOneMock.mock.calls.length;
    expect(firstCallCount).toBe(5); // 5 site_settings queries on cold cache

    await GET(ctx);
    await GET(ctx);
    expect(queryOneMock.mock.calls.length).toBe(firstCallCount); // no new DB queries from cache
  });
});
