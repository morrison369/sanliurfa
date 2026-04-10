import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolQueryMock = vi.fn();
const getRedisClientMock = vi.fn();
const isRedisAvailableMock = vi.fn();
const recordRequestMock = vi.fn();
const suggestIndexesMock = vi.fn();
const getSlowQueriesOptimizerMock = vi.fn();
const getMetricsMock = vi.fn();
const getSlowOperationsMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

vi.mock('../../../lib/postgres', () => ({
  pool: {
    query: poolQueryMock,
  },
}));

vi.mock('../../../lib/cache', () => ({
  getRedisClient: getRedisClientMock,
  isRedisAvailable: isRedisAvailableMock,
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
  metricsCollector: {
    getMetrics: getMetricsMock,
    getSlowOperations: getSlowOperationsMock,
  },
}));

vi.mock('../../../lib/performance-optimizer', () => ({
  suggestIndexes: suggestIndexesMock,
  getSlowQueries: getSlowQueriesOptimizerMock,
  CACHE_STRATEGIES: {
    places_list: { key: 'places_list', ttl: 600 },
    search_results: { key: 'search_results', ttl: 3600 },
  },
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('runtime admin ops contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    poolQueryMock.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    isRedisAvailableMock.mockReturnValue(true);
    getRedisClientMock.mockResolvedValue({
      ping: vi.fn().mockResolvedValue('PONG'),
    });

    suggestIndexesMock.mockResolvedValue([
      'CREATE INDEX idx_reviews_place_id ON reviews(place_id)',
      'CREATE INDEX idx_reviews_user_id ON reviews(user_id)',
    ]);
    getSlowQueriesOptimizerMock.mockReturnValue([
      { query: 'SELECT * FROM reviews', duration: 180, timestamp: Date.now(), isSlow: true },
      { query: 'SELECT * FROM places', duration: 140, timestamp: Date.now(), isSlow: true },
      { query: 'SELECT * FROM users', duration: 130, timestamp: Date.now(), isSlow: true },
      { query: 'SELECT * FROM favorites', duration: 125, timestamp: Date.now(), isSlow: true },
      { query: 'SELECT * FROM flags', duration: 122, timestamp: Date.now(), isSlow: true },
      { query: 'SELECT * FROM queue', duration: 118, timestamp: Date.now(), isSlow: true },
    ]);
    getMetricsMock.mockReturnValue({
      totalRequests: 100,
      totalErrors: 4,
      errorRate: 4,
      avgDuration: 220,
      minDuration: 10,
      maxDuration: 1200,
      p95Duration: 780,
      cacheHitRate: 42,
      slowRequests: 14,
      slowRequestRate: 14,
      byEndpoint: {},
      byStatusCode: { '200': 96, '500': 4 },
      slowestEndpoints: [],
    });
    getSlowOperationsMock.mockReturnValue([
      {
        type: 'query',
        message: 'reviews query exceeded threshold',
        duration: 1200,
        timestamp: Date.now(),
      },
    ]);
  });

  it('rejects unauthorized detailed health access', async () => {
    const { GET } = await import('../health/detailed.ts');
    const request = new Request('https://example.com/api/health/detailed');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
  });

  it('returns degraded detailed health when redis is down but database is up', async () => {
    isRedisAvailableMock.mockReturnValue(false);
    const { GET } = await import('../health/detailed.ts');
    const request = new Request('https://example.com/api/health/detailed');

    const response = await GET({
      request,
      locals: { isAdmin: true },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('degraded');
    expect(body.data.checks.database.status).toBe('up');
    expect(body.data.checks.redis.status).toBe('down');
  });

  it('returns blocked detailed health and 503 when database is down', async () => {
    poolQueryMock.mockRejectedValueOnce(new Error('db unavailable'));
    const { GET } = await import('../health/detailed.ts');
    const request = new Request('https://example.com/api/health/detailed');

    const response = await GET({
      request,
      locals: { isAdmin: true },
    } as any);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.data.status).toBe('blocked');
    expect(body.data.checks.database.status).toBe('down');
    expect(body.data.checks.database.error).toBe('db unavailable');
  });

  it('rejects unauthorized optimization access', async () => {
    const { GET } = await import('../admin/performance/optimization.ts');
    const request = new Request('https://example.com/api/admin/performance/optimization');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
    expect(recordRequestMock).toHaveBeenCalledWith(
      'GET',
      '/api/admin/performance/optimization',
      403,
      expect.any(Number)
    );
  });

  it('returns optimization recommendations and normalized slow operation fields', async () => {
    const { GET } = await import('../admin/performance/optimization.ts');
    const request = new Request('https://example.com/api/admin/performance/optimization');

    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.recommendations).toHaveLength(4);
    expect(body.data.data.metrics.slowQueriesCount).toBe(6);
    expect(body.data.data.metrics.slowRequestRate).toBe(14);
    expect(body.data.data.cacheStrategies.strategiesCount).toBe(2);
    expect(body.data.data.indexSuggestions).toHaveLength(2);
    expect(body.data.data.slowOperations[0].type).toBe('query');
    expect(body.data.data.slowOperations[0].message).toBe('reviews query exceeded threshold');
    expect(recordRequestMock).toHaveBeenCalledWith(
      'GET',
      '/api/admin/performance/optimization',
      200,
      expect.any(Number)
    );
  });
});
