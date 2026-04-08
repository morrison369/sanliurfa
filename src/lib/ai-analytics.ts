/**
 * Phase 130: Advanced AI Analytics & Monitoring
 * Comprehensive monitoring of AI system performance, cost, and quality metrics
 */

import { logger } from './logger';
import { redis } from './cache';

interface EmbeddingMetrics {
  modelId: string;
  timestamp: number;
  embeddingCount: number;
  avgDimension: number;
  qualityScore: number;
  driftDetected: boolean;
  coverage: number;
}

interface RetrievalMetrics {
  timestamp: number;
  queryCount: number;
  avgPrecision: number;
  avgRecall: number;
  ndcg: number;
  mrr: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
}

interface LLMMetrics {
  model: string;
  timestamp: number;
  requestCount: number;
  avgLatencyMs: number;
  totalTokens: number;
  costUSD: number;
  errorRate: number;
  cacheHitRate: number;
}

interface QualityAlert {
  id: string;
  type: 'latency_spike' | 'quality_degradation' | 'cost_overrun' | 'error_rate_high';
  severity: 'warning' | 'critical';
  metric: string;
  threshold: number;
  actual: number;
  timestamp: number;
  acknowledged: boolean;
}

class EmbeddingAnalytics {
  private metrics: EmbeddingMetrics[] = [];
  private counter = 0;

  recordMetrics(config: {
    modelId: string;
    embeddingCount: number;
    avgDimension: number;
    qualityScore?: number;
    driftDetected?: boolean;
    coverage?: number;
  }): EmbeddingMetrics {
    const metric: EmbeddingMetrics = {
      modelId: config.modelId,
      timestamp: Date.now(),
      embeddingCount: config.embeddingCount,
      avgDimension: config.avgDimension,
      qualityScore: config.qualityScore || 0.9,
      driftDetected: config.driftDetected || false,
      coverage: config.coverage || 0.95
    };

    this.metrics.push(metric);

    const cacheKey = `sanliurfa:embedding-metrics:${config.modelId}`;
    redis.lpush(cacheKey, JSON.stringify(metric));
    redis.ltrim(cacheKey, 0, 999);

    logger.debug('Embedding metrics recorded', {
      model: config.modelId,
      count: config.embeddingCount,
      quality: metric.qualityScore
    });

    return metric;
  }

  detectDrift(modelId: string, threshold: number = 0.15): {
    driftDetected: boolean;
    driftAmount: number;
  } {
    const modelMetrics = this.metrics.filter(m => m.modelId === modelId);
    if (modelMetrics.length < 2) {
      return { driftDetected: false, driftAmount: 0 };
    }

    const latest = modelMetrics[modelMetrics.length - 1];
    const baseline = modelMetrics[0];
    const driftAmount = Math.abs(latest.qualityScore - baseline.qualityScore);

    return {
      driftDetected: driftAmount > threshold,
      driftAmount
    };
  }

  getCoverageAnalysis(modelId: string): {
    averageCoverage: number;
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const modelMetrics = this.metrics.filter(m => m.modelId === modelId);
    if (modelMetrics.length === 0) {
      return { averageCoverage: 0, trend: 'stable' };
    }

    const avgCoverage = modelMetrics.reduce((sum, m) => sum + m.coverage, 0) / modelMetrics.length;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (modelMetrics.length >= 2) {
      const recent = modelMetrics.slice(-5);
      const older = modelMetrics.slice(-10, -5);

      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, m) => sum + m.coverage, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.coverage, 0) / older.length;

        trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'degrading' : 'stable';
      }
    }

    return { averageCoverage: avgCoverage, trend };
  }

  getMetrics(modelId: string, limit: number = 100): EmbeddingMetrics[] {
    return this.metrics
      .filter(m => m.modelId === modelId)
      .slice(-limit);
  }
}

class RetrievalAnalytics {
  private metrics: RetrievalMetrics[] = [];

