/**
 * Phase 9: Advanced Observability
 * Enhanced APM, real-time anomaly detection, performance profiling
 */

import { logger } from './logging';

// ==================== ANOMALY DETECTION ====================

export interface AnomalyDetectionConfig {
  baselineWindow: number; // seconds
  sensitivity: 'low' | 'medium' | 'high'; // deviation threshold
  checkInterval: number; // seconds
}

interface MetricBaseline {
  mean: number;
  stddev: number;
  min: number;
  max: number;
}

/**
 * Real-time anomaly detection using statistical analysis
 * Detects unusual spikes in metrics (errors, latency, resource usage)
 */
export class AnomalyDetector {
  private baselines = new Map<string, MetricBaseline>();
  private values = new Map<string, number[]>();
  private readonly windowSize = 300; // Keep 300 data points per metric
  private readonly sensitivities = {
    low: 2.0, // 2 standard deviations
    medium: 1.5,
    high: 1.0
  };

  constructor(private sensitivity: 'low' | 'medium' | 'high' = 'medium') {}

  /**
   * Record a metric value
   */
  recordValue(metric: string, value: number): void {
    if (!this.values.has(metric)) {
      this.values.set(metric, []);
    }

    const metricValues = this.values.get(metric)!;
    metricValues.push(value);

    // Keep only recent values
    if (metricValues.length > this.windowSize) {
      metricValues.shift();
    }
  }

