/**
 * Phase 150: Metrics Correlation & Analytics
 * Multi-metric correlation, root cause analysis, time-series analysis
 */

import { logger } from './logger';

interface MetricTimeSeries {
  metricName: string;
  dataPoints: Array<{ timestamp: number; value: number }>;
  mean: number;
  stdDev: number;
}

interface CorrelationPair {
  metric1: string;
  metric2: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak';
  significance: number;
}

interface RootCauseHypothesis {
  cause: string;
  confidence: number;
  affectedServices: string[];
  supportingMetrics: string[];
  explanation: string;
}

interface CorrelationMatrix {
  metrics: string[];
  matrix: number[][];
  strongPairs: CorrelationPair[];
  weakPairs: CorrelationPair[];
}

class MetricsCorrelator {
  private counter = 0;

  correlateMetrics(timeSeries: Record<string, Array<{ timestamp: number; value: number }>>): CorrelationMatrix {
    const metricNames = Object.keys(timeSeries);
    const n = metricNames.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // Calculate correlation coefficients
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const correlation = this.calculateCorrelation(timeSeries[metricNames[i]], timeSeries[metricNames[j]]);
          matrix[i][j] = correlation;
        }
      }
    }

    const strongPairs: CorrelationPair[] = [];
    const weakPairs: CorrelationPair[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const coeff = matrix[i][j];
        const pair: CorrelationPair = {
          metric1: metricNames[i],
          metric2: metricNames[j],
          coefficient: coeff,
          strength: Math.abs(coeff) > 0.7 ? 'strong' : Math.abs(coeff) > 0.4 ? 'moderate' : 'weak',
          significance: Math.abs(coeff)
        };

        if (pair.strength === 'strong') {
          strongPairs.push(pair);
        } else if (pair.strength === 'weak') {
          weakPairs.push(pair);
        }
      }
    }

    logger.debug('Metrics correlated', { metricCount: n, strongPairs: strongPairs.length });

    return { metrics: metricNames, matrix, strongPairs, weakPairs };
  }

  private calculateCorrelation(series1: Array<{ timestamp: number; value: number }>, series2: Array<{ timestamp: number; value: number }>): number {
    const values1 = series1.map(p => p.value);
    const values2 = series2.map(p => p.value);

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    return numerator / Math.sqrt(denominator1 * denominator2);
  }
}

class TimeSeriesAnalyzer {
  private counter = 0;

  alignTimeSeries(series: MetricTimeSeries[]): MetricTimeSeries[] {
    const minTimestamp = Math.min(...series.flatMap(s => s.dataPoints.map(p => p.timestamp)));
    const maxTimestamp = Math.max(...series.flatMap(s => s.dataPoints.map(p => p.timestamp)));

    return series.map(s => ({
      ...s,
      dataPoints: s.dataPoints.filter(p => p.timestamp >= minTimestamp && p.timestamp <= maxTimestamp)
    }));
  }

  detectTrend(series: MetricTimeSeries): { trend: 'increasing' | 'decreasing' | 'stable'; slope: number } {
    const points = series.dataPoints;
    if (points.length < 2) return { trend: 'stable', slope: 0 };

    const slope = (points[points.length - 1].value - points[0].value) / points.length;

    return {
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      slope
    };
  }

  detectAnomaly(series: MetricTimeSeries, threshold: number = 2): { isAnomaly: boolean; zScore: number } {
    if (series.dataPoints.length === 0) return { isAnomaly: false, zScore: 0 };

    const lastValue = series.dataPoints[series.dataPoints.length - 1].value;
    const zScore = Math.abs((lastValue - series.mean) / series.stdDev);

    return {
      isAnomaly: zScore > threshold,
      zScore
    };
  }

  forecastNextValue(series: MetricTimeSeries, stepsAhead: number = 1): number {
    const points = series.dataPoints;
    if (points.length < 2) return series.mean;

    const slope = (points[points.length - 1].value - points[0].value) / points.length;
    return points[points.length - 1].value + slope * stepsAhead;
  }
}

class RootCauseAnalyzer {
  private counter = 0;

  analyzeCorrelation(correlation: CorrelationMatrix, anomalousMetric: string): RootCauseHypothesis[] {
    const hypotheses: RootCauseHypothesis[] = [];

    const metricIndex = correlation.metrics.indexOf(anomalousMetric);
    if (metricIndex === -1) return hypotheses;

    // Find strongly correlated metrics
    correlation.strongPairs.forEach(pair => {
      if (pair.metric1 === anomalousMetric) {
        hypotheses.push({
          cause: `Correlation with ${pair.metric2}`,
          confidence: Math.abs(pair.coefficient),
          affectedServices: [pair.metric1, pair.metric2],
          supportingMetrics: [pair.metric2],
          explanation: `${pair.metric1} is strongly correlated with ${pair.metric2} (r=${pair.coefficient.toFixed(2)})`
        });
      }
    });

    // Sort by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);

    logger.debug('Root cause analyzed', { metric: anomalousMetric, hypotheses: hypotheses.length });

    return hypotheses;
  }

  buildDependencyGraph(correlation: CorrelationMatrix): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    correlation.metrics.forEach(metric => {
      graph[metric] = [];
    });

    correlation.strongPairs.forEach(pair => {
      if (!graph[pair.metric1].includes(pair.metric2)) {
        graph[pair.metric1].push(pair.metric2);
      }
      if (!graph[pair.metric2].includes(pair.metric1)) {
        graph[pair.metric2].push(pair.metric1);
      }
    });

    return graph;
  }
}

class CorrelationEngine {
  private counter = 0;

  compareMetricsBefore(before: Record<string, number[]>, after: Record<string, number[]>): { changed: Record<string, number>; delta: Record<string, number> } {
    const changed: Record<string, number> = {};
    const delta: Record<string, number> = {};

    Object.keys(before).forEach(metric => {
      const beforeMean = before[metric].reduce((a, b) => a + b, 0) / before[metric].length;
      const afterMean = after[metric] ? after[metric].reduce((a, b) => a + b, 0) / after[metric].length : beforeMean;

      delta[metric] = afterMean - beforeMean;

      if (Math.abs(delta[metric]) > beforeMean * 0.1) {
        changed[metric] = delta[metric];
      }
    });

    logger.debug('Metrics compared', { changedCount: Object.keys(changed).length });

    return { changed, delta };
  }

  evaluateImpact(dependencyGraph: Record<string, string[]>, failedService: string): { primaryImpact: string[]; cascadingImpact: string[] } {
    const primary = dependencyGraph[failedService] || [];
    const cascading: Set<string> = new Set();

    primary.forEach(service => {
      (dependencyGraph[service] || []).forEach(s => {
        if (s !== failedService) cascading.add(s);
      });
    });

    return {
      primaryImpact: primary,
      cascadingImpact: Array.from(cascading)
    };
  }
}

export const metricsCorrelator = new MetricsCorrelator();
export const timeSeriesAnalyzer = new TimeSeriesAnalyzer();
export const rootCauseAnalyzer = new RootCauseAnalyzer();
export const correlationEngine = new CorrelationEngine();

export { MetricTimeSeries, CorrelationPair, RootCauseHypothesis, CorrelationMatrix };
