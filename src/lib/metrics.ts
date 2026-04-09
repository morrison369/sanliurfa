// API metrics and performance tracking

/**
 * Request metric record
 */
export interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  cacheHit?: boolean;
  cached?: boolean;
  error?: string;
  isSlow?: boolean;
}

/**
 * Query performance record
 */
export interface QueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  isSlow: boolean;
  rowCount?: number;
  error?: string;
  source?: string;
}

/**
 * Slow operation record
 */
export interface SlowOperationMetric {
  type: 'query' | 'request' | 'cache' | 'pool';
  message: string;
  duration: number;
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Aggregated metrics
 */
export interface AggregatedMetrics {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  cacheHitRate: number;
  slowRequests: number;
  slowRequestRate: number;
  byEndpoint: Record<
    string,
    {
      count: number;
      avgDuration: number;
      errorCount: number;
      cacheHits: number;
      cacheEfficiency: number;
      slowCount: number;
    }
  >;
  byStatusCode: Record<string, number>;
  slowestEndpoints: Array<{
    endpoint: string;
    avgDuration: number;
    count: number;
  }>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  totalRequests: number;
  slowQueryCount: number;
  slowRequestCount: number;
  avgQueryDuration: number;
  maxQueryDuration: number;
  slowOperations: SlowOperationMetric[];
  dbPoolStatus: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
  };
}

/**
 * Metrics storage with time-based retention
 */
