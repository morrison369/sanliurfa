import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getDashboardOverviewMock = vi.fn();
const getSystemMetricsMock = vi.fn();
const getOperationalSnapshotMock = vi.fn();
const getPerformanceOptimizationSummaryMock = vi.fn();
const getModerationStatsMock = vi.fn();
const getModerationQueueMock = vi.fn();
const getContentFlagsMock = vi.fn();
const getRuntimeIntegrationSettingsMock = vi.fn();
const verifyRuntimeIntegrationSettingsMock = vi.fn();
const getReleaseGateSummaryMock = vi.fn();
const getNightlyOpsSummaryMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../../../lib/admin-dashboard', () => ({
  getDashboardOverview: getDashboardOverviewMock,
  getSystemMetrics: getSystemMetricsMock,
  getOperationalSnapshot: getOperationalSnapshotMock,
  getPerformanceOptimizationSummary: getPerformanceOptimizationSummaryMock,
}));

vi.mock('../../../lib/admin-moderation', () => ({
  getModerationStats: getModerationStatsMock,
  getModerationQueue: getModerationQueueMock,
  getContentFlags: getContentFlagsMock,
}));

vi.mock('../../../lib/runtime-integration-settings', () => ({
  getRuntimeIntegrationSettings: getRuntimeIntegrationSettingsMock,
  verifyRuntimeIntegrationSettings: verifyRuntimeIntegrationSettingsMock,
}));

vi.mock('../../../lib/release-gate-summary', () => ({
  getReleaseGateSummary: getReleaseGateSummaryMock,
}));

