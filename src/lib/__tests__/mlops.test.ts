/**
 * Advanced AI/ML Ops & MLOps (Phase 167-172)
 * Test suite for model lifecycle, observability, feature store,
 * retraining, explainability, and cost optimization
 */

import { describe, it, expect } from 'vitest';
import {
  modelRegistry,
  modelDeploymentManager,
  modelABTestManager,
  modelRetirementManager,
  modelPerformanceMonitor,
  featureDriftDetector,
  predictionDistributionAnalyzer,
  modelHealthTracker,
  featureStoreManager,
  featurePipelineOrchestrator,
  featureValidator,
  featureVersionManager,
  retrainingScheduler,
  trainingDataManager,
  hyperparameterTuner,
  retrainingOrchestrator,
  explainabilityAnalyzer,
  biasDetector,
  modelAuditor,
  explainabilityReporter,
  mlInfrastructureCostTracker,
  modelEfficiencyAnalyzer,
  computeResourceOptimizer,
  mlCostReporter
} from '../index';

// Phase 167: Model Lifecycle Management
describe('Phase 167: Model Lifecycle Management', () => {
  it('should register and promote model versions', () => {
    const model = modelRegistry.registerModel(
      'fraud-detector',
      '1.0.0',
      'sklearn',
      { accuracy: 0.95, f1: 0.93 },
      '/models/fraud-detector/v1'
    );

    expect(model).toBeDefined();
    expect(model.name).toBe('fraud-detector');
    expect(model.status).toBe('staged');

    const promoted = modelRegistry.promoteToProduction(model.versionId);
    expect(promoted?.status).toBe('production');
  });

  it('should deploy models and manage deployments', () => {
    const model = modelRegistry.registerModel('test-model', '1.0', 'pytorch', { accuracy: 0.88 }, '/models/test');
    const deployment = modelDeploymentManager.deployModel(model.modelId, model.versionId, 'staging', 3);

    expect(deployment).toBeDefined();
    expect(deployment.environment).toBe('staging');
    expect(deployment.replicas).toBe(3);
    expect(deployment.endpoint).toContain('/api/ml/');
  });

  it('should run A/B tests between model versions', () => {
    const test = modelABTestManager.startABTest('accuracy-test', 'model-v1', 'model-v2', 70);
    modelABTestManager.recordMetric(test.testId, 'accuracy', 0.91, 0.94);

    const winner = modelABTestManager.selectWinner(test.testId, 'accuracy');
    expect(winner).toBeDefined();
    expect(winner?.winner).toMatch(/model-v1|model-v2/);
  });

  it('should retire and archive old models', () => {
    const retired = modelRetirementManager.retireModel('model-v0', 'Replaced by v1 with better accuracy');
    expect(retired).toBeDefined();
    expect(retired.versionId).toBe('model-v0');

    const archived = modelRetirementManager.archiveModel(retired.retirementId, '/archive/models/v0');
    expect(archived).toBe(true);
  });
});

// Phase 168: ML Observability & Monitoring
describe('Phase 168: ML Observability & Monitoring', () => {
  it('should monitor model performance and detect degradation', () => {
    modelPerformanceMonitor.recordSnapshot('fraud-model', 0.95, 25, 500, 0.01);
    modelPerformanceMonitor.recordSnapshot('fraud-model', 0.78, 120, 200, 0.08);

    const degradation = modelPerformanceMonitor.detectPerformanceDegradation('fraud-model', {
      accuracy: 0.85,
      latencyMs: 100,
      errorRate: 0.05
    });

    expect(degradation.degraded).toBe(true);
    expect(degradation.reasons.length).toBeGreaterThan(0);
  });

  it('should detect feature drift', () => {
    featureDriftDetector.establishBaseline('age', [25, 30, 35, 28, 32, 27, 34, 31]);

    const report = featureDriftDetector.detectDrift('age', [25, 30, 35, 28, 32, 27, 34, 31]);
    expect(report).toBeDefined();
    expect(report?.driftScore).toBeGreaterThanOrEqual(0);
    expect(report?.severity).toMatch(/none|low|medium|high/);
  });

  it('should analyze prediction distributions', () => {
    const predictions = [0.92, 0.87, 0.95, 0.43, 0.98, 0.76, 0.88, 0.91];
    const distribution = predictionDistributionAnalyzer.recordPredictions('model-123', predictions);

    expect(distribution).toBeDefined();
    expect(distribution.confidenceStats.mean).toBeGreaterThan(0);
    expect(distribution.confidenceStats.p95).toBeGreaterThan(distribution.confidenceStats.p50);
  });

  it('should track model health scores', () => {
    const score = modelHealthTracker.calculateHealthScore('model-123', {
      accuracy: 0.95,
      latency: 25,
      errorRate: 0.01,
      driftScore: 0.05
    });

    modelHealthTracker.recordHealthScore('model-123', score);
    const health = modelHealthTracker.getHealthStatus('model-123');
    expect(health).toBeDefined();
    expect(health?.status).toMatch(/healthy|degraded|critical/);
  });
});

