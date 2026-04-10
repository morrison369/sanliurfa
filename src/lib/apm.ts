/**
 * Phase 34: APM & Error Budget Management
 * Distributed tracing, SLO tracking, error budgets, performance baselines
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, any>;
  status: 'active' | 'completed' | 'error';
  duration?: number;
}

export interface SLODefinition {
  name: string;
  target: number; // 0-1, e.g. 0.99 = 99%
  metric: string;
  windowMs: number;
}

export interface ErrorBudget {
  sloName: string;
  target: number;
  consumed: number;
  remaining: number;
  budgetPeriodMs: number;
  totalEvents: number;
  goodEvents: number;
  badEvents: number;
}

export interface PerformanceBaselineStats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
}

export interface RegressionDetection {
  isRegression: boolean;
  deviation: number; // Percentage deviation from baseline
  severity: 'low' | 'medium' | 'high';
}

// ==================== TRACE COLLECTOR ====================

export class TraceCollector {
  private spans = new Map<string, Span>();
  private traces = new Map<string, Span[]>();
  private currentContext: { traceId: string; spanId: string } | null = null;

  /**
   * Start a new span
   */
  startSpan(name: string, parentSpanId?: string): Span {
    const traceId = this.currentContext?.traceId || 'trace-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const spanId = 'span-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      tags: {},
      status: 'active'
    };

    this.spans.set(spanId, span);

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);

    // Update context
    this.currentContext = { traceId, spanId };

    logger.debug('Span started', { spanId, name, traceId });
    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(spanId: string, error?: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'error' : 'completed';

    if (error) {
      span.tags.error = error;
      logger.error('Span error', new Error(error), { spanId, duration: span.duration });
    } else {
      logger.debug('Span finished', { spanId, duration: span.duration });
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Span[] {
    return this.traces.get(traceId) || [];
  }

  /**
   * Get current context
   */
  getCurrentContext(): { traceId: string; spanId: string } | null {
    return this.currentContext;
  }

  /**
   * Clear old traces (to prevent memory leak)
   */
  clearOldTraces(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;

    for (const [traceId, spans] of this.traces) {
      if (spans.length > 0 && spans[0].startTime < cutoff) {
        this.traces.delete(traceId);
        spans.forEach(span => this.spans.delete(span.spanId));
      }
    }
  }
}

// ==================== ERROR BUDGET MANAGER ====================

export class ErrorBudgetManager {
  private slos = new Map<string, SLODefinition>();
  private budgets = new Map<string, { goodEvents: number; badEvents: number; startTime: number }>();

  /**
   * Define SLO
   */
  defineSLO(slo: SLODefinition): void {
    this.slos.set(slo.name, slo);
    this.budgets.set(slo.name, { goodEvents: 0, badEvents: 0, startTime: Date.now() });
    logger.debug('SLO defined', { name: slo.name, target: slo.target });
  }

  /**
   * Record good event (compliant)
   */
  recordGoodEvent(sloName: string): void {
    const budget = this.budgets.get(sloName);
    if (budget) {
      budget.goodEvents++;
    }
  }

  /**
   * Record bad event (non-compliant)
   */
  recordBadEvent(sloName: string): void {
    const budget = this.budgets.get(sloName);
    if (budget) {
      budget.badEvents++;
    }
  }

  /**
   * Get error budget status
   */
  getBudget(sloName: string): ErrorBudget {
    const slo = this.slos.get(sloName);
    const budget = this.budgets.get(sloName);

    if (!slo || !budget) {
      return {
        sloName,
        target: 0,
        consumed: 0,
        remaining: 0,
        budgetPeriodMs: 0,
        totalEvents: 0,
        goodEvents: 0,
        badEvents: 0
      };
    }

    const totalEvents = budget.goodEvents + budget.badEvents;
    const compliance = totalEvents > 0 ? budget.goodEvents / totalEvents : 1;
    const consumed = Math.max(0, 1 - compliance);
    const remaining = Math.max(0, slo.target - (1 - consumed));
    const duration = Date.now() - budget.startTime;

    return {
      sloName,
      target: slo.target,
      consumed,
      remaining,
      budgetPeriodMs: slo.windowMs,
      totalEvents,
      goodEvents: budget.goodEvents,
      badEvents: budget.badEvents
    };
  }

  /**
   * Check if error budget exhausted
   */
  isExhausted(sloName: string): boolean {
    const budget = this.getBudget(sloName);
    return budget.remaining <= 0;
  }
}

// ==================== PERFORMANCE BASELINE ====================

export class PerformanceBaselineManager {
  private samples = new Map<string, number[]>();

  /**
   * Record sample for metric
   */
  recordSample(metricName: string, value: number): void {
    if (!this.samples.has(metricName)) {
      this.samples.set(metricName, []);
    }

    this.samples.get(metricName)!.push(value);

    // Keep only last 10K samples to prevent memory bloat
    const samples = this.samples.get(metricName)!;
    if (samples.length > 10000) {
      samples.shift();
    }
  }

  /**
   * Get baseline statistics
   */
  getBaseline(metricName: string): PerformanceBaselineStats | null {
    const samples = this.samples.get(metricName);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      mean: Math.round(mean),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      sampleCount: samples.length
    };
  }

  /**
   * Detect regression from baseline
   */
  detectRegression(metricName: string, currentValue: number): RegressionDetection {
    const baseline = this.getBaseline(metricName);

    if (!baseline) {
      return { isRegression: false, deviation: 0, severity: 'low' };
    }

    const deviation = ((currentValue - baseline.mean) / baseline.mean) * 100;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (deviation > 200) {
      severity = 'high';
    } else if (deviation > 100) {
      severity = 'medium';
    }

    const isRegression = deviation > 50; // 50%+ deviation is regression

    return {
      isRegression,
      deviation,
      severity
    };
  }

  /**
   * Clear samples for metric
   */
  clearSamples(metricName: string): void {
    this.samples.delete(metricName);
  }
}

// ==================== EXPORTS ====================

export const traceCollector = new TraceCollector();
export const errorBudgetManager = new ErrorBudgetManager();
export const performanceBaseline = new PerformanceBaselineManager();
