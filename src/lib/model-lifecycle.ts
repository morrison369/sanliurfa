/**
 * Phase 167: Model Lifecycle Management
 * Model registry, deployment, A/B testing, retirement
 */

import { logger } from './logger';

interface ModelVersion {
  modelId: string;
  versionId: string;
  name: string;
  version: string;
  framework: 'tensorflow' | 'pytorch' | 'sklearn' | 'xgboost' | 'custom';
  metrics: Record<string, number>;
  artifactPath: string;
  createdAt: number;
  status: 'training' | 'staged' | 'production' | 'retired';
}

interface ModelDeployment {
  deploymentId: string;
  modelId: string;
  versionId: string;
  environment: 'staging' | 'production' | 'shadow';
  replicas: number;
  deployedAt: number;
  status: 'deploying' | 'active' | 'inactive' | 'failed';
  endpoint: string;
}

interface ABTest {
  testId: string;
  name: string;
  modelA: string;
  modelB: string;
  trafficSplitA: number;
  trafficSplitB: number;
  startedAt: number;
  metrics: Record<string, { modelA: number; modelB: number }>;
  status: 'running' | 'completed' | 'paused';
}

class ModelRegistry {
  private models: Map<string, ModelVersion> = new Map();
  private counter = 0;

  registerModel(name: string, version: string, framework: 'tensorflow' | 'pytorch' | 'sklearn' | 'xgboost' | 'custom', metrics: Record<string, number>, artifactPath: string): ModelVersion {
    const modelId = `model-${Date.now()}-${++this.counter}`;
    const versionId = `${modelId}-v${version}`;

    const model: ModelVersion = {
      modelId,
      versionId,
      name,
      version,
      framework,
      metrics,
      artifactPath,
      createdAt: Date.now(),
      status: 'staged'
    };

    this.models.set(versionId, model);

    logger.debug('Model registered', { versionId, name, version, framework });

    return model;
  }

  promoteToProduction(versionId: string): ModelVersion | undefined {
    const model = this.models.get(versionId);
    if (model) {
      // Retire current production models for same name
      for (const [, m] of this.models) {
        if (m.name === model.name && m.status === 'production' && m.versionId !== versionId) {
          m.status = 'retired';
        }
      }
      model.status = 'production';
      logger.debug('Model promoted to production', { versionId, name: model.name });
      return model;
    }
    return undefined;
  }

  getModel(versionId: string): ModelVersion | undefined {
    return this.models.get(versionId);
  }

  getProductionModel(name: string): ModelVersion | undefined {
    return Array.from(this.models.values()).find(m => m.name === name && m.status === 'production');
  }

  listModelVersions(name: string): ModelVersion[] {
    return Array.from(this.models.values())
      .filter(m => m.name === name)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  compareVersions(versionIdA: string, versionIdB: string): Record<string, { a: number; b: number; winner: string }> {
    const modelA = this.models.get(versionIdA);
    const modelB = this.models.get(versionIdB);

    if (!modelA || !modelB) return {};

    const comparison: Record<string, { a: number; b: number; winner: string }> = {};

    for (const [metric, valueA] of Object.entries(modelA.metrics)) {
      const valueB = modelB.metrics[metric] ?? 0;
      comparison[metric] = {
        a: valueA,
        b: valueB,
        winner: valueA >= valueB ? versionIdA : versionIdB
      };
    }

    return comparison;
  }
}

class ModelDeploymentManager {
  private deployments: Map<string, ModelDeployment> = new Map();
  private counter = 0;

  deployModel(modelId: string, versionId: string, environment: 'staging' | 'production' | 'shadow', replicas: number): ModelDeployment {
    const deploymentId = `deploy-${Date.now()}-${++this.counter}`;

    const deployment: ModelDeployment = {
      deploymentId,
      modelId,
      versionId,
      environment,
      replicas,
      deployedAt: Date.now(),
      status: 'deploying',
      endpoint: `/api/ml/${modelId}/${environment}`
    };

    this.deployments.set(deploymentId, deployment);

    // Simulate deployment completion
    setTimeout(() => {
      deployment.status = 'active';
    }, 100);

    logger.debug('Model deployment initiated', {
      deploymentId,
      modelId,
      versionId,
      environment,
      replicas
    });

    return deployment;
  }

