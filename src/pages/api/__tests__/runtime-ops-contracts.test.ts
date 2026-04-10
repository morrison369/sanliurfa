import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const poolQueryMock = vi.fn();
const getRedisClientMock = vi.fn();
const isRedisAvailableMock = vi.fn();
const getRuntimeIntegrationSettingsMock = vi.fn();
const getNightlyOpsSummaryMock = vi.fn();
const getReleaseGateSummaryMock = vi.fn();
const updatePoolStatusMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

const getPerformanceStatsMock = vi.fn();
const getMetricsMock = vi.fn();
const getSlowQueriesMock = vi.fn();
const getSlowOperationsMock = vi.fn();
const getEndpointMetricsMock = vi.fn();

vi.mock('../../../lib/postgres', () => ({
  pool: {
    query: poolQueryMock,
  },
  updatePoolStatus: updatePoolStatusMock,
}));

vi.mock('../../../lib/cache', () => ({
  getRedisClient: getRedisClientMock,
  isRedisAvailable: isRedisAvailableMock,
}));

vi.mock('../../../lib/runtime-integration-settings', () => ({
  getRuntimeIntegrationSettings: getRuntimeIntegrationSettingsMock,
}));

vi.mock('../../../lib/nightly-ops-summary', () => ({
  getNightlyOpsSummary: getNightlyOpsSummaryMock,
}));

vi.mock('../../../lib/release-gate-summary', () => ({
  getReleaseGateSummary: getReleaseGateSummaryMock,
}));