// Phase 169: Feature Engineering & Store
describe('Phase 169: Feature Engineering & Store', () => {
  it('should register and retrieve features', () => {
    const feature = featureStoreManager.registerFeature(
      'user_age',
      'User age in years',
      'numeric',
      'user.birthdate.toAge()',
      ['user', 'demographics']
    );

    expect(feature.featureId).toBeDefined();
    expect(feature.dataType).toBe('numeric');

    featureStoreManager.storeValue(feature.featureId, 'user-123', 35);
    const value = featureStoreManager.getValue(feature.featureId, 'user-123');
    expect(value?.value).toBe(35);
  });

  it('should run feature pipelines', () => {
    const pipeline = featurePipelineOrchestrator.createPipeline(
      'user-features',
      ['feature-1', 'feature-2'],
      '0 0 * * *'
    );

    expect(pipeline.status).toBe('active');

    const result = featurePipelineOrchestrator.runPipeline(pipeline.pipelineId);
    expect(result.success).toBe(true);
    expect(result.featuresProcessed).toBe(2);
  });

  it('should validate feature quality', () => {
    const values = [1, 2, 3, null, 5, 6, 7, 8, 9, 10] as any[];
    const result = featureValidator.validateFeatureValues('user-age', values, 'numeric');

    expect(result).toBeDefined();
    expect(result.nullRate).toBeGreaterThan(0);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should version feature definitions', () => {
    const v1 = featureVersionManager.versionFeature('feature-123', 'user.age');
    const v2 = featureVersionManager.versionFeature('feature-123', 'user.age * 1.0');

    expect(v1).toBe(1);
    expect(v2).toBe(2);

    const comparison = featureVersionManager.compareVersions('feature-123', 1, 2);
    expect(comparison.changed).toBe(true);
  });
});

// Phase 170: Model Retraining Orchestration
describe('Phase 170: Model Retraining Orchestration', () => {
  it('should schedule and trigger retraining', () => {
    const scheduleId = retrainingScheduler.scheduleRetraining(
      'fraud-model',
      'schedule',
      { intervalMs: 7 * 24 * 60 * 60 * 1000 }
    );

    expect(scheduleId).toBeDefined();

    const schedule = retrainingScheduler.getSchedule(scheduleId);
    expect(schedule?.modelId).toBe('fraud-model');
    expect(schedule?.nextRunAt).toBeGreaterThan(Date.now());
  });

  it('should manage training datasets', () => {
    const dataset = trainingDataManager.registerDataset(
      'fraud-training-v1',
      's3://ml-data/fraud/',
      100000,
      25,
      { train: 0.7, validation: 0.15, test: 0.15 }
    );

    expect(dataset.samplesCount).toBe(100000);

    const splits = trainingDataManager.getSplits(dataset.datasetId);
    expect(splits?.trainCount).toBe(70000);
    expect(splits?.validationCount).toBe(15000);
  });

  it('should tune hyperparameters', () => {
    const suggested = hyperparameterTuner.suggestHyperparameters({
      learning_rate: { min: 0.0001, max: 0.01 },
      batch_size: { min: 16, max: 256 }
    });

    expect(suggested.learning_rate).toBeGreaterThanOrEqual(0.0001);
    expect(suggested.learning_rate).toBeLessThanOrEqual(0.01);

    const trial = hyperparameterTuner.startTrial('job-123', suggested);
    const completed = hyperparameterTuner.completeTrial('job-123', trial.trialId, { accuracy: 0.93, loss: 0.08 });
    expect(completed?.status).toBe('completed');
  });

  it('should orchestrate complete retraining workflow', () => {
    const job = retrainingOrchestrator.createJob(
      'fraud-model',
      'drift',
      'dataset-123',
      { learning_rate: 0.001 }
    );

    expect(job.status).toBe('queued');
    expect(job.triggeredBy).toBe('drift');

    const started = retrainingOrchestrator.startJob(job.jobId);
    expect(started?.status).toBe('running');

    const completed = retrainingOrchestrator.completeJob(job.jobId, { accuracy: 0.96, f1: 0.94 });
    expect(completed?.status).toBe('completed');
    expect(completed?.metrics?.accuracy).toBe(0.96);
  });
});

