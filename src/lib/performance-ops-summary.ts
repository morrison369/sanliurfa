import { logger } from './logging';
import { metricsCollector } from './metrics';
import { CACHE_STRATEGIES, getSlowQueries, suggestIndexes } from './performance-ops-core';

export type PerformanceOpsSummary = {
  generatedAt: string;
  recommendations: {
    total: number;
    highPriority: number;
    mediumPriority: number;
  };
  metrics: {
    slowQueriesCount: number;
    slowRequestRate: number;
    cacheHitRate: number;
    avgRequestDuration: number;
    p95Duration: number;
  };
  cacheStrategies: {
    count: number;
  };
  indexSuggestions: {
    count: number;
    top: string[];
  };
  slowOperations: Array<{
    type: string;
    message: string;
    duration: number;
    timestamp: string;
  }>;
};

export async function getPerformanceOpsSummary(): Promise<PerformanceOpsSummary> {
  try {
    const slowQueries = getSlowQueries(100);
    const indexSuggestions = await suggestIndexes();
    const requestMetrics = metricsCollector.getMetrics();
    const slowOperations = metricsCollector.getSlowOperations(5);

    const recommendations = {
      slowQueries: slowQueries.length > 5,
      slowRequests: requestMetrics.slowRequestRate > 10,
      cacheHitRate: requestMetrics.cacheHitRate < 50,
      indexes: indexSuggestions.length > 0
    };

    return {
      generatedAt: new Date().toISOString(),
      recommendations: {
        total:
          Number(recommendations.slowQueries) +
          Number(recommendations.slowRequests) +
          Number(recommendations.cacheHitRate) +
          Number(recommendations.indexes),
        highPriority:
          Number(recommendations.slowQueries) +
          Number(recommendations.slowRequests),
        mediumPriority:
          Number(recommendations.cacheHitRate) +
          Number(recommendations.indexes)
      },
      metrics: {
        slowQueriesCount: slowQueries.length,
        slowRequestRate: requestMetrics.slowRequestRate,
        cacheHitRate: requestMetrics.cacheHitRate,
        avgRequestDuration: requestMetrics.avgDuration,
        p95Duration: requestMetrics.p95Duration
      },
      cacheStrategies: {
        count: Object.keys(CACHE_STRATEGIES).length
      },
      indexSuggestions: {
        count: indexSuggestions.length,
        top: indexSuggestions.slice(0, 3)
      },
      slowOperations: slowOperations.map((op) => ({
        type: op.type,
        message: op.message,
        duration: op.duration,
        timestamp: new Date(op.timestamp).toISOString()
      }))
    };
  } catch (error) {
    logger.error('Failed to build performance ops summary', error instanceof Error ? error : new Error(String(error)));
    return {
      generatedAt: new Date().toISOString(),
      recommendations: {
        total: 0,
        highPriority: 0,
        mediumPriority: 0
      },
      metrics: {
        slowQueriesCount: 0,
        slowRequestRate: 0,
        cacheHitRate: 0,
        avgRequestDuration: 0,
        p95Duration: 0
      },
      cacheStrategies: {
        count: Object.keys(CACHE_STRATEGIES).length
      },
      indexSuggestions: {
        count: 0,
        top: []
      },
      slowOperations: []
    };
  }
}