  scaleDeployment(deploymentId: string, replicas: number): ModelDeployment | undefined {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.replicas = replicas;
      logger.debug('Deployment scaled', { deploymentId, replicas });
      return deployment;
    }
    return undefined;
  }

  getDeployment(deploymentId: string): ModelDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  getActiveDeployments(environment?: string): ModelDeployment[] {
    return Array.from(this.deployments.values()).filter(d =>
      d.status === 'active' && (!environment || d.environment === environment)
    );
  }

  deactivateDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.status = 'inactive';
      return true;
    }
    return false;
  }
}

class ModelABTestManager {
  private tests: Map<string, ABTest> = new Map();
  private counter = 0;

  startABTest(name: string, modelA: string, modelB: string, splitA: number): ABTest {
    const testId = `ab-test-${Date.now()}-${++this.counter}`;

    const test: ABTest = {
      testId,
      name,
      modelA,
      modelB,
      trafficSplitA: splitA,
      trafficSplitB: 100 - splitA,
      startedAt: Date.now(),
      metrics: {},
      status: 'running'
    };

    this.tests.set(testId, test);

    logger.debug('A/B test started', {
      testId,
      name,
      modelA,
      modelB,
      splitA,
      splitB: 100 - splitA
    });

    return test;
  }

  recordMetric(testId: string, metricName: string, valueA: number, valueB: number): void {
    const test = this.tests.get(testId);
    if (test) {
      test.metrics[metricName] = { modelA: valueA, modelB: valueB };
    }
  }

  selectWinner(testId: string, primaryMetric: string): { winner: string; confidence: number } | undefined {
    const test = this.tests.get(testId);
    if (!test) return undefined;

    const metricData = test.metrics[primaryMetric];
    if (!metricData) return undefined;

    const winner = metricData.modelA >= metricData.modelB ? test.modelA : test.modelB;
    const confidence = Math.abs(metricData.modelA - metricData.modelB) / Math.max(metricData.modelA, metricData.modelB) * 100;

    test.status = 'completed';

    logger.debug('A/B test winner selected', { testId, winner, confidence });

    return { winner, confidence };
  }

  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }
}

class ModelRetirementManager {
  private retirementLogs: Map<string, { versionId: string; reason: string; retiredAt: number; archivedPath?: string }> = new Map();
  private counter = 0;

  retireModel(versionId: string, reason: string): { retirementId: string; versionId: string; retiredAt: number } {
    const retirementId = `retirement-${Date.now()}-${++this.counter}`;

    this.retirementLogs.set(retirementId, {
      versionId,
      reason,
      retiredAt: Date.now()
    });

    logger.debug('Model retired', { retirementId, versionId, reason });

    return { retirementId, versionId, retiredAt: Date.now() };
  }

  archiveModel(retirementId: string, archivePath: string): boolean {
    const log = this.retirementLogs.get(retirementId);
    if (log) {
      log.archivedPath = archivePath;
      return true;
    }
    return false;
  }

  getRetirementLog(retirementId: string): { versionId: string; reason: string; retiredAt: number; archivedPath?: string } | undefined {
    return this.retirementLogs.get(retirementId);
  }

  getRetiredModels(): Array<{ retirementId: string; versionId: string; reason: string; retiredAt: number }> {
    return Array.from(this.retirementLogs.entries()).map(([id, log]) => ({
      retirementId: id,
      ...log
    }));
  }
}

export const modelRegistry = new ModelRegistry();
export const modelDeploymentManager = new ModelDeploymentManager();
export const modelABTestManager = new ModelABTestManager();
export const modelRetirementManager = new ModelRetirementManager();

export { ModelVersion, ModelDeployment, ABTest };