  /**
   * Calculate baseline statistics for a metric
   */
  private calculateBaseline(values: number[]): MetricBaseline {
    if (values.length === 0) {
      return { mean: 0, stddev: 0, min: 0, max: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    return {
      mean,
      stddev,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Check if a value is anomalous compared to baseline
   */
  isAnomaly(metric: string, value: number): { isAnomaly: boolean; deviation: number; severity: 'low' | 'medium' | 'high' } {
    const baseline = this.baselines.get(metric);
    if (!baseline) {
      return { isAnomaly: false, deviation: 0, severity: 'low' };
    }

    const threshold = this.sensitivities[this.sensitivity];
    const deviation = Math.abs(value - baseline.mean) / (baseline.stddev || 1);
    const isAnomaly = deviation > threshold;
    const severity = deviation > threshold * 1.5 ? 'high' : deviation > threshold ? 'medium' : 'low';

    return { isAnomaly, deviation, severity };
  }

  /**
   * Update baseline for a metric (called periodically)
   */
  updateBaseline(metric: string): void {
    const values = this.values.get(metric) || [];
    if (values.length > 10) { // Only update with sufficient data
      const baseline = this.calculateBaseline(values);
      this.baselines.set(metric, baseline);
    }
  }

  /**
   * Get all current baselines
   */
  getBaselines(): Record<string, MetricBaseline> {
    const baselines: Record<string, MetricBaseline> = {};
    for (const [metric, baseline] of this.baselines) {
      baselines[metric] = baseline;
    }
    return baselines;
  }
}

// ==================== PERFORMANCE PROFILING ====================

interface ProfileEntry {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}

/**
 * Performance profiler for tracking execution time of code sections
 * Useful for identifying bottlenecks in complex operations
 */
export class PerformanceProfiler {
  private profileStack: ProfileEntry[] = [];
  private profiles = new Map<string, ProfileEntry[]>();
  private readonly maxEntriesPerProfile = 100;

  /**
   * Start profiling a named section
   */
  start(name: string, metadata?: Record<string, any>): () => void {
    const startTime = Date.now();
    const entry: ProfileEntry = {
      name,
      duration: 0,
      startTime,
      endTime: 0,
      metadata
    };

    this.profileStack.push(entry);

    // Return end function
    return () => this.end(name);
  }

  /**
   * End profiling a section
   */
  private end(name: string): number {
    const endTime = Date.now();
    const entry = this.profileStack.pop();

    if (!entry || entry.name !== name) {
      logger.warn('Profile mismatch', { expected: name, got: entry?.name });
      return 0;
    }

    entry.endTime = endTime;
    entry.duration = endTime - entry.startTime;

    // Store profile
    if (!this.profiles.has(name)) {
      this.profiles.set(name, []);
    }

    const profileList = this.profiles.get(name)!;
    profileList.push(entry);

    // Keep only recent entries
    if (profileList.length > this.maxEntriesPerProfile) {
      profileList.shift();
    }

    return entry.duration;
  }

  /**
   * Get profile statistics for a named section
   */
  getStats(name: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
  } | null {
    const entries = this.profiles.get(name);
    if (!entries || entries.length === 0) return null;

    const durations = entries.map(e => e.duration).sort((a, b) => a - b);
    const count = durations.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / count;
    const minDuration = durations[0];
    const maxDuration = durations[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95Duration = durations[p95Index];

    return {
      count,
      avgDuration: Math.round(avgDuration),
      minDuration,
      maxDuration,
      p95Duration
    };
  }

  /**
   * Get all profile statistics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const name of this.profiles.keys()) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Clear all profiles
   */
  clear(): void {
    this.profiles.clear();
    this.profileStack = [];
  }
}

// ==================== DISTRIBUTED TRACING ====================

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{ timestamp: number; message: string }>;
}

/**
 * Distributed trace context (for request tracing across services)
 */
export class TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  private childSpanCounter = 0;

  constructor(traceId?: string, parentSpanId?: string) {
    this.traceId = traceId || generateTraceId();
    this.spanId = parentSpanId || generateSpanId();
  }

  /**
   * Create a child span
   */
  createChildSpan(name: string): TraceSpan {
    const spanId = `${this.spanId}-${++this.childSpanCounter}`;
    return {
      traceId: this.traceId,
      spanId,
      parentSpanId: this.spanId,
      name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      tags: {},
      logs: []
    };
  }

  /**
   * Add tag to current span
   */
  addTag(key: string, value: string | number | boolean): void {
    // Implementation would store in current span
  }

  /**
   * Add log to current span
   */
  addLog(message: string): void {
    // Implementation would store in current span
  }
}

function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function generateSpanId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ==================== REQUEST PATH ANALYSIS ====================

interface RequestPathMetric {
  path: string;
  method: string;
  callCount: number;
  avgDuration: number;
  errorRate: number;
  p95Duration: number;
  bottleneck?: string; // Most common slow operation
}

/**
 * Analyze request execution paths to identify bottlenecks
 * Tracks which database/cache operations are causing slowdowns
 */
export class RequestPathAnalyzer {
  private requestPaths = new Map<string, RequestPathMetric>();

  /**
   * Record request path execution
   */
  recordRequestPath(
    path: string,
    method: string,
    duration: number,
    error?: boolean,
    bottleneck?: string
  ): void {
    const key = `${method} ${path}`;

    if (!this.requestPaths.has(key)) {
      this.requestPaths.set(key, {
        path,
        method,
        callCount: 0,
        avgDuration: 0,
        errorRate: 0,
        p95Duration: 0,
        bottleneck
      });
    }

    const metric = this.requestPaths.get(key)!;
    metric.callCount++;
    metric.avgDuration = (metric.avgDuration * (metric.callCount - 1) + duration) / metric.callCount;

    if (error) {
      metric.errorRate = ((metric.errorRate * (metric.callCount - 1)) + 1) / metric.callCount;
    }

    if (bottleneck && (!metric.bottleneck || Math.random() < 0.1)) {
      metric.bottleneck = bottleneck; // Update bottleneck occasionally
    }
  }

  /**
   * Get slowest request paths
   */
  getSlowestPaths(limit: number = 5): RequestPathMetric[] {
    return Array.from(this.requestPaths.values())
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get paths with highest error rates
   */
  getErroryPaths(limit: number = 5): RequestPathMetric[] {
    return Array.from(this.requestPaths.values())
      .filter(m => m.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, RequestPathMetric> {
    const metrics: Record<string, RequestPathMetric> = {};
    for (const [key, metric] of this.requestPaths) {
      metrics[key] = metric;
    }
    return metrics;
  }
}

// ==================== EXPORTS ====================

export const anomalyDetector = new AnomalyDetector('medium');
export const performanceProfiler = new PerformanceProfiler();
export const requestPathAnalyzer = new RequestPathAnalyzer();
