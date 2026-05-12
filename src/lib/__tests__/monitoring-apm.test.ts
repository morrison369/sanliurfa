/**
 * Unit Tests — monitoring/apm.ts singleton class managers
 *
 * - TraceCollector (startSpan + finishSpan + getTrace + clearOldTraces)
 * - ErrorBudgetManager (defineSLO + recordGood/Bad + getBudget + isExhausted)
 * - PerformanceBaseline (recordSample + getBaseline p50/p95/p99 + detectRegression severity)
 */

import { describe, it, expect } from 'vitest';
import {
  traceCollector,
  errorBudgetManager,
  performanceBaseline,
} from '../monitoring/apm';

describe('TraceCollector', () => {
  it('startSpan — traceId + spanId crypto random', () => {
    const span = traceCollector.startSpan('test-op');
    expect(span.traceId).toMatch(/^trace-\d+-[0-9a-f]+$/);
    expect(span.spanId).toMatch(/^span-\d+-[0-9a-f]+$/);
    expect(span.status).toBe('active');
    expect(span.tags).toEqual({});
  });

  it('startSpan — parentSpanId optional', () => {
    const child = traceCollector.startSpan('child', 'parent-span-id');
    expect((child as any).parentSpanId).toBe('parent-span-id');
  });

  it('finishSpan — endTime + duration + status="completed"', async () => {
    const span = traceCollector.startSpan('finish-test');
    await new Promise((r) => setTimeout(r, 5));
    traceCollector.finishSpan(span.spanId);
    expect(span.endTime).toBeDefined();
    expect(span.duration).toBeGreaterThanOrEqual(0);
    expect(span.status).toBe('completed');
  });

  it('finishSpan — error → status="error" + tags.error', () => {
    const span = traceCollector.startSpan('error-test');
    traceCollector.finishSpan(span.spanId, 'Connection failed');
    expect(span.status).toBe('error');
    expect(span.tags.error).toBe('Connection failed');
  });

  it('finishSpan — bilinmeyen spanId → no-throw silent', () => {
    expect(() => traceCollector.finishSpan('non-existent')).not.toThrow();
  });

  it('getTrace — bilinmeyen → boş array', () => {
    expect(traceCollector.getTrace('non-existent')).toEqual([]);
  });

  it('getTrace — span listesi (tek trace içinde)', () => {
    const span = traceCollector.startSpan('trace-test');
    const trace = traceCollector.getTrace(span.traceId);
    expect(trace.some((s) => s.spanId === span.spanId)).toBe(true);
  });

  it('getCurrentContext — son startSpan sonrası context set', () => {
    const span = traceCollector.startSpan('ctx-test');
    const ctx = traceCollector.getCurrentContext();
    expect(ctx?.traceId).toBe(span.traceId);
    expect(ctx?.spanId).toBe(span.spanId);
  });

  it('clearOldTraces — exception fırlatmaz', () => {
    expect(() => traceCollector.clearOldTraces(0)).not.toThrow();
  });
});

