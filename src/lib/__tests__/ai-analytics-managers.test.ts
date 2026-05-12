/**
 * Unit Tests - ai/ai-analytics.ts 4 manager class (Phase 130)
 *
 * - EmbeddingAnalytics (recordMetrics + detectDrift + getCoverageAnalysis trend)
 * - RetrievalAnalytics (recordMetrics latency p50/p95/p99 + getRetrievalEffectiveness time window)
 * - LLMMetrics (recordMetrics avg latency + errorRate + cacheHitRate)
 * - QualityMonitor (alertOnAnomaly threshold + severity + acknowledge + getActiveAlerts filter)
 *
 * vi.mock redis (cache module) - lpush/ltrim/setex no-op.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../cache', () => ({
  redis: {
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
  },
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: vi.fn().mockResolvedValue(1),
}));

import {
  embeddingAnalytics,
  retrievalAnalytics,
  llmMetrics,
  qualityMonitor,
} from '../ai/ai-analytics';

describe('EmbeddingAnalytics', () => {
  it('recordMetrics - qualityScore default 0.9 + driftDetected false default', () => {
    const m = embeddingAnalytics.recordMetrics({
      modelId: `e-${Date.now()}-1`,
      embeddingCount: 100,
      avgDimension: 768,
    });
    expect(m.qualityScore).toBe(0.9);
    expect(m.driftDetected).toBe(false);
    expect(m.coverage).toBe(0.95);
  });

  it('detectDrift - less than 2 metrics returns false', () => {
    const id = `e-drift-${Date.now()}`;
    embeddingAnalytics.recordMetrics({ modelId: id, embeddingCount: 10, avgDimension: 100 });
    const r = embeddingAnalytics.detectDrift(id);
    expect(r.driftDetected).toBe(false);
  });

  it('detectDrift - quality drift threshold 0.15', () => {
    const id = `e-drift2-${Date.now()}`;
    embeddingAnalytics.recordMetrics({ modelId: id, embeddingCount: 10, avgDimension: 100, qualityScore: 0.95 });
    embeddingAnalytics.recordMetrics({ modelId: id, embeddingCount: 10, avgDimension: 100, qualityScore: 0.7 });
    const r = embeddingAnalytics.detectDrift(id);
    expect(r.driftDetected).toBe(true);
  });

  it('getCoverageAnalysis - empty returns averageCoverage 0', () => {
    const r = embeddingAnalytics.getCoverageAnalysis(`non-existent-${Date.now()}`);
    expect(r.averageCoverage).toBe(0);
    expect(r.trend).toBe('stable');
  });

  it('getMetrics - limit slice', () => {
    const id = `e-limit-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      embeddingAnalytics.recordMetrics({ modelId: id, embeddingCount: 10, avgDimension: 100 });
    }
    expect(embeddingAnalytics.getMetrics(id, 3)).toHaveLength(3);
  });
});

describe('RetrievalAnalytics', () => {
  it('recordMetrics - latency percentiles p50/p95/p99', () => {
    const m = retrievalAnalytics.recordMetrics({
      queryCount: 100,
      precision: 0.85,
      recall: 0.8,
      latencies: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    });
    expect(m.latencyP50).toBeGreaterThanOrEqual(50);
    expect(m.latencyP95).toBeGreaterThanOrEqual(90);
  });

  it('recordMetrics - defaults ndcg 0.85 / mrr 0.75', () => {
    const m = retrievalAnalytics.recordMetrics({
      queryCount: 10,
      precision: 0.9,
      recall: 0.85,
      latencies: [10],
    });
    expect(m.ndcg).toBe(0.85);
    expect(m.mrr).toBe(0.75);
  });

  it('getRetrievalEffectiveness - empty window returns all 0', () => {
    const r = retrievalAnalytics.getRetrievalEffectiveness(0);
    expect(r.avgPrecision).toBe(0);
    expect(r.trend).toBe('stable');
  });

  it('getLatencyPercentiles - non-negative output', () => {
    const r = retrievalAnalytics.getLatencyPercentiles();
    expect(r.p50).toBeGreaterThanOrEqual(0);
  });
});

describe('LLMMetrics', () => {
  it('recordMetrics - avg latency + errorRate + cacheHitRate', () => {
    const m = llmMetrics.recordMetrics({
      model: `llm-${Date.now()}-1`,
      requestCount: 100,
      latencies: [100, 200, 300],
      totalTokens: 5000,
      costUSD: 0.05,
      errorCount: 5,
      cacheHits: 20,
    });
    expect(m.avgLatencyMs).toBe(200);
    expect(m.errorRate).toBe(0.05);
    expect(m.cacheHitRate).toBe(0.2);
  });

  it('recordMetrics - requestCount 0 division guard', () => {
    const m = llmMetrics.recordMetrics({
      model: `llm-${Date.now()}-zero`,
      requestCount: 0,
      latencies: [],
      totalTokens: 0,
      costUSD: 0,
    });
    expect(m.errorRate).toBe(0);
    expect(m.cacheHitRate).toBe(0);
  });

  it('getModelStats - empty window returns all 0', () => {
    const r = llmMetrics.getModelStats(`non-existent-${Date.now()}`, 24);
    expect(r.totalRequests).toBe(0);
    expect(r.totalCost).toBe(0);
  });

  it('getModelStats - registered model returns aggregate stats', () => {
    const id = `llm-stats-${Date.now()}`;
    llmMetrics.recordMetrics({ model: id, requestCount: 10, latencies: [100], totalTokens: 100, costUSD: 0.01 });
    const r = llmMetrics.getModelStats(id, 24);
    expect(r.totalRequests).toBe(10);
    expect(r.totalCost).toBe(0.01);
  });

  it('getCostTrend - bucket aggregation by interval', () => {
    const id = `llm-cost-${Date.now()}`;
    llmMetrics.recordMetrics({ model: id, requestCount: 1, latencies: [10], totalTokens: 100, costUSD: 0.01 });
    const trend = llmMetrics.getCostTrend(id, 60);
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBeGreaterThanOrEqual(1);
  });
});

describe('QualityMonitor', () => {
  it('alertOnAnomaly - actual below threshold returns null', () => {
    const a = qualityMonitor.alertOnAnomaly('latency_spike', 100, 50);
    expect(a).toBeNull();
  });

  it('alertOnAnomaly - actual above threshold*2 returns critical', () => {
    const a = qualityMonitor.alertOnAnomaly('cost_overrun', 100, 250);
    expect(a?.severity).toBe('critical');
  });

  it('alertOnAnomaly - actual between threshold and 2x returns warning', () => {
    const a = qualityMonitor.alertOnAnomaly('error_rate_high', 100, 150);
    expect(a?.severity).toBe('warning');
  });

  it('acknowledgeAlert - registered id returns true', () => {
    const a = qualityMonitor.alertOnAnomaly('latency_spike', 100, 200);
    expect(qualityMonitor.acknowledgeAlert(a!.id)).toBe(true);
  });

  it('acknowledgeAlert - unknown id returns false', () => {
    expect(qualityMonitor.acknowledgeAlert('non-existent')).toBe(false);
  });

  it('getActiveAlerts - acknowledged false filter + severity option', () => {
    const r = qualityMonitor.getActiveAlerts();
    expect(Array.isArray(r)).toBe(true);
    const critical = qualityMonitor.getActiveAlerts('critical');
    expect(critical.every((a) => a.severity === 'critical')).toBe(true);
  });

  it('getAlertStats - total + active + bySeverity counter', () => {
    const stats = qualityMonitor.getAlertStats();
    expect(typeof stats.total).toBe('number');
    expect(stats.bySeverity).toHaveProperty('warning');
    expect(stats.bySeverity).toHaveProperty('critical');
  });

  it('trackRetrieval - no-throw smoke', () => {
    expect(() => qualityMonitor.trackRetrieval('q', 5)).not.toThrow();
    expect(() => qualityMonitor.trackRetrieval('q', 5, { relevant: 3, total: 5 })).not.toThrow();
  });
});
