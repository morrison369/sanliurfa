import { describe, expect, it } from 'vitest';
import { ExperimentRunner, modelMonitor } from '../ai-ops';
import { anomalyClassifier, baselineEstimator } from '../anomaly-detection';
import { complianceReporter } from '../compliance-frameworks';
import { coverageAnalyzer, coverageTrendAnalyzer } from '../coverage-analytics';

describe('Runtime determinism wave 4', () => {
  it('keeps AI ops experiment assignment and monitoring deterministic', () => {
    const runner = new ExperimentRunner();
    const experimentA = runner.createExperiment({
      name: 'ranking-eval',
      championModelId: 'champion-v1',
      challengerModelId: 'challenger-v2',
      trafficSplit: 0.35,
      startDate: 1704067200000
    });
    const experimentB = runner.createExperiment({
      name: 'ranking-eval',
      championModelId: 'champion-v1',
      challengerModelId: 'challenger-v2',
      trafficSplit: 0.35,
      startDate: 1704067200000
    });

    expect(experimentA.id).toMatch(/^exp-/);
    expect(experimentB.id).toMatch(/^exp-/);
    expect(experimentA.id).not.toBe(experimentB.id);
    expect(runner.assignModel(experimentA.id, 'user-42')).toBe(runner.assignModel(experimentA.id, 'user-42'));

    modelMonitor.recordPrediction({ modelId: 'ranking-model', input: {}, output: {}, confidence: 0.84, latency: 120, timestamp: 1 });
    modelMonitor.recordPrediction({ modelId: 'ranking-model', input: {}, output: {}, confidence: 0.76, latency: 140, timestamp: 2 });
    expect(modelMonitor.getMetrics('ranking-model')).toEqual(modelMonitor.getMetrics('ranking-model'));
  });

  it('keeps anomaly classification deterministic', () => {
    const baseline = baselineEstimator.establishBaseline('latency', [100, 105, 102, 110, 98, 101, 107]);
    const anomaly = {
      timestamp: 1,
      value: 145,
      metricName: 'latency',
      isAnomaly: true,
      zScore: 3.4,
      iqrScore: 1,
      severity: 'high' as const
    };

    expect(anomalyClassifier.classify(anomaly, [anomaly, anomaly])).toEqual(
      anomalyClassifier.classify(anomaly, [anomaly, anomaly])
    );
    expect(baseline.metricName).toBe('latency');
  });

  it('keeps compliance reporting deterministic', () => {
    const reportA = complianceReporter.generateReport('GDPR', { start: 1704067200000, end: 1706745600000 });
    const reportB = complianceReporter.generateReport('GDPR', { start: 1704067200000, end: 1706745600000 });

    expect(reportA.coverage).toBe(reportB.coverage);
    expect(reportA.gaps).toEqual(reportB.gaps);
    expect(reportA.recommendations).toEqual(reportB.recommendations);
  });

  it('keeps coverage analytics summary and trends deterministic', () => {
    coverageAnalyzer.recordCoverage({ line: 88, branch: 81, function: 90, statement: 89 });
    coverageAnalyzer.recordCoverage({ line: 86, branch: 79, function: 91, statement: 87 });

    const summaryA = coverageAnalyzer.getCoverageSummary();
    const summaryB = coverageAnalyzer.getCoverageSummary();
    const trendA = coverageTrendAnalyzer.getTrend('line', 14);
    const trendB = coverageTrendAnalyzer.getTrend('line', 14);

    expect(summaryA).toEqual(summaryB);
    expect(trendA).toEqual(trendB);
    expect(coverageTrendAnalyzer.forecastCoverage('line', 7)).toBe(coverageTrendAnalyzer.forecastCoverage('line', 7));
  });
});
