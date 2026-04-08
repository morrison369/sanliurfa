/**
 * Phase 36: Predictive Analytics & Time Series
 * Time series forecasting, anomaly detection, trend analysis, demand prediction
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface DataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface Forecast {
  timestamp: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface AnomalyResult {
  timestamp: number;
  value: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  zscore: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  slope: number;
  strength: number;
  changePoints: number[];
}

// ==================== TIME SERIES ANALYZER ====================

export class TimeSeriesAnalyzer {
  private series = new Map<string, DataPoint[]>();

  /**
   * Add data point to series
   */
  addDataPoint(seriesId: string, point: DataPoint): void {
    if (!this.series.has(seriesId)) {
      this.series.set(seriesId, []);
    }

    this.series.get(seriesId)!.push(point);

    // Keep last 10k points to prevent memory bloat
    const data = this.series.get(seriesId)!;
    if (data.length > 10000) {
      data.shift();
    }

    logger.debug('Data point added', { seriesId, value: point.value });
  }

  /**
   * Forecast future values using linear regression
   */
  forecast(seriesId: string, steps: number): Forecast[] {
    const data = this.series.get(seriesId);
    if (!data || data.length < 2) {
      return [];
    }

    // Linear regression: y = a + bx
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate standard deviation for confidence intervals
    let sumResiduals = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      const residual = data[i].value - predicted;
      sumResiduals += residual * residual;
    }

    const stdDev = Math.sqrt(sumResiduals / n);

    const forecasts: Forecast[] = [];
    const lastTimestamp = data[n - 1].timestamp;

    for (let i = 1; i <= steps; i++) {
      const predicted = intercept + slope * (n + i - 1);
      const margin = 1.96 * stdDev; // 95% confidence

      forecasts.push({
        timestamp: lastTimestamp + i * (lastTimestamp - data[n - 2].timestamp),
        predicted: Math.round(predicted),
        lowerBound: Math.round(predicted - margin),
        upperBound: Math.round(predicted + margin),
        confidence: 0.95
      });
    }

    return forecasts;
  }

  /**
   * Detect anomalies using z-score
   */
  detectAnomalies(seriesId: string, windowSize: number = 30): AnomalyResult[] {
    const data = this.series.get(seriesId);
    if (!data || data.length < 3) {
      return [];
    }

    const anomalies: AnomalyResult[] = [];
    const threshold = 2.5; // z-score threshold

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const mean = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      const variance = window.reduce((sum, p) => sum + (p.value - mean) ** 2, 0) / windowSize;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        const zscore = (data[i].value - mean) / stdDev;

        if (Math.abs(zscore) > threshold) {
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (Math.abs(zscore) > 4) {
            severity = 'high';
          } else if (Math.abs(zscore) > 3) {
            severity = 'medium';
          }

          anomalies.push({
            timestamp: data[i].timestamp,
            value: data[i].value,
            isAnomaly: true,
            severity,
            zscore: Math.round(zscore * 100) / 100
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Analyze trend direction
   */
  analyzeTrend(seriesId: string): TrendAnalysis {
    const data = this.series.get(seriesId);
    if (!data || data.length < 2) {
      return { direction: 'stable', slope: 0, strength: 0, changePoints: [] };
    }

    // Linear regression for slope
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].value;
      sumXY += i * data[i].value;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (slope > 0.01) {
      direction = 'up';
    } else if (slope < -0.01) {
      direction = 'down';
    }

    // Strength (R-squared)
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssRes = 0;

    for (let i = 0; i < n; i++) {
      const yPred = (sumY / n) + slope * (i - sumX / n);
      ssTotal += (data[i].value - meanY) ** 2;
      ssRes += (data[i].value - yPred) ** 2;
    }

    const strength = Math.max(0, (ssTotal - ssRes) / ssTotal);

    return {
      direction,
      slope: Math.round(slope * 10000) / 10000,
      strength: Math.round(strength * 100) / 100,
      changePoints: [] // Would require more sophisticated detection
    };
  }
}

// ==================== DEMAND PREDICTOR ====================

export class DemandPredictor {
  private models = new Map<string, DataPoint[]>();

  /**
   * Train on historical data
   */
  trainOnHistory(entityId: string, history: DataPoint[]): void {
    this.models.set(entityId, [...history].sort((a, b) => a.timestamp - b.timestamp));
    logger.debug('Model trained', { entityId, dataPoints: history.length });
  }

  /**
   * Predict demand at future date
   */
  predict(entityId: string, futureDate: number): { predicted: number; confidence: number } {
    const history = this.models.get(entityId);
    if (!history || history.length < 2) {
      return { predicted: 0, confidence: 0 };
    }

    // Simple linear interpolation/extrapolation
    const lastPoint = history[history.length - 1];
    const secondLastPoint = history[history.length - 2];

    const timeDiff = lastPoint.timestamp - secondLastPoint.timestamp;
    const valueDiff = lastPoint.value - secondLastPoint.value;
    const trend = valueDiff / timeDiff;

    const predicted = lastPoint.value + trend * (futureDate - lastPoint.timestamp);

    return {
      predicted: Math.max(0, Math.round(predicted)),
      confidence: 0.7 // Conservative confidence
    };
  }

  /**
   * Get peak periods
   */
  getPeakPeriods(entityId: string): { start: number; end: number; magnitude: number }[] {
    const history = this.models.get(entityId);
    if (!history || history.length < 3) {
      return [];
    }

    const peaks = [];
    const mean = history.reduce((sum, p) => sum + p.value, 0) / history.length;

    for (let i = 1; i < history.length - 1; i++) {
      if (history[i].value > history[i - 1].value && history[i].value > history[i + 1].value) {
        if (history[i].value > mean * 1.5) {
          peaks.push({
            start: history[i - 1].timestamp,
            end: history[i + 1].timestamp,
            magnitude: Math.round(history[i].value)
          });
        }
      }
    }

    return peaks.slice(0, 10);
  }
}

// ==================== PATTERN MATCHER ====================

export class PatternMatcher {
  private patterns = new Map<string, number[]>();

  /**
   * Add pattern to library
   */
  addPattern(patternId: string, sequence: number[]): void {
    this.patterns.set(patternId, sequence);
    logger.debug('Pattern registered', { patternId, length: sequence.length });
  }

  /**
   * Find similar patterns using Euclidean distance
   */
  findSimilarPatterns(sequence: number[], topK: number = 5): { patternId: string; similarity: number }[] {
    const similarities: [string, number][] = [];

    for (const [patternId, pattern] of this.patterns) {
      if (pattern.length !== sequence.length) continue;

      let distance = 0;
      for (let i = 0; i < sequence.length; i++) {
        distance += (sequence[i] - pattern[i]) ** 2;
      }

      distance = Math.sqrt(distance);
      const similarity = 1 / (1 + distance); // Inverse distance

      similarities.push([patternId, similarity]);
    }

    return similarities
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, sim]) => ({
        patternId: id,
        similarity: Math.round(sim * 100) / 100
      }));
  }

  /**
   * Detect recurring patterns
   */
  detectRecurring(seriesData: number[]): { pattern: number[]; period: number; confidence: number }[] {
    const recurring = [];

    // Simple period detection
    for (let period = 2; period <= seriesData.length / 2; period++) {
      let matches = 0;
      const tolerance = Math.max(...seriesData) * 0.1; // 10% tolerance

      for (let i = period; i < seriesData.length; i++) {
        if (Math.abs(seriesData[i] - seriesData[i - period]) < tolerance) {
          matches++;
        }
      }

      const confidence = matches / (seriesData.length - period);

      if (confidence > 0.7) {
        const pattern = seriesData.slice(0, period);
        recurring.push({
          pattern,
          period,
          confidence: Math.round(confidence * 100) / 100
        });
      }
    }

    return recurring.slice(0, 5);
  }
}

// ==================== EXPORTS ====================

export const timeSeriesAnalyzer = new TimeSeriesAnalyzer();
export const demandPredictor = new DemandPredictor();
export const patternMatcher = new PatternMatcher();
