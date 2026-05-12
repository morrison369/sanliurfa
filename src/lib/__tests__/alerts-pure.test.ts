/**
 * Unit Tests - alert/alerts.ts vi.mock postgres+metrics
 *
 * - recordAlert (insert + alertId return; notifyAdmins eski notification stub'ı kaldırıldıktan
 *   sonra logger.info no-op'a indirildi, mock gerekmiyor)
 * - checkErrorRate (>10% warning, >20% critical alert)
 * - checkPerformance (avgDuration > 1000ms warning, > 3000ms critical; pool > 15 saturation)
 * - getAlerts (status filter)
 *
 * vi.hoisted - postgres + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock, poolMock, metricsCollectorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  poolMock: { query: vi.fn() },
  metricsCollectorMock: {
    getMetrics: vi.fn(),
    getPerformanceStats: vi.fn(),
  },
}));

vi.mock('../postgres', () => ({
  pool: poolMock,
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../metrics', () => ({
  metricsCollector: metricsCollectorMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  poolMock.query.mockReset();
  metricsCollectorMock.getMetrics.mockReset();
  metricsCollectorMock.getPerformanceStats.mockReset();
  poolMock.query.mockResolvedValue({ rowCount: 1 });
  queryOneMock.mockResolvedValue({ id: 'alert-1' });
  queryManyMock.mockResolvedValue([]);
});

import { recordAlert, checkErrorRate, checkPerformance, getAlerts, acknowledgeAlert, resolveAlert } from '../alert/alerts';

describe('recordAlert', () => {
  it('insert + alertId return', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'alert-123' });
    const id = await recordAlert({
      type: 'high_error_rate',
      severity: 'warning',
      title: 'High Errors',
      message: 'Error rate spiked',
    });
    expect(id).toBe('alert-123');
  });

  it('details JSON.stringify when provided', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'a-1' });
    await recordAlert({
      type: 'slow_response',
      severity: 'warning',
      title: 'T',
      message: 'M',
      details: { avgDuration: 2000 },
    });
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][4]).toBe(JSON.stringify({ avgDuration: 2000 }));
  });

  it('details null when not provided', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'a-1' });
    await recordAlert({ type: 'high_error_rate', severity: 'info', title: 'T', message: 'M' });
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][4]).toBeNull();
  });

  it('exception - return null', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await recordAlert({ type: 'high_error_rate', severity: 'info', title: 'T', message: 'M' })).toBeNull();
  });
});

describe('checkErrorRate', () => {
  it('errorRate ≤10 - no alert (only > 10 trigger)', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      errorRate: 5,
      totalRequests: 100,
      totalErrors: 5,
      byStatusCode: {},
    });
    await checkErrorRate();
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('errorRate > 10 + ≤20 - warning severity', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      errorRate: 15,
      totalRequests: 100,
      totalErrors: 15,
      byStatusCode: {},
    });
    await checkErrorRate();
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('warning');
  });

  it('errorRate > 20 - critical severity', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      errorRate: 25,
      totalRequests: 100,
      totalErrors: 25,
      byStatusCode: {},
    });
    await checkErrorRate();
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('critical');
  });
});

describe('checkPerformance', () => {
  beforeEach(() => {
    metricsCollectorMock.getPerformanceStats.mockReturnValue({
      slowQueryCount: 0,
      avgQueryDuration: 0,
      maxQueryDuration: 0,
      dbPoolStatus: { activeConnections: 5, waitingRequests: 0 },
    });
  });

  it('avgDuration ≤1000 - no alert', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      avgDuration: 500, p95Duration: 800, maxDuration: 900,
      slowestEndpoints: [], cacheHitRate: 80,
    });
    await checkPerformance();
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('avgDuration > 1000 + ≤3000 - warning', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      avgDuration: 2000, p95Duration: 3000, maxDuration: 5000,
      slowestEndpoints: [{ endpoint: '/api/slow' }], cacheHitRate: 80,
    });
    await checkPerformance();
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('warning');
  });

  it('avgDuration > 3000 - critical', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      avgDuration: 5000, p95Duration: 8000, maxDuration: 10000,
      slowestEndpoints: [{ endpoint: '/api/slow' }], cacheHitRate: 80,
    });
    await checkPerformance();
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('critical');
  });

  it('dbPool > 15 - pool_saturation alert', async () => {
    metricsCollectorMock.getMetrics.mockReturnValueOnce({
      avgDuration: 100, p95Duration: 200, maxDuration: 300,
      slowestEndpoints: [], cacheHitRate: 80,
    });
    metricsCollectorMock.getPerformanceStats.mockReturnValueOnce({
      slowQueryCount: 0, avgQueryDuration: 0, maxQueryDuration: 0,
      dbPoolStatus: { activeConnections: 16, waitingRequests: 2 },
    });
    await checkPerformance();
    const poolCall = queryOneMock.mock.calls.find((c) => c[1][0] === 'pool_saturation');
    expect(poolCall).toBeDefined();
  });
});

describe('getAlerts', () => {
  it('no filter - returns all alerts', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'a-1' }]);
    const r = await getAlerts();
    expect(r).toHaveLength(1);
  });

  it('type filter applied to SQL', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getAlerts({ type: 'high_error_rate' });
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('AND type = $1');
  });

  it('exception - empty array fallback', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getAlerts()).toEqual([]);
  });
});

describe('acknowledgeAlert / resolveAlert', () => {
  it('acknowledgeAlert - rowCount > 0 → true', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await acknowledgeAlert('a-1', 'admin-1')).toBe(true);
  });

  it('acknowledgeAlert - rowCount 0 → false', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await acknowledgeAlert('non-existent', 'admin-1')).toBe(false);
  });

  it('resolveAlert - rowCount > 0 → true', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await resolveAlert('a-1')).toBe(true);
  });
});