vi.mock('../../../lib/metrics', () => ({
  metricsCollector: {
    getPerformanceStats: getPerformanceStatsMock,
    getMetrics: getMetricsMock,
    getSlowQueries: getSlowQueriesMock,
    getSlowOperations: getSlowOperationsMock,
    getEndpointMetrics: getEndpointMetricsMock,
  },
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('runtime ops contracts', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    process.env.NODE_ENV = 'test';

    poolQueryMock.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    isRedisAvailableMock.mockReturnValue(true);
    getRedisClientMock.mockResolvedValue({
      ping: vi.fn().mockResolvedValue('PONG'),
    });
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: '',
      analyticsId: '',
    });
    getReleaseGateSummaryMock.mockResolvedValue({
      available: true,
      generatedAt: '2026-04-10T08:00:00.000Z',
      finalStatus: 'passed',
      failedStepCount: 0,
    });
    getNightlyOpsSummaryMock.mockResolvedValue({
      regression: {
        available: true,
        generatedAt: '2026-04-10T07:00:00.000Z',
        outcome: 'success',
        successRatePercent: 100,
      },
      e2e: {
        available: false,
        generatedAt: null,
        outcome: 'missing',
        successRatePercent: null,
      },
    });

    getPerformanceStatsMock.mockReturnValue({
      totalRequests: 10,
      slowQueryCount: 1,
      slowRequestCount: 1,
      avgQueryDuration: 42,
      maxQueryDuration: 120,
      slowOperations: [],
      dbPoolStatus: {
        totalConnections: 5,
        activeConnections: 2,
        idleConnections: 3,
        waitingRequests: 0,
      },
    });
    getMetricsMock.mockReturnValue({
      totalRequests: 10,
      totalErrors: 0,
      errorRate: 0,
      avgDuration: 120,
      minDuration: 20,
      maxDuration: 400,
      p95Duration: 250,
      cacheHitRate: 50,
      slowRequests: 1,
      slowRequestRate: 10,
      byEndpoint: {},
      byStatusCode: { '200': 10 },
      slowestEndpoints: [],
    });
    getSlowQueriesMock.mockReturnValue([]);
    getSlowOperationsMock.mockReturnValue([]);
    getEndpointMetricsMock.mockImplementation((_method: string, path: string) => {
      if (path === '/api/auth/oauth/authorize') {
        return Array.from({ length: 10 }, () => ({
          method: 'GET',
          path,
          statusCode: 200,
          duration: 100,
          timestamp: Date.now(),
        }));
      }

      if (path === '/api/auth/oauth/callback') {
        return [
          ...Array.from({ length: 97 }, () => ({
            method: 'GET',
            path,
            statusCode: 200,
            duration: 120,
            timestamp: Date.now(),
          })),
          ...Array.from({ length: 3 }, () => ({
            method: 'GET',
            path,
            statusCode: 500,
            duration: 130,
            timestamp: Date.now(),
          })),
        ];
      }

      if (path === '/api/webhooks/stripe') {
        return Array.from({ length: 10 }, () => ({
          method: 'POST',
          path,
          statusCode: 200,
          duration: 1200,
          timestamp: Date.now(),
        }));
      }

      return [];
    });
  });

  it('returns healthy health status outside production when db and redis are up', async () => {
    const { GET } = await import('../health.ts');
    const request = new Request('https://example.com/api/health');

    const response = await GET({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('healthy');
    expect(body.data.checks.database.status).toBe('up');
    expect(body.data.checks.redis.status).toBe('up');
    expect(body.data.checks.integrations.resend.configured).toBe(false);
    expect(body.data.checks.artifacts.releaseGate).toEqual({
      available: true,
      generatedAt: '2026-04-10T08:00:00.000Z',
      status: 'healthy',
    });
    expect(body.data.checks.artifacts.nightlyE2E).toEqual({
      available: false,
      generatedAt: null,
      status: 'blocked',
    });
  });

  it('returns degraded health status in production when integrations are incomplete', async () => {
    process.env.NODE_ENV = 'production';
    poolQueryMock.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    isRedisAvailableMock.mockReturnValue(true);
    getRedisClientMock.mockResolvedValueOnce({
      ping: vi.fn().mockResolvedValue('PONG'),
    });
    getRuntimeIntegrationSettingsMock.mockResolvedValueOnce({
      resendApiKey: 're_live_123',
      analyticsId: '',
    });
    const { GET } = await import('../health.ts');
    const request = new Request('https://example.com/api/health');

    const response = await GET({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('degraded');
  });

  it('returns blocked health status and 503 when database is down', async () => {
    poolQueryMock.mockRejectedValueOnce(new Error('db down'));
    isRedisAvailableMock.mockReturnValue(false);
    const { GET } = await import('../health.ts');
    const request = new Request('https://example.com/api/health');

    const response = await GET({ request } as any);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.data.status).toBe('blocked');
    expect(body.data.checks.database.status).toBe('down');
  });

  it('rejects unauthorized performance access', async () => {
    const { GET } = await import('../performance.ts');
    const request = new Request('https://example.com/api/performance');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
  });

  it('returns degraded slo statuses when thresholds are warning-level', async () => {
    const { GET } = await import('../performance.ts');
    const request = new Request('https://example.com/api/performance');

    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.serviceLevelObjectives.oauth.status).toBe('degraded');
    expect(body.data.serviceLevelObjectives.oauth.callbackErrorRatePercent).toBe(3);
    expect(body.data.serviceLevelObjectives.webhookIngestion.status).toBe('healthy');
  });

  it('returns blocked webhook ingestion status when retry exhaustion is present', async () => {
    getEndpointMetricsMock.mockImplementation((_method: string, path: string) => {
      if (path === '/api/auth/oauth/authorize') {
        return [];
      }

      if (path === '/api/auth/oauth/callback') {
        return [];
      }

      if (path === '/api/webhooks/stripe') {
        return [
          {
            method: 'POST',
            path,
            statusCode: 500,
            duration: 3200,
            timestamp: Date.now(),
            error: 'retry_exhausted',
          },
          {
            method: 'POST',
            path,
            statusCode: 200,
            duration: 800,
            timestamp: Date.now(),
          },
        ];
      }

      return [];
    });

    const { GET } = await import('../performance.ts');
    const request = new Request('https://example.com/api/performance');

    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.serviceLevelObjectives.webhookIngestion.status).toBe('blocked');
    expect(body.data.serviceLevelObjectives.webhookIngestion.retryExhaustedCount).toBe(1);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });
});