  recordMetrics(config: {
    queryCount: number;
    precision: number;
    recall: number;
    ndcg?: number;
    mrr?: number;
    latencies: number[];
  }): RetrievalMetrics {
    const latencies = config.latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    const metric: RetrievalMetrics = {
      timestamp: Date.now(),
      queryCount: config.queryCount,
      avgPrecision: config.precision,
      avgRecall: config.recall,
      ndcg: config.ndcg || 0.85,
      mrr: config.mrr || 0.75,
      latencyP50: p50 || 0,
      latencyP95: p95 || 0,
      latencyP99: p99 || 0
    };

    this.metrics.push(metric);

    const cacheKey = 'sanliurfa:retrieval-metrics';
    redis.lpush(cacheKey, JSON.stringify(metric));
    redis.ltrim(cacheKey, 0, 999);

    logger.info('Retrieval metrics recorded', {
      queries: config.queryCount,
      precision: config.precision,
      p99: p99
    });

    return metric;
  }

  getRetrievalEffectiveness(timeWindowMinutes: number = 60): {
    avgPrecision: number;
    avgRecall: number;
    avgNDCG: number;
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    const recent = this.metrics.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) {
      return { avgPrecision: 0, avgRecall: 0, avgNDCG: 0, trend: 'stable' };
    }

    const avgPrecision = recent.reduce((sum, m) => sum + m.avgPrecision, 0) / recent.length;
    const avgRecall = recent.reduce((sum, m) => sum + m.avgRecall, 0) / recent.length;
    const avgNDCG = recent.reduce((sum, m) => sum + m.ndcg, 0) / recent.length;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (recent.length >= 2) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));

      const firstAvg = firstHalf.reduce((sum, m) => sum + m.avgPrecision, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.avgPrecision, 0) / secondHalf.length;

      trend = secondAvg > firstAvg ? 'improving' : secondAvg < firstAvg ? 'degrading' : 'stable';
    }

    return { avgPrecision, avgRecall, avgNDCG, trend };
  }

  getLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    if (this.metrics.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const latencies = this.metrics.flatMap(m => [m.latencyP50, m.latencyP95, m.latencyP99]).sort((a, b) => a - b);

    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)]
    };
  }

  getMetrics(limit: number = 100): RetrievalMetrics[] {
    return this.metrics.slice(-limit);
  }
}

class LLMMetrics {
  private metrics: LLMMetrics[] = [];

  recordMetrics(config: {
    model: string;
    requestCount: number;
    latencies: number[];
    totalTokens: number;
    costUSD: number;
    errorCount?: number;
    cacheHits?: number;
  }): LLMMetrics {
    const avgLatency = config.latencies.length > 0
      ? config.latencies.reduce((a, b) => a + b, 0) / config.latencies.length
      : 0;

    const errorRate = config.requestCount > 0
      ? (config.errorCount || 0) / config.requestCount
      : 0;

    const cacheHitRate = config.requestCount > 0
      ? (config.cacheHits || 0) / config.requestCount
      : 0;

    const metric: LLMMetrics = {
      model: config.model,
      timestamp: Date.now(),
      requestCount: config.requestCount,
      avgLatencyMs: avgLatency,
      totalTokens: config.totalTokens,
      costUSD: config.costUSD,
      errorRate,
      cacheHitRate
    };

    this.metrics.push(metric);

    const cacheKey = `sanliurfa:llm-metrics:${config.model}`;
    redis.lpush(cacheKey, JSON.stringify(metric));
    redis.ltrim(cacheKey, 0, 999);

    logger.info('LLM metrics recorded', {
      model: config.model,
      requests: config.requestCount,
      costUSD: config.costUSD.toFixed(2),
      cacheHitRate: (cacheHitRate * 100).toFixed(1) + '%'
    });

    return metric;
  }

