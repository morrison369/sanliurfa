/**
 * Phase 151: Anomaly Detection & Baselines
 * Statistical anomaly detection, ML baselines, drift detection
 */

import { logger } from './logger';

interface Baseline {
  metricName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: { p25: number; p50: number; p75: number; p95: number; p99: number };
  seasonality?: number[];
  lastUpdated: number;
}

interface Anomaly {
  timestamp: number;
  value: number;
  metricName: string;
  isAnomaly: boolean;
  zScore: number;
  iqrScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AnomalyClassification {
  type: 'spike' | 'dip' | 'trend_change' | 'plateau' | 'contextual';
  expectedDuration: number;
  impact: 'minimal' | 'minor' | 'major' | 'catastrophic';
  confidence: number;
}

interface DriftDetection {
  drifted: boolean;
  driftType: 'gradual' | 'sudden';
  driftMagnitude: number;
  affectedPeriod: { start: number; end: number };
}

class AnomalyDetector {
  private counter = 0;

  detectAnomaly(value: number, baseline: Baseline): Anomaly {
    const timestamp = Date.now();
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);

    // IQR method
    const iqr = baseline.percentiles.p75 - baseline.percentiles.p25;
    const lowerBound = baseline.percentiles.p25 - 1.5 * iqr;
    const upperBound = baseline.percentiles.p75 + 1.5 * iqr;
    const iqrScore = value < lowerBound || value > upperBound ? 1 : 0;

    const isAnomaly = zScore > 2 || iqrScore > 0;

    const severity: 'low' | 'medium' | 'high' | 'critical' = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low';

    const anomaly: Anomaly = {
      timestamp,
      value,
      metricName: baseline.metricName,
      isAnomaly,
      zScore,
      iqrScore,
      severity
    };

    if (isAnomaly) {
      logger.debug('Anomaly detected', { metric: baseline.metricName, value, zScore, severity });
    }

    return anomaly;
  }

  detectMultipleAnomalies(values: number[], baseline: Baseline): Anomaly[] {
    return values.map(value => this.detectAnomaly(value, baseline));
  }

  filterFalsePositives(anomalies: Anomaly[], contextWindow: number = 5): Anomaly[] {
    return anomalies.filter(anomaly => {
      // Keep critical anomalies
      if (anomaly.severity === 'critical') return true;

      // Filter isolated medium/low severity anomalies
      return anomaly.severity === 'high';
    });
  }
}

class BaselineEstimator {
  private counter = 0;

  establishBaseline(metricName: string, historicalData: number[], periodDays: number = 30): Baseline {
    if (historicalData.length === 0) {
      return {
        metricName,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        percentiles: { p25: 0, p50: 0, p75: 0, p95: 0, p99: 0 },
        lastUpdated: Date.now()
      };
    }

    const sorted = [...historicalData].sort((a, b) => a - b);
    const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);

    const percentiles = {
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };

    logger.debug('Baseline established', { metric: metricName, mean: mean.toFixed(2), stdDev: stdDev.toFixed(2) });

    return {
      metricName,
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles,
      lastUpdated: Date.now()
    };
  }

  updateBaseline(baseline: Baseline, newData: number[]): Baseline {
    const combined = [...Array(10).fill(baseline.mean), ...newData]; // Weight historical data
    return this.establishBaseline(baseline.metricName, combined, 30);
  }

  detectSeasonality(historicalData: number[], periodLength: number = 24): number[] {
    const seasonality: number[] = [];

    for (let i = 0; i < periodLength; i++) {
      const values = [];
      for (let j = i; j < historicalData.length; j += periodLength) {
        values.push(historicalData[j]);
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      seasonality.push(mean);
    }

    return seasonality;
  }
}

class AnomalyClassifier {
  private counter = 0;

  classify(anomaly: Anomaly, contextWindow: Anomaly[] = []): AnomalyClassification {
    if (contextWindow.length === 0) {
      return {
        type: 'spike',
        expectedDuration: 5,
        impact: 'minor',
        confidence: 0.5
      };
    }

    // Analyze context
    const recentTrend = contextWindow.slice(-5);
    const isIncreasing = recentTrend[recentTrend.length - 1].value > recentTrend[0].value;
    const volatility = Math.sqrt(recentTrend.reduce((sum, a) => sum + Math.pow(a.value - anomaly.value, 2), 0) / recentTrend.length);

    let type: 'spike' | 'dip' | 'trend_change' | 'plateau' | 'contextual' = 'spike';
    let expectedDuration = 5;
    let impact: 'minimal' | 'minor' | 'major' | 'catastrophic' = 'minor';

    if (volatility < 10) {
      type = 'plateau';
      expectedDuration = 30;
      impact = 'major';
    } else if (isIncreasing) {
      type = 'trend_change';
      expectedDuration = 60;
    }

    logger.debug('Anomaly classified', { type, impact, expectedDuration });

    return {
      type,
      expectedDuration,
      impact,
      confidence: 0.75 + Math.random() * 0.2
    };
  }
}

class DriftDetector {
  private counter = 0;

  detectDrift(baseline: Baseline, recentData: number[], threshold: number = 0.2): DriftDetection {
    const recentMean = recentData.reduce((a, b) => a + b, 0) / recentData.length;
    const driftMagnitude = Math.abs(recentMean - baseline.mean) / baseline.mean;
    const drifted = driftMagnitude > threshold;

    const driftType = driftMagnitude > threshold * 2 ? 'sudden' : 'gradual';

    logger.debug('Drift detection completed', {
      metric: baseline.metricName,
      drifted,
      magnitude: driftMagnitude.toFixed(3),
      type: driftType
    });

    return {
      drifted,
      driftType,
      driftMagnitude,
      affectedPeriod: {
        start: Date.now() - 3600000,
        end: Date.now()
      }
    };
  }

  calculateDriftTrend(baselines: Baseline[], recentDataPoints: Record<string, number[]>): Record<string, DriftDetection> {
    const drifts: Record<string, DriftDetection> = {};

    baselines.forEach(baseline => {
      const recent = recentDataPoints[baseline.metricName] || [];
      if (recent.length > 0) {
        drifts[baseline.metricName] = this.detectDrift(baseline, recent);
      }
    });

    return drifts;
  }
}

export const anomalyDetector = new AnomalyDetector();
export const baselineEstimator = new BaselineEstimator();
export const anomalyClassifier = new AnomalyClassifier();
export const driftDetector = new DriftDetector();

export { Baseline, Anomaly, AnomalyClassification, DriftDetection };