describe('ErrorBudgetManager', () => {
  it('defineSLO + getBudget — initial state', () => {
    errorBudgetManager.defineSLO({ name: 'slo-1', target: 0.99, windowMs: 86400000 } as any);
    const budget = errorBudgetManager.getBudget('slo-1');
    expect(budget.target).toBe(0.99);
    expect(budget.totalEvents).toBe(0);
  });

  it('recordGoodEvent + getBudget — goodEvents++', () => {
    errorBudgetManager.defineSLO({ name: 'slo-good', target: 0.99, windowMs: 86400000 } as any);
    errorBudgetManager.recordGoodEvent('slo-good');
    errorBudgetManager.recordGoodEvent('slo-good');
    expect(errorBudgetManager.getBudget('slo-good').goodEvents).toBe(2);
  });

  it('recordBadEvent + getBudget — badEvents++', () => {
    errorBudgetManager.defineSLO({ name: 'slo-bad', target: 0.99, windowMs: 86400000 } as any);
    errorBudgetManager.recordBadEvent('slo-bad');
    expect(errorBudgetManager.getBudget('slo-bad').badEvents).toBe(1);
  });

  it('getBudget — bilinmeyen SLO → 0/0/0 default', () => {
    const budget = errorBudgetManager.getBudget('non-existent');
    expect(budget.target).toBe(0);
    expect(budget.totalEvents).toBe(0);
  });

  it('getBudget — consumed = 1 - compliance (badEvents oranı)', () => {
    errorBudgetManager.defineSLO({ name: 'slo-consumed', target: 0.99, windowMs: 86400000 } as any);
    errorBudgetManager.recordGoodEvent('slo-consumed');
    errorBudgetManager.recordGoodEvent('slo-consumed');
    errorBudgetManager.recordBadEvent('slo-consumed');
    const budget = errorBudgetManager.getBudget('slo-consumed');
    expect(budget.consumed).toBeCloseTo(1 - 2 / 3, 2); // 1 bad / 3 total
  });

  it('isExhausted — boolean', () => {
    errorBudgetManager.defineSLO({ name: 'slo-exh', target: 0.5, windowMs: 86400000 } as any);
    expect(typeof errorBudgetManager.isExhausted('slo-exh')).toBe('boolean');
  });
});

describe('PerformanceBaseline', () => {
  it('recordSample + getBaseline — mean/p50/p95/p99', () => {
    for (let i = 1; i <= 100; i++) {
      performanceBaseline.recordSample('metric-1', i);
    }
    const baseline = performanceBaseline.getBaseline('metric-1');
    expect(baseline?.sampleCount).toBeGreaterThanOrEqual(100);
    expect(baseline?.mean).toBeGreaterThan(0);
    expect(baseline?.p50).toBeLessThanOrEqual(baseline!.p95);
    expect(baseline?.p95).toBeLessThanOrEqual(baseline!.p99);
  });

  it('getBaseline — bilinmeyen → null', () => {
    expect(performanceBaseline.getBaseline('non-existent-metric')).toBeNull();
  });

  it('detectRegression — baseline yok → no regression', () => {
    const result = performanceBaseline.detectRegression('non-existent', 1000);
    expect(result.isRegression).toBe(false);
    expect(result.severity).toBe('low');
  });

  it('detectRegression — < 50% deviation → no regression', () => {
    for (let i = 0; i < 50; i++) {
      performanceBaseline.recordSample('metric-norm', 100);
    }
    const result = performanceBaseline.detectRegression('metric-norm', 120); // %20 deviation
    expect(result.isRegression).toBe(false);
  });

  it('detectRegression — > 200% deviation → severity high', () => {
    for (let i = 0; i < 50; i++) {
      performanceBaseline.recordSample('metric-spike', 100);
    }
    const result = performanceBaseline.detectRegression('metric-spike', 500); // 400% deviation
    expect(result.isRegression).toBe(true);
    expect(result.severity).toBe('high');
  });

  it('detectRegression — 100-200% → severity medium', () => {
    for (let i = 0; i < 50; i++) {
      performanceBaseline.recordSample('metric-medium', 100);
    }
    const result = performanceBaseline.detectRegression('metric-medium', 250); // 150% deviation
    expect(result.severity).toBe('medium');
  });

  it('clearSamples — siler', () => {
    performanceBaseline.recordSample('metric-clear', 1);
    performanceBaseline.clearSamples('metric-clear');
    expect(performanceBaseline.getBaseline('metric-clear')).toBeNull();
  });

  it('recordSample — 10K cap (FIFO)', () => {
    const M = `metric-cap-${Date.now()}`;
    for (let i = 0; i < 10500; i++) {
      performanceBaseline.recordSample(M, i);
    }
    const baseline = performanceBaseline.getBaseline(M);
    expect(baseline?.sampleCount).toBeLessThanOrEqual(10000);
  });
});