  getModelStats(model: string, timeWindowHours: number = 24): {
    totalRequests: number;
    totalCost: number;
    avgLatency: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    const cutoff = Date.now() - (timeWindowHours * 60 * 60 * 1000);
    const relevant = this.metrics.filter(m => m.model === model && m.timestamp > cutoff);

    if (relevant.length === 0) {
      return {
        totalRequests: 0,
        totalCost: 0,
        avgLatency: 0,
        errorRate: 0,
        cacheHitRate: 0
      };
    }

    return {
      totalRequests: relevant.reduce((sum, m) => sum + m.requestCount, 0),
      totalCost: relevant.reduce((sum, m) => sum + m.costUSD, 0),
      avgLatency: relevant.reduce((sum, m) => sum + m.avgLatencyMs, 0) / relevant.length,
      errorRate: relevant.reduce((sum, m) => sum + m.errorRate, 0) / relevant.length,
      cacheHitRate: relevant.reduce((sum, m) => sum + m.cacheHitRate, 0) / relevant.length
    };
  }

  getCostTrend(model: string, intervalMinutes: number = 60): { time: number; cost: number }[] {
    const modelMetrics = this.metrics.filter(m => m.model === model);
    const grouped: Record<number, number> = {};

    for (const metric of modelMetrics) {
      const bucket = Math.floor(metric.timestamp / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000);
      grouped[bucket] = (grouped[bucket] || 0) + metric.costUSD;
    }

    return Object.entries(grouped)
      .map(([time, cost]) => ({ time: parseInt(time), cost }))
      .sort((a, b) => a.time - b.time);
  }

  getMetrics(model: string, limit: number = 100): LLMMetrics[] {
    return this.metrics
      .filter(m => m.model === model)
      .slice(-limit);
  }
}

class QualityMonitor {
  private alerts: QualityAlert[] = [];
  private counter = 0;

  trackRetrieval(query: string, resultCount: number, userFeedback?: { relevant: number; total: number }): void {
    logger.debug('Retrieval tracked', {
      query: query.slice(0, 50),
      results: resultCount,
      feedback: userFeedback
    });
  }

  alertOnAnomaly(
    metricType: 'latency_spike' | 'quality_degradation' | 'cost_overrun' | 'error_rate_high',
    threshold: number,
    actual: number
  ): QualityAlert | null {
    if (actual <= threshold) return null;

    const alert: QualityAlert = {
      id: `alert-${Date.now()}-${++this.counter}`,
      type: metricType,
      severity: actual > threshold * 2 ? 'critical' : 'warning',
      metric: metricType,
      threshold,
      actual,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(alert);

    const cacheKey = `sanliurfa:alert:${alert.id}`;
    redis.setex(cacheKey, 86400, JSON.stringify(alert));

    logger.warn('Quality alert triggered', {
      type: metricType,
      threshold,
      actual,
      severity: alert.severity
    });

    return alert;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    logger.info('Alert acknowledged', { alertId });
    return true;
  }

  getActiveAlerts(severity?: 'warning' | 'critical'): QualityAlert[] {
    return this.alerts.filter(a =>
      !a.acknowledged &&
      (!severity || a.severity === severity)
    );
  }

  getAlertStats(): {
    total: number;
    active: number;
    bySeverity: Record<string, number>;
  } {
    const active = this.getActiveAlerts();
    const bySeverity: Record<string, number> = { warning: 0, critical: 0 };

    for (const alert of this.alerts) {
      bySeverity[alert.severity]++;
    }

    return {
      total: this.alerts.length,
      active: active.length,
      bySeverity
    };
  }

  getMetrics(limit: number = 100): QualityAlert[] {
    return this.alerts.slice(-limit);
  }
}

export const embeddingAnalytics = new EmbeddingAnalytics();
export const retrievalAnalytics = new RetrievalAnalytics();
export const llmMetrics = new LLMMetrics();
export const qualityMonitor = new QualityMonitor();

export { EmbeddingMetrics, RetrievalMetrics, LLMMetrics, QualityAlert };
