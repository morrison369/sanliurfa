/**
 * Phase 168: ML Observability & Monitoring
 * Performance monitoring, feature drift detection, prediction analysis, health tracking
 */

import { logger } from './logger';

interface PerformanceSnapshot {
  snapshotId: string;
  modelId: string;
  accuracy: number;
  latencyMs: number;
  throughput: number;
  errorRate: number;
  timestamp: number;
}

interface DriftReport {
  reportId: string;
  featureName: string;
  baselineStats: { mean: number; stddev: number; min: number; max: number };
  currentStats: { mean: number; stddev: number; min: number; max: number };
  driftScore: number;
  driftDetected: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  detectedAt: number;
}

interface PredictionDistribution {
  modelId: string;
  timestamp: number;
  predictions: number[];
  classDistribution?: Record<string, number>;
  confidenceStats: { mean: number; p50: number; p95: number; p99: number };
}

class ModelPerformanceMonitor {
  private snapshots: Map<string, PerformanceSnapshot[]> = new Map();
  private counter = 0;

  recordSnapshot(modelId: string, accuracy: number, latencyMs: number, throughput: number, errorRate: number): PerformanceSnapshot {
    const snapshotId = `snapshot-${Date.now()}-${++this.counter}`;

    const snapshot: PerformanceSnapshot = {
      snapshotId,
      modelId,
      accuracy,
      latencyMs,
      throughput,
      errorRate,
      timestamp: Date.now()
    };

    const existing = this.snapshots.get(modelId) || [];
    existing.push(snapshot);
    this.snapshots.set(modelId, existing);

    logger.debug('Performance snapshot recorded', {
      snapshotId,
      modelId,
      accuracy,
      latencyMs,
      errorRate
    });

    return snapshot;
  }

  detectPerformanceDegradation(modelId: string, thresholds: { accuracy?: number; latencyMs?: number; errorRate?: number }): { degraded: boolean; reasons: string[] } {
    const snapshots = this.snapshots.get(modelId) || [];
    if (snapshots.length === 0) return { degraded: false, reasons: [] };

    const latest = snapshots[snapshots.length - 1];
    const reasons: string[] = [];

    if (thresholds.accuracy && latest.accuracy < thresholds.accuracy) {
      reasons.push(`Accuracy ${latest.accuracy.toFixed(2)} below threshold ${thresholds.accuracy}`);
    }

    if (thresholds.latencyMs && latest.latencyMs > thresholds.latencyMs) {
      reasons.push(`Latency ${latest.latencyMs}ms exceeds threshold ${thresholds.latencyMs}ms`);
    }

    if (thresholds.errorRate && latest.errorRate > thresholds.errorRate) {
      reasons.push(`Error rate ${latest.errorRate.toFixed(3)} exceeds threshold ${thresholds.errorRate}`);
    }

    return { degraded: reasons.length > 0, reasons };
  }

  getPerformanceTrend(modelId: string, windowSize: number): { improving: boolean; metric: string; change: number } {
    const snapshots = this.snapshots.get(modelId) || [];

    if (snapshots.length < 2) {
      return { improving: false, metric: 'accuracy', change: 0 };
    }

    const recent = snapshots.slice(-windowSize);
    const first = recent[0].accuracy;
    const last = recent[recent.length - 1].accuracy;
    const change = ((last - first) / first) * 100;

    return { improving: change > 0, metric: 'accuracy', change };
  }

  getLatestSnapshot(modelId: string): PerformanceSnapshot | undefined {
    const snapshots = this.snapshots.get(modelId) || [];
    return snapshots[snapshots.length - 1];
  }
}

class FeatureDriftDetector {
  private baselineStats: Map<string, { mean: number; stddev: number; min: number; max: number }> = new Map();
  private reports: Map<string, DriftReport> = new Map();
  private counter = 0;

  establishBaseline(featureName: string, values: number[]): void {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stddev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    this.baselineStats.set(featureName, {
      mean,
      stddev,
      min: Math.min(...values),
      max: Math.max(...values)
    });

    logger.debug('Feature baseline established', { featureName, mean, stddev });
  }

