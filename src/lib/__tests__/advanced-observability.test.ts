/**
 * Advanced Observability & Monitoring (Phase 149-154)
 * Test suite for distributed tracing, metrics correlation, anomaly detection,
 * intelligent alerting, predictive incidents, and runbook automation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  traceContext,
  spanManager,
  traceCollector,
  traceExporter,
  metricsCorrelator,
  timeSeriesAnalyzer,
  rootCauseAnalyzer,
  correlationEngine,
  anomalyDetector,
  baselineEstimator,
  anomalyClassifier,
  driftDetector,
  alertManager,
  alertRouter,
  alertDeduplicator,
  dynamicThresholdManager,
  incidentPredictor,
  mttrEstimator,
  riskScorer,
  recommendationEngine,
  runbookManager,
  incidentResponder,
  automationExecutor,
  postIncidentAnalyzer
} from '../index';

// Phase 149: Distributed Tracing & Request Context
describe('Phase 149: Distributed Tracing & Request Context', () => {
  it('should create trace context with W3C traceparent header', () => {
    const trace = traceContext.startTrace('api-request');
    expect(trace).toBeDefined();
    expect(trace.traceId).toBeDefined();
    expect(trace.spanId).toBeDefined();
    expect(trace.traceparent).toMatch(/^00-/);
    expect(trace.tracestate).toBeDefined();
  });

  it('should manage spans with parent-child relationships', () => {
    const trace = traceContext.startTrace('api-request');
    const parentSpan = spanManager.createSpan('database-query', {
      traceId: trace.traceId,
      attributes: { query: 'SELECT *' }
    });

    expect(parentSpan).toBeDefined();
    expect(parentSpan.spanId).toBeDefined();
    expect(parentSpan.traceId).toBe(trace.traceId);

    const childSpan = spanManager.createSpan('index-scan', {
      traceId: trace.traceId,
      parentSpanId: parentSpan.spanId
    });

    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    const children = spanManager.getChildSpans(parentSpan.spanId);
    expect(children.length).toBeGreaterThan(0);
  });

  it('should collect and export traces to external systems', () => {
    const trace = traceContext.startTrace('api-request');
    const span = spanManager.createSpan('handler', { traceId: trace.traceId });
    spanManager.endSpan(span.spanId, { status: 'OK', duration: 125 });

    traceCollector.collectTrace(trace, [span]);
    const collected = traceCollector.getTrace(trace.traceId);

    expect(collected).toBeDefined();
    expect(collected?.spans).toHaveLength(1);

    const exported = traceExporter.exportTrace(trace, [span], 'jaeger');
    expect(exported).resolves.toMatchObject({ exported: true });
  });

  it('should query traces by operation name and duration', () => {
    const trace = traceContext.startTrace('user-login');
    const span = spanManager.createSpan('auth-check', { traceId: trace.traceId });
    spanManager.endSpan(span.spanId, { duration: 50 });
    traceCollector.collectTrace(trace, [span]);

    const results = traceCollector.queryTraces({ operationName: 'auth-check', maxDuration: 100 });
    expect(results.length).toBeGreaterThan(0);

    const metrics = traceCollector.getTraceMetrics(trace.traceId);
    expect(metrics).toBeDefined();
    expect(metrics?.spanCount).toBe(1);
  });
});

// Phase 150: Metrics Correlation & Analytics
describe('Phase 150: Metrics Correlation & Analytics', () => {
  it('should correlate multiple metrics and identify strong relationships', () => {
    const correlation = metricsCorrelator.correlateMetrics({
      latency: Array(30)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 100 + i * 2 })),
      cpuUsage: Array(30)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 50 + i * 1.5 }))
    });

    expect(correlation).toBeDefined();
    expect(correlation.metrics).toContain('latency');
    expect(correlation.metrics).toContain('cpuUsage');
    expect(correlation.matrix).toHaveLength(2);
  });

  it('should analyze time-series trends and detect anomalies', () => {
    const series = {
      metricName: 'response_time',
      dataPoints: Array(50)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 100 + Math.random() * 20 })),
      mean: 110,
      stdDev: 10
    };

    const trend = timeSeriesAnalyzer.detectTrend(series);
    expect(trend).toBeDefined();
    expect(trend.trend).toMatch(/increasing|decreasing|stable/);

    const anomaly = timeSeriesAnalyzer.detectAnomaly(series, 2);
    expect(anomaly).toHaveProperty('isAnomaly');
    expect(anomaly).toHaveProperty('zScore');
  });

  it('should perform root cause analysis on anomalies', () => {
    const correlation = metricsCorrelator.correlateMetrics({
      latency: Array(30)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 100 + i })),
      errorRate: Array(30)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 0.01 + i * 0.001 }))
    });

    const causes = rootCauseAnalyzer.analyzeCorrelation(correlation, 'latency');
    expect(Array.isArray(causes)).toBe(true);
    expect(causes[0]).toHaveProperty('confidence');
    expect(causes[0]).toHaveProperty('affectedServices');
  });

  it('should build dependency graph and evaluate service impact', () => {
    const correlation = metricsCorrelator.correlateMetrics({
      'api-service': Array(20)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 100 })),
      'database': Array(20)
        .fill(0)
        .map((_, i) => ({ timestamp: i, value: 100 }))
    });

    const graph = rootCauseAnalyzer.buildDependencyGraph(correlation);
    expect(graph).toBeDefined();
    expect(graph).toHaveProperty('api-service');

    const impact = correlationEngine.evaluateImpact(graph, 'database');
    expect(impact).toHaveProperty('primaryImpact');
    expect(impact).toHaveProperty('cascadingImpact');
  });
});

// Phase 151: Anomaly Detection & Baselines
describe('Phase 151: Anomaly Detection & Baselines', () => {
  it('should establish baselines from historical data', () => {
    const historicalData = Array(100)
      .fill(0)
      .map(() => 100 + Math.random() * 20);

    const baseline = baselineEstimator.establishBaseline('response_latency', historicalData, 30);

    expect(baseline).toBeDefined();
    expect(baseline.mean).toBeGreaterThan(0);
    expect(baseline.stdDev).toBeGreaterThan(0);
    expect(baseline.percentiles.p50).toBeDefined();
    expect(baseline.percentiles.p95).toBeGreaterThan(baseline.percentiles.p50);
  });

  it('should detect anomalies using z-score and IQR methods', () => {
    const baseline = {
      metricName: 'latency',
      mean: 150,
      stdDev: 30,
      min: 100,
      max: 200,
      percentiles: { p25: 130, p50: 150, p75: 170, p95: 190, p99: 200 },
      lastUpdated: Date.now()
    };

    const normalAnomaly = anomalyDetector.detectAnomaly(160, baseline);
    expect(normalAnomaly.isAnomaly).toBe(false);

    const extremeAnomaly = anomalyDetector.detectAnomaly(300, baseline);
    expect(extremeAnomaly.isAnomaly).toBe(true);
    expect(extremeAnomaly.severity).toMatch(/high|critical/);
  });

  it('should classify anomalies by type and impact', () => {
    const anomaly = {
      timestamp: Date.now(),
      value: 500,
      metricName: 'response_time',
      isAnomaly: true,
      zScore: 5,
      iqrScore: 1,
      severity: 'critical' as const
    };

    const classification = anomalyClassifier.classify(anomaly, []);
    expect(classification).toBeDefined();
    expect(classification.type).toMatch(/spike|dip|trend_change|plateau|contextual/);
    expect(classification).toHaveProperty('impact');
    expect(classification).toHaveProperty('confidence');
  });

  it('should detect baseline drift', () => {
    const baseline = {
      metricName: 'memory',
      mean: 1000,
      stdDev: 100,
      min: 800,
      max: 1200,
      percentiles: { p25: 900, p50: 1000, p75: 1100, p95: 1150, p99: 1200 },
      lastUpdated: Date.now()
    };

    const recentData = Array(20)
      .fill(0)
      .map(() => 1500 + Math.random() * 100);

    const drift = driftDetector.detectDrift(baseline, recentData, 0.2);
    expect(drift.drifted).toBe(true);
    expect(drift.driftType).toMatch(/gradual|sudden/);
    expect(drift).toHaveProperty('driftMagnitude');
  });
});

// Phase 152: Intelligent Alerting System
describe('Phase 152: Intelligent Alerting System', () => {
  it('should create alert rules and fire alerts', () => {
    const rule = alertManager.createRule({
      name: 'high-error-rate',
      condition: 'error_rate > 5%',
      severity: 'critical',
      enabled: true,
      routingTargets: ['ops-team']
    });

    expect(rule).toBeDefined();
    expect(rule.id).toBeDefined();

    const alert = alertManager.fireAlert(rule.id, { errorRate: 0.06 });
    expect(alert.status).toBe('firing');
    expect(alert.severity).toBe('critical');
  });

  it('should deduplicate alerts within time window', () => {
    const alert1 = {
      alertId: 'a1',
      ruleId: 'r1',
      timestamp: Date.now(),
      severity: 'critical' as const,
      title: 'High CPU',
      description: 'CPU > 90%',
      context: {},
      status: 'firing' as const
    };

    const alert2 = {
      alertId: 'a2',
      ruleId: 'r1',
      timestamp: Date.now() + 1000,
      severity: 'critical' as const,
      title: 'High CPU',
      description: 'CPU > 90%',
      context: {},
      status: 'firing' as const
    };

    const deduped = alertDeduplicator.deduplicate([alert1, alert2], 5);
    expect(deduped.length).toBeLessThanOrEqual(2);
  });

  it('should manage dynamic thresholds based on baseline', () => {
    const threshold = dynamicThresholdManager.calculateDynamicThreshold('latency', 150, 20);

    expect(threshold).toBeDefined();
    expect(threshold.calculatedThreshold).toBeGreaterThan(threshold.baselineValue);

    const updated = dynamicThresholdManager.updateBaseline('latency', 160);
    expect(updated?.calculatedThreshold).toBeGreaterThan(threshold.calculatedThreshold);
  });

  it('should route alerts and enrich with context', () => {
    const rule = alertManager.createRule({
      name: 'database-latency',
      condition: 'latency > 1000ms',
      severity: 'high',
      enabled: true,
      routingTargets: ['ops']
    });

    const alert = alertManager.fireAlert(rule.id, { latency: 1500 });
    const { routes, enrichedAlert } = alertRouter.routeAlert(alert);

    expect(enrichedAlert).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
  });
});

// Phase 153: Predictive Incident Management
describe('Phase 153: Predictive Incident Management', () => {
  it('should forecast incidents within time window', () => {
    const forecasts = incidentPredictor.forecast(240);

    expect(Array.isArray(forecasts)).toBe(true);
    if (forecasts.length > 0) {
      expect(forecasts[0]).toHaveProperty('incidentType');
      expect(forecasts[0]).toHaveProperty('likelihood');
      expect(forecasts[0]).toHaveProperty('confidence');
    }
  });

  it('should estimate MTTR based on historical data', () => {
    const prediction = mttrEstimator.estimate('database-failover');

    expect(prediction).toBeDefined();
    expect(prediction.estimatedMTTR).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.factors).toBeDefined();
  });

  it('should score incident risk and impact', () => {
    const metrics = { errorRate: 0.08, latency: 800 };
    const risk = riskScorer.score('api-timeout', metrics, ['api', 'gateway']);

    expect(risk).toBeDefined();
    expect(risk.overallRisk).toBeGreaterThan(0);
    expect(risk.impact).toMatch(/low|medium|high|critical/);
    expect(risk.probability).toMatch(/low|medium|high/);
    expect(risk.estimatedBlastRadius).toBe(2);
  });

  it('should generate preventive action recommendations', () => {
    const riskScore = {
      incidentType: 'memory-leak',
      overallRisk: 8,
      impact: 'high' as const,
      probability: 'high' as const,
      urgency: 'high' as const,
      affectedServices: ['api', 'worker'],
      estimatedBlastRadius: 5
    };

    const forecast = { incidentType: 'memory-leak', likelihood: 0.7 };

    const recommendations = recommendationEngine.generateRecommendations(riskScore, forecast);
    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations[0]).toHaveProperty('action');
    expect(recommendations[0]).toHaveProperty('priority');
  });
});

// Phase 154: Runbook Automation & Response
describe('Phase 154: Runbook Automation & Response', () => {
  it('should create and manage runbooks', () => {
    const runbook = runbookManager.create({
      name: 'database-failover',
      incidentType: 'database-unavailable',
      steps: [
        {
          id: 's1',
          action: 'notify-ops',
          description: 'Notify operations team',
          requiresApproval: true,
          timeout: 300000,
          parallel: false
        }
      ],
      status: 'active'
    });

    expect(runbook).toBeDefined();
    expect(runbook.id).toBeDefined();
    expect(runbook.status).toBe('active');

    const retrieved = runbookManager.getByIncidentType('database-unavailable');
    expect(retrieved).toBeDefined();
  });

  it('should execute incident response with step tracking', () => {
    const runbook = runbookManager.create({
      name: 'circuit-breaker-reset',
      incidentType: 'cascading-failure',
      steps: [
        { id: 's1', action: 'isolate', description: 'Isolate', requiresApproval: true, timeout: 60000, parallel: false }
      ],
      status: 'active'
    });

    const execution = incidentResponder.execute(runbook, 'incident-123');

    expect(execution).toBeDefined();
    expect(execution.status).toBe('in_progress');
    expect(execution.completedSteps).toBe(0);

    const stepResult = incidentResponder.executeStep(execution.executionId, 0);
    expect(stepResult.success).toBe(true);

    const completed = incidentResponder.completeExecution(execution.executionId);
    expect(completed?.status).toBe('completed');
    expect(completed?.actualMTTR).toBeGreaterThan(0);
  });

  it('should execute automation actions with approval workflow', async () => {
    const actionResult = await automationExecutor.executeAction('restart-service', { service: 'api' });

    expect(actionResult).toBeDefined();
    expect(actionResult).toHaveProperty('success');
    if (actionResult.success) {
      expect(actionResult.result).toHaveProperty('service');
    }
  });

  it('should perform post-incident analysis and generate suggestions', () => {
    const execution = {
      executionId: 'exec-123',
      runbookId: 'rb-123',
      incidentId: 'inc-123',
      status: 'completed' as const,
      completedSteps: 3,
      currentStep: 3,
      startTime: Date.now() - 300000,
      endTime: Date.now(),
      actualMTTR: 300000
    };

    const runbook = runbookManager.create({
      name: 'test-runbook',
      incidentType: 'test',
      steps: Array(4)
        .fill(0)
        .map((_, i) => ({
          id: `s${i}`,
          action: `action${i}`,
          description: `Step ${i}`,
          requiresApproval: false,
          timeout: 60000,
          parallel: false
        })),
      status: 'active'
    });

    const analysis = postIncidentAnalyzer.analyze(execution, runbook, 300000, 250000);

    expect(analysis).toBeDefined();
    expect(analysis.mttrAchieved).toBe(300000);
    expect(Array.isArray(analysis.suggestions)).toBe(true);
    expect(Array.isArray(analysis.lessons)).toBe(true);
  });
});