// Phase 171: Model Explainability & Governance
describe('Phase 171: Model Explainability & Governance', () => {
  it('should generate prediction explanations', () => {
    const explanation = explainabilityAnalyzer.generateExplanation(
      'fraud-model',
      'transaction-456',
      { fraud: 0.92 },
      { amount: 500, hour: 2, unusual_merchant: 1, num_transactions_today: 15 }
    );

    expect(explanation).toBeDefined();
    expect(explanation.topFactors.length).toBeGreaterThan(0);
    expect(explanation.features.length).toBeGreaterThan(0);
  });

  it('should detect model bias', () => {
    const biasReport = biasDetector.detectBias('fraud-model', 'gender', [
      { groupName: 'male', truePositiveRate: 0.88, falsePositiveRate: 0.05, accuracy: 0.94 },
      { groupName: 'female', truePositiveRate: 0.73, falsePositiveRate: 0.03, accuracy: 0.72 }
    ]);

    expect(biasReport).toBeDefined();
    expect(biasReport.attribute).toBe('gender');
    expect(biasReport.disparateImpact).toBeLessThan(1);
  });

  it('should audit models for compliance', () => {
    const audit = modelAuditor.conductAudit(
      'fraud-model',
      'v1.0.0',
      'fairness',
      'auditor-789',
      [],
      true
    );

    expect(audit.auditId).toBeDefined();
    expect(audit.passed).toBe(true);

    const clearance = modelAuditor.isModelClearForProduction('fraud-model');
    expect(clearance).toHaveProperty('cleared');
  });

  it('should generate explainability reports', () => {
    const explanation = explainabilityAnalyzer.generateExplanation(
      'model-test',
      'entity-123',
      { label: 'positive' },
      { feat1: 0.8, feat2: 0.3 }
    );

    const biasReport = biasDetector.detectBias('model-test', 'age', [
      { groupName: 'young', truePositiveRate: 0.9, falsePositiveRate: 0.04, accuracy: 0.93 },
      { groupName: 'senior', truePositiveRate: 0.88, falsePositiveRate: 0.03, accuracy: 0.92 }
    ]);

    const report = explainabilityReporter.generateReport('model-test', [explanation], [biasReport]);
    expect(report.reportId).toBeDefined();
    expect(report.complianceStatus).toMatch(/COMPLIANT|REVIEW_REQUIRED|NON_COMPLIANT/);
  });
});

// Phase 172: ML Cost Optimization
describe('Phase 172: ML Cost Optimization', () => {
  it('should track and report ML infrastructure costs', () => {
    mlInfrastructureCostTracker.recordCost('fraud-model', 'training', 120.50, 'USD');
    mlInfrastructureCostTracker.recordCost('fraud-model', 'inference', 45.00, 'USD');

    const total = mlInfrastructureCostTracker.getTotalCost('fraud-model');
    expect(total.amount).toBeCloseTo(165.50, 1);

    const breakdown = mlInfrastructureCostTracker.getCostByResourceType('fraud-model');
    expect(breakdown.training).toBeCloseTo(120.50, 1);
  });

  it('should analyze model efficiency', () => {
    const metric = modelEfficiencyAnalyzer.analyzeEfficiency(
      'fraud-model',
      15,
      5 * 1024 * 1024,
      512,
      2000,
      0.001
    );

    expect(metric.efficiency).toMatch(/excellent|good|fair|poor/);
    expect(metric.inferenceTimeMs).toBe(15);
  });

  it('should create compute optimization plans', () => {
    const efficiencyMetric = modelEfficiencyAnalyzer.analyzeEfficiency(
      'slow-model',
      250,
      200 * 1024 * 1024,
      4096,
      50,
      0.05
    );

    const plan = computeResourceOptimizer.createOptimizationPlan(
      'slow-model',
      efficiencyMetric,
      1000
    );

    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.estimatedSavingsPct).toBeGreaterThan(0);
    expect(plan.priority).toMatch(/low|medium|high/);
  });

  it('should forecast costs and generate alerts', () => {
    const historicalCosts = [100, 110, 120, 130, 140];
    const forecast = mlCostReporter.forecastCosts(historicalCosts, 3);

    expect(forecast.forecast.length).toBe(3);
    expect(forecast.trend).toMatch(/increasing|decreasing|stable/);

    const alerts = mlCostReporter.generateCostAlerts(
      [{ costId: 'c1', modelId: 'fraud-model', resourceType: 'inference', amount: 150, currency: 'USD', period: '2026-04', timestamp: Date.now(), metadata: {} }],
      { 'fraud-model': 100 }
    );

    const fraudAlert = alerts.find(a => a.modelId === 'fraud-model');
    expect(fraudAlert?.exceeded).toBe(true);
  });
});