  detectDrift(featureName: string, currentValues: number[]): DriftReport | null {
    const baseline = this.baselineStats.get(featureName);
    if (!baseline) return null;

    const currentMean = currentValues.reduce((a, b) => a + b, 0) / currentValues.length;
    const currentStddev = Math.sqrt(currentValues.reduce((sum, v) => sum + Math.pow(v - currentMean, 2), 0) / currentValues.length);

    // Calculate drift score (simplified Population Stability Index)
    const driftScore = Math.abs(currentMean - baseline.mean) / baseline.stddev;

    const severity = driftScore > 0.5 ? 'high' : driftScore > 0.2 ? 'medium' : driftScore > 0.1 ? 'low' : 'none';
    const driftDetected = severity !== 'none';

    const reportId = `drift-${Date.now()}-${++this.counter}`;
    const report: DriftReport = {
      reportId,
      featureName,
      baselineStats: baseline,
      currentStats: {
        mean: currentMean,
        stddev: currentStddev,
        min: Math.min(...currentValues),
        max: Math.max(...currentValues)
      },
      driftScore,
      driftDetected,
      severity,
      detectedAt: Date.now()
    };

    if (driftDetected) {
      this.reports.set(reportId, report);
      logger.debug('Feature drift detected', {
        reportId,
        featureName,
        driftScore,
        severity
      });
    }

    return report;
  }

  getDriftReport(reportId: string): DriftReport | undefined {
    return this.reports.get(reportId);
  }

  getHighDriftFeatures(): DriftReport[] {
    return Array.from(this.reports.values()).filter(r => r.severity === 'high');
  }
}

class PredictionDistributionAnalyzer {
  private distributions: Map<string, PredictionDistribution[]> = new Map();

  recordPredictions(modelId: string, predictions: number[], classDistribution?: Record<string, number>): PredictionDistribution {
    const sorted = [...predictions].sort((a, b) => a - b);
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const distribution: PredictionDistribution = {
      modelId,
      timestamp: Date.now(),
      predictions,
      classDistribution,
      confidenceStats: { mean, p50, p95, p99 }
    };

    const existing = this.distributions.get(modelId) || [];
    existing.push(distribution);
    this.distributions.set(modelId, existing);

    logger.debug('Predictions recorded', {
      modelId,
      count: predictions.length,
      meanConfidence: mean.toFixed(3)
    });

    return distribution;
  }

  detectLowConfidencePredictions(modelId: string, threshold: number): { count: number; percentage: number } {
    const distributions = this.distributions.get(modelId) || [];
    if (distributions.length === 0) return { count: 0, percentage: 0 };

    const latest = distributions[distributions.length - 1];
    const lowConfidenceCount = latest.predictions.filter(p => p < threshold).length;
    const percentage = (lowConfidenceCount / latest.predictions.length) * 100;

    return { count: lowConfidenceCount, percentage };
  }

  getLatestDistribution(modelId: string): PredictionDistribution | undefined {
    const distributions = this.distributions.get(modelId) || [];
    return distributions[distributions.length - 1];
  }
}

class ModelHealthTracker {
  private healthScores: Map<string, { score: number; status: 'healthy' | 'degraded' | 'critical'; timestamp: number }[]> = new Map();
  private counter = 0;

  calculateHealthScore(modelId: string, metrics: { accuracy: number; latency: number; errorRate: number; driftScore: number }): number {
    const accuracyScore = metrics.accuracy * 100;
    const latencyScore = Math.max(0, 100 - (metrics.latency / 10));
    const errorScore = Math.max(0, 100 - (metrics.errorRate * 1000));
    const driftScore = Math.max(0, 100 - (metrics.driftScore * 50));

    return (accuracyScore * 0.4 + latencyScore * 0.2 + errorScore * 0.25 + driftScore * 0.15);
  }

  recordHealthScore(modelId: string, score: number): void {
    const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

    const existing = this.healthScores.get(modelId) || [];
    existing.push({ score, status, timestamp: Date.now() });
    this.healthScores.set(modelId, existing);

    if (status !== 'healthy') {
      logger.debug('Model health degraded', { modelId, score: score.toFixed(1), status });
    }
  }

  getHealthStatus(modelId: string): { score: number; status: 'healthy' | 'degraded' | 'critical' } | undefined {
    const scores = this.healthScores.get(modelId) || [];
    return scores[scores.length - 1];
  }

  getCriticalModels(): string[] {
    const criticalModels: string[] = [];

    for (const [modelId, scores] of this.healthScores) {
      const latest = scores[scores.length - 1];
      if (latest?.status === 'critical') {
        criticalModels.push(modelId);
      }
    }

    return criticalModels;
  }

  getHealthTrend(modelId: string): 'improving' | 'declining' | 'stable' {
    const scores = this.healthScores.get(modelId) || [];
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-3);
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    const change = last - first;

    return change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
  }
}

export const modelPerformanceMonitor = new ModelPerformanceMonitor();
export const featureDriftDetector = new FeatureDriftDetector();
export const predictionDistributionAnalyzer = new PredictionDistributionAnalyzer();
export const modelHealthTracker = new ModelHealthTracker();

export { PerformanceSnapshot, DriftReport, PredictionDistribution };
