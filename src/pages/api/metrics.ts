import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, getRequestId } from '../../lib/api';
import { pool, readReplicaPool } from '../../lib/postgres';
import { getRedisClient, isRedisAvailable } from '../../lib/cache';

/**
 * Prometheus-compatible metrics endpoint
 * Returns application metrics in Prometheus exposition format
 */

// Simple in-memory metrics store (use Prometheus client in production)
const metrics = {
  httpRequests: new Map<string, number>(),
  httpRequestDuration: new Map<string, number[]>(),
  activeConnections: 0,
  errors: new Map<string, number>(),
};

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(method: string, route: string, status: number, duration: number): void {
  const key = `${method}:${route}:${status}`;
  metrics.httpRequests.set(key, (metrics.httpRequests.get(key) || 0) + 1);
  
  const durationKey = `${method}:${route}`;
  const durations = metrics.httpRequestDuration.get(durationKey) || [];
  durations.push(duration);
  // Keep last 1000 measurements
  if (durations.length > 1000) durations.shift();
  metrics.httpRequestDuration.set(durationKey, durations);
}

/**
 * Record error
 */
export function recordError(type: string): void {
  metrics.errors.set(type, (metrics.errors.get(type) || 0) + 1);
}

/**
 * Calculate average from array
 */
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate percentile
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * GET /api/metrics - Prometheus metrics endpoint
 */
export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  
  try {
    // Basic auth check (in production, use proper auth)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.METRICS_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return apiError(
        'UNAUTHORIZED', 
        'Invalid or missing authorization', 
        HttpStatus.UNAUTHORIZED, 
        undefined, 
        requestId
      );
    }

    // Collect system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Database pool status
    const dbPoolStatus = {
      total: (pool as any).totalCount || 0,
      idle: (pool as any).idleCount || 0,
      waiting: (pool as any).waitingCount || 0,
    };
    
    const replicaPoolStatus = readReplicaPool ? {
      total: (readReplicaPool as any).totalCount || 0,
      idle: (readReplicaPool as any).idleCount || 0,
      waiting: (readReplicaPool as any).waitingCount || 0,
    } : null;
    
    // Redis status
    const redisStatus = isRedisAvailable();
    
    // Build Prometheus format output
    const output: string[] = [];
    
    // Process metrics
    output.push('# HELP process_uptime_seconds Process uptime in seconds');
    output.push('# TYPE process_uptime_seconds gauge');
    output.push(`process_uptime_seconds ${uptime}`);
    
    output.push('# HELP process_memory_usage_bytes Process memory usage');
    output.push('# TYPE process_memory_usage_bytes gauge');
    output.push(`process_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`);
    output.push(`process_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}`);
    output.push(`process_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}`);
    output.push(`process_memory_usage_bytes{type="external"} ${memoryUsage.external || 0}`);
    
    // Database metrics
    output.push('# HELP db_pool_total Total database connections');
    output.push('# TYPE db_pool_total gauge');
    output.push(`db_pool_total{pool="primary"} ${dbPoolStatus.total}`);
    if (replicaPoolStatus) {
      output.push(`db_pool_total{pool="replica"} ${replicaPoolStatus.total}`);
    }
    
    output.push('# HELP db_pool_idle Idle database connections');
    output.push('# TYPE db_pool_idle gauge');
    output.push(`db_pool_idle{pool="primary"} ${dbPoolStatus.idle}`);
    if (replicaPoolStatus) {
      output.push(`db_pool_idle{pool="replica"} ${replicaPoolStatus.idle}`);
    }
    
    output.push('# HELP db_pool_waiting Waiting database clients');
    output.push('# TYPE db_pool_waiting gauge');
    output.push(`db_pool_waiting{pool="primary"} ${dbPoolStatus.waiting}`);
    
    // Redis metrics
    output.push('# HELP redis_available Redis availability');
    output.push('# TYPE redis_available gauge');
    output.push(`redis_available ${redisStatus ? 1 : 0}`);
    
    // HTTP request metrics
    output.push('# HELP http_requests_total Total HTTP requests');
    output.push('# TYPE http_requests_total counter');
    metrics.httpRequests.forEach((count, key) => {
      const [method, route, status] = key.split(':');
      output.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    });
    
    // HTTP request duration
    output.push('# HELP http_request_duration_seconds HTTP request duration');
    output.push('# TYPE http_request_duration_seconds summary');
    metrics.httpRequestDuration.forEach((durations, key) => {
      const [method, route] = key.split(':');
      output.push(`http_request_duration_seconds{method="${method}",route="${route}",quantile="0.5"} ${percentile(durations, 50)}`);
      output.push(`http_request_duration_seconds{method="${method}",route="${route}",quantile="0.9"} ${percentile(durations, 90)}`);
      output.push(`http_request_duration_seconds{method="${method}",route="${route}",quantile="0.99"} ${percentile(durations, 99)}`);
    });
    
    // Error metrics
    output.push('# HELP errors_total Total errors');
    output.push('# TYPE errors_total counter');
    metrics.errors.forEach((count, type) => {
      output.push(`errors_total{type="${type}"} ${count}`);
    });
    
    // Node.js event loop metrics
    output.push('# HELP nodejs_event_loop_lag_seconds Event loop lag');
    output.push('# TYPE nodejs_event_loop_lag_seconds gauge');
    output.push(`nodejs_event_loop_lag_seconds 0`); // Would need event-loop-lag package for real value
    
    const prometheusOutput = output.join('\n') + '\n';
    
    return new Response(prometheusOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return apiError(
      'INTERNAL_ERROR',
      'Failed to collect metrics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// Disable caching for this endpoint
export const prerender = false;