vi.mock('../../../lib/nightly-ops-summary', () => ({
  getNightlyOpsSummary: getNightlyOpsSummaryMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin dashboard contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getDashboardOverviewMock.mockResolvedValue({
      users: { total: 10, new: 1, active: 5 },
      content: { places: 20, reviews: 40, comments: 30, newReviews: 2 },
      flags: { pending: 1, resolved: 3, total: 4 },
      moderation: { totalActions: 8, warnings: 2, suspensions: 1, bans: 0 },
      period: 30,
    });
    getSystemMetricsMock.mockResolvedValue({
      database: { totalUsers: 10, totalPlaces: 20, totalReviews: 40 },
      users: { total: 10, newThisWeek: 1, activeToday: 4 },
      moderation: { pendingItems: 2, activeCases: 1 },
      timestamp: new Date().toISOString(),
    });
    getOperationalSnapshotMock.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      oauth: { callback: { sampleSize: 12, errorRatePercent: 1 } },
      webhook: { stripe: { sampleSize: 15, errorRatePercent: 0, p95DurationMs: 250, duplicateRatePercent: 0 } },
      search: { periodDays: 7, totalTopSearches: 21, topQueries: [{ query: 'urfa', count: 9 }] },
    });
    getPerformanceOptimizationSummaryMock.mockResolvedValue({
      generatedAt: '2026-04-10T03:00:00.000Z',
      recommendations: { total: 4, highPriority: 2, mediumPriority: 2 },
      metrics: {
        slowQueriesCount: 6,
        slowRequestRate: 14,
        cacheHitRate: 42,
        avgRequestDuration: 220,
        p95Duration: 780,
      },
      cacheStrategies: { count: 2 },
      indexSuggestions: {
        count: 3,
        top: ['CREATE INDEX idx_reviews_place_id ON reviews(place_id)'],
      },
      slowOperations: [
        {
          type: 'query',
          message: 'reviews query exceeded threshold',
          duration: 1200,
          timestamp: '2026-04-10T03:00:00.000Z',
        },
      ],
    });
    getModerationStatsMock.mockResolvedValue({
      queue: { pending: 2, inReview: 1 },
      flags: { highSeverity: 1 },
      actions: { suspensions: 1 },
    });
    getModerationQueueMock.mockImplementation(async (_status: string, limit: number) => (
      limit >= 1000 ? [{ id: 'q1' }, { id: 'q2' }] : [{ id: 'q0' }]
    ));
    getContentFlagsMock.mockImplementation(async (_status: string, limit: number) => (
      limit >= 1000 ? [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }] : [{ id: 'f0' }]
    ));
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: 're_live_123',
      analyticsId: '',
      source: {
        resendApiKey: 'admin',
        analyticsId: 'none',
      },
    });
    verifyRuntimeIntegrationSettingsMock.mockResolvedValue({
      resend: { status: 'verified', message: 'ok', checkedAt: '2026-04-10T00:00:00.000Z' },
      analytics: { status: 'not_configured', message: 'missing', checkedAt: '2026-04-10T00:00:00.000Z' },
      summary: { healthy: false, checkedAt: '2026-04-10T00:00:00.000Z' },
    });
    getReleaseGateSummaryMock.mockResolvedValue({
      available: true,
      generatedAt: '2026-04-10T00:00:00.000Z',
      finalStatus: 'passed',
      blockingFailedSteps: [],
      advisoryFailedSteps: [],
      failedStepCount: 0,
      performanceOptimization: {
        recommendations: { total: 4, highPriority: 2, mediumPriority: 2 },
        metrics: { slowRequestRate: 14, cacheHitRate: 42 },
      },
      steps: [
        {
          step: 'TypeScript app gate',
          command: 'npm run typecheck:app',
          advisory: false,
          status: 'passed',
        },
      ],
    });
    getNightlyOpsSummaryMock.mockResolvedValue({
      regression: {
        available: true,
        kind: 'regression',
        generatedAt: '2026-04-10T01:00:00.000Z',
        outcome: 'success',
        successRatePercent: 86,
        recentOutcomes: ['success', 'success', 'failure'],
        topFailures: ['FAIL auth-contracts'],
        performanceOptimization: {
          recommendations: { total: 4, highPriority: 2, mediumPriority: 2 },
          metrics: { slowRequestRate: 14, cacheHitRate: 42 },
        },
      },
      e2e: {
        available: true,
        kind: 'e2e',
        generatedAt: '2026-04-10T02:00:00.000Z',
        outcome: 'failure',
        successRatePercent: 57,
        recentOutcomes: ['failure', 'success', 'failure'],
        topFailures: ['Error: timeout on /giris'],
        performanceOptimization: {
          recommendations: { total: 3, highPriority: 1, mediumPriority: 2 },
          metrics: { slowRequestRate: 9, cacheHitRate: 48 },
        },
      },
    });
  });

  it('rejects unauthorized admin dashboard overview access', async () => {
    const { GET } = await import('../admin/dashboard/overview.ts');
    const request = new Request('https://example.com/api/admin/dashboard/overview?days=30');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
    expect(getDashboardOverviewMock).not.toHaveBeenCalled();
  });

  it('returns operational snapshot and integration sources in dashboard overview', async () => {
    const { GET } = await import('../admin/dashboard/overview.ts');
    const request = new Request('https://example.com/api/admin/dashboard/overview?days=30');

    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.integrations.resend.source).toBe('admin');
    expect(body.data.data.integrations.analytics.source).toBe('none');
    expect(body.data.data.integrations.summary.configuredCount).toBe(1);
    expect(body.data.data.integrations.summary.fullyConfigured).toBe(false);
    expect(body.data.data.integrations.verification.summary.healthy).toBe(false);
    expect(body.data.data.integrations.verification.resend.status).toBe('verified');
    expect(body.data.data.releaseGate.finalStatus).toBe('passed');
    expect(body.data.data.releaseGate.failedStepCount).toBe(0);
    expect(body.data.data.releaseGate.performanceOptimization.recommendations.total).toBe(4);
    expect(body.data.data.releaseGate.steps[0].step).toBe('TypeScript app gate');
    expect(body.data.data.nightly.regression.successRatePercent).toBe(86);
    expect(body.data.data.nightly.regression.performanceOptimization.metrics.slowRequestRate).toBe(14);
    expect(body.data.data.nightly.e2e.outcome).toBe('failure');
    expect(body.data.data.nightly.e2e.performanceOptimization.recommendations.total).toBe(3);
    expect(body.data.data.statusSummary.overall).toBe('degraded');
    expect(body.data.data.operational.oauth.callback.sampleSize).toBe(12);
    expect(body.data.data.operational.search.topQueries[0].query).toBe('urfa');
    expect(body.data.data.performanceOptimization.recommendations.total).toBe(4);
    expect(body.data.data.performanceOptimization.metrics.slowRequestRate).toBe(14);
    expect(body.data.data.performanceOptimization.slowOperations[0].type).toBe('query');
    expect(body.data.data.artifactHealth.releaseGate.available).toBe(true);
    expect(body.data.data.artifactHealth.performanceOps.generatedAt).toBe('2026-04-10T03:00:00.000Z');
  });

  it('returns system metrics with health and operational summary', async () => {
    const { GET } = await import('../admin/system/metrics.ts');
    const request = new Request('https://example.com/api/admin/system/metrics');

    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.health.status).toBe('degraded');
    expect(body.data.data.pendingWork.queueCount).toBe(2);
    expect(body.data.data.pendingWork.flagCount).toBe(3);
    expect(body.data.data.health.integrations.summary.configuredCount).toBe(1);
    expect(body.data.data.nightly.regression.successRatePercent).toBe(86);
    expect(body.data.data.releaseGate.finalStatus).toBe('passed');
    expect(body.data.data.statusSummary.integrations).toBe('degraded');
    expect(body.data.data.statusSummary.regression).toBe('healthy');
    expect(body.data.data.statusSummary.e2e).toBe('degraded');
    expect(body.data.data.statusSummary.releaseGate).toBe('healthy');
    expect(body.data.data.statusSummary.overall).toBe('degraded');
    expect(body.data.data.operational.webhook.stripe.p95DurationMs).toBe(250);
    expect(body.data.data.performanceOptimization.indexSuggestions.count).toBe(3);
    expect(body.data.data.performanceOptimization.cacheStrategies.count).toBe(2);
  });

  it('returns release gate summary via dedicated admin endpoint', async () => {
    const { GET } = await import('../admin/system/release-gate-summary.ts');
    const request = new Request('https://example.com/api/admin/system/release-gate-summary');

    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.finalStatus).toBe('passed');
    expect(body.data.data.available).toBe(true);
  });
});
