export function buildPerformanceOptimizationSummary(overrides: Partial<any> = {}) {
  return {
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
    ...overrides,
  };
}

export function buildReleaseGateSummary(overrides: Partial<any> = {}) {
  return {
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
    ...overrides,
  };
}

export function buildNightlySummary(kind: 'regression' | 'e2e', overrides: Partial<any> = {}) {
  return {
    available: true,
    kind,
    generatedAt: kind === 'regression' ? '2026-04-10T01:00:00.000Z' : '2026-04-10T02:00:00.000Z',
    outcome: kind === 'regression' ? 'success' : 'failure',
    successRatePercent: kind === 'regression' ? 86 : 57,
    recentOutcomes: kind === 'regression' ? ['success', 'success', 'failure'] : ['failure', 'success', 'failure'],
    topFailures: [kind === 'regression' ? 'FAIL auth-contracts' : 'Error: timeout on /giris'],
    performanceOptimization: {
      recommendations: { total: kind === 'regression' ? 4 : 3, highPriority: kind === 'regression' ? 2 : 1, mediumPriority: 2 },
      metrics: { slowRequestRate: kind === 'regression' ? 14 : 9, cacheHitRate: kind === 'regression' ? 42 : 48 },
    },
    ...overrides,
  };
}