class MetricsCollector {
  private metrics: RequestMetric[] = [];
  private queryMetrics: QueryMetric[] = [];
  private slowOperations: SlowOperationMetric[] = [];
  private readonly maxAge = 60 * 60 * 1000; // 1 hour in ms
  private lastCleanup = Date.now();
  private dbPoolStatus: PerformanceStats['dbPoolStatus'] = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0
  };

  /**
   * Record a request metric
   */
  recordMetric(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    });

    // Cleanup old metrics every 100 records
    if (this.metrics.length % 100 === 0) {
      this.cleanup();
    }
  }

  /**
   * Record a database query metric
   */
  recordQuery(query: string, duration: number, rowCount?: number, error?: string, source?: string): void {
    const isSlow = duration > performanceThresholds.slowQueryMs;
    this.queryMetrics.push({
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now(),
      isSlow,
      rowCount,
      error,
      source
    });
  }

  /**
   * Record a slow operation (query, request, or cache)
   */
  recordSlowOperation(
    type: 'query' | 'request' | 'cache' | 'pool',
    message: string,
    duration: number,
    context?: Record<string, any>,
    stack?: string
  ): void {
    this.slowOperations.push({
      type,
      message,
      duration,
      timestamp: Date.now(),
      context,
      stack: stack?.substring(0, 500) // Truncate stack trace
    });

    // Keep only last 500 slow operations
    if (this.slowOperations.length > 500) {
      this.slowOperations = this.slowOperations.slice(-500);
    }
  }

  /**
   * Update database pool status
   */
  setPoolStatus(status: PerformanceStats['dbPoolStatus']): void {
    this.dbPoolStatus = status;
  }

  /**
   * Remove metrics older than maxAge
   */
  private cleanup(): void {
    const now = Date.now();
    const beforeRequests = this.metrics.length;
    const beforeQueries = this.queryMetrics.length;

    this.metrics = this.metrics.filter(m => now - m.timestamp < this.maxAge);
    this.queryMetrics = this.queryMetrics.filter(q => now - q.timestamp < this.maxAge);

    const removedRequests = beforeRequests - this.metrics.length;
    const removedQueries = beforeQueries - this.queryMetrics.length;

    if (removedRequests > 0 || removedQueries > 0) {
      console.debug(`Metrics cleanup: removed ${removedRequests} request records, ${removedQueries} query records`);
    }

    this.lastCleanup = now;
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): AggregatedMetrics {
    // Cleanup if needed
    if (Date.now() - this.lastCleanup > 5 * 60 * 1000) {
      this.cleanup();
    }

    const total = this.metrics.length;

    if (total === 0) {
      return {
        totalRequests: 0,
        totalErrors: 0,
        errorRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        cacheHitRate: 0,
        slowRequests: 0,
        slowRequestRate: 0,
        byEndpoint: {},
        byStatusCode: {},
        slowestEndpoints: []
      };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const errors = this.metrics.filter(m => m.statusCode >= 400);
    const cacheHits = this.metrics.filter(m => m.cacheHit);
    const slowRequests = this.metrics.filter(m => m.duration > performanceThresholds.slowRequestMs);

    const byEndpoint: Record<string, any> = {};
    const byStatusCode: Record<string, number> = {};

    for (const metric of this.metrics) {
      const endpoint = `${metric.method} ${metric.path}`;

      if (!byEndpoint[endpoint]) {
        byEndpoint[endpoint] = {
          count: 0,
          avgDuration: 0,
          errorCount: 0,
          cacheHits: 0,
          slowCount: 0,
          durations: [] as number[]
        };
      }

      byEndpoint[endpoint].count++;
      byEndpoint[endpoint].durations.push(metric.duration);
      if (metric.statusCode >= 400) {
        byEndpoint[endpoint].errorCount++;
      }
      if (metric.cacheHit) {
        byEndpoint[endpoint].cacheHits++;
      }
      if (metric.duration > performanceThresholds.slowRequestMs) {
        byEndpoint[endpoint].slowCount++;
      }

      byStatusCode[metric.statusCode] = (byStatusCode[metric.statusCode] || 0) + 1;
    }

    // Calculate averages and cache efficiency
    for (const endpoint of Object.keys(byEndpoint)) {
      const endpointData = byEndpoint[endpoint];
      const durationList = endpointData.durations;
      endpointData.avgDuration = Math.round(durationList.reduce((a: number, b: number) => a + b, 0) / durationList.length);
      endpointData.cacheEfficiency = endpointData.count > 0
        ? Math.round((endpointData.cacheHits / endpointData.count) * 100)
        : 0;
      delete endpointData.durations;
    }

    // Get slowest endpoints
    const slowestEndpoints = Object.entries(byEndpoint)
      .map(([endpoint, data]) => ({
        endpoint,
        avgDuration: data.avgDuration,
        count: data.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      totalRequests: total,
      totalErrors: errors.length,
      errorRate: Math.round((errors.length / total) * 100),
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / total),
      minDuration: durations[0],
      maxDuration: durations[total - 1],
      p95Duration: durations[Math.floor(total * 0.95)],
      cacheHitRate: Math.round((cacheHits.length / total) * 100),
      slowRequests: slowRequests.length,
      slowRequestRate: Math.round((slowRequests.length / total) * 100),
      byEndpoint,
      byStatusCode,
      slowestEndpoints
    };
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(method: string, path: string): RequestMetric[] {
    return this.metrics.filter(m => m.method === method && m.path === path);
  }

  /**
   * Get raw metrics (for detailed analysis)
   */
  getRawMetrics(): RequestMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics count
   */
  getCount(): number {
    return this.metrics.length;
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const slowQueries = this.queryMetrics.filter(q => q.isSlow);
    const slowRequestsList = this.metrics.filter(m => m.duration > performanceThresholds.slowRequestMs);

    const queryDurations = this.queryMetrics.map(q => q.duration).sort((a, b) => a - b);
    const avgQueryDuration = queryDurations.length > 0
      ? Math.round(queryDurations.reduce((a, b) => a + b, 0) / queryDurations.length)
      : 0;
    const maxQueryDuration = queryDurations.length > 0 ? queryDurations[queryDurations.length - 1] : 0;

    return {
      totalRequests: this.metrics.length,
      slowQueryCount: slowQueries.length,
      slowRequestCount: slowRequestsList.length,
      avgQueryDuration,
      maxQueryDuration,
      slowOperations: this.slowOperations.slice(-50), // Return last 50
      dbPoolStatus: this.dbPoolStatus
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 20): QueryMetric[] {
    return this.queryMetrics
      .filter(q => q.isSlow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get slow operations
   */
  getSlowOperations(limit: number = 20): SlowOperationMetric[] {
    return this.slowOperations.slice(-limit).reverse();
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics = [];
    this.queryMetrics = [];
    this.slowOperations = [];
  }
}

/**
 * Global metrics collector instance
 */
export const metricsCollector = new MetricsCollector();

/**
 * Helper to record request metric
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  options?: {
    cacheHit?: boolean;
    error?: string;
  }
): void {
  metricsCollector.recordMetric({
    method,
    path,
    statusCode,
    duration,
    cacheHit: options?.cacheHit,
    error: options?.error
  });
}

/**
 * Performance thresholds for alerts
 */
export const performanceThresholds = {
  slowQueryMs: 100,
  slowRequestMs: 500,
  slowCacheMs: 50,
  highErrorRatePercent: 5
};

/**
 * Check if a request is slow
 */
export function isSlowRequest(duration: number): boolean {
  return duration > performanceThresholds.slowRequestMs;
}

/**
 * Check if a query is slow
 */
export function isSlowQuery(duration: number): boolean {
  return duration > performanceThresholds.slowQueryMs;
}

/**
 * Check if cache lookup is slow
 */
export function isSlowCache(duration: number): boolean {
  return duration > performanceThresholds.slowCacheMs;
}
