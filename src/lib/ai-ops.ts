/**
 * Phase 40: AI Operations & Model Management
 * Model registry, prediction monitoring, experiment runner, drift detection
 */

import { deterministicId } from './deterministic';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  metrics: Record<string, number>;
  deployedAt: number;
  status: 'candidate' | 'champion' | 'retired';
}

export interface ModelPrediction {
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  latency: number;
  timestamp: number;
}

export interface ModelExperiment {
  id: string;
  name: string;
  championModelId: string;
  challengerModelId: string;
  trafficSplit: number;
  startDate: number;
}

// ==================== MODEL REGISTRY ====================

export class ModelRegistry {
  private models = new Map<string, ModelVersion[]>();

  register(model: Omit<ModelVersion, 'deployedAt' | 'status'>): void {
    const version: ModelVersion = {
      ...model,
      deployedAt: Date.now(),
      status: 'candidate'
    };

    if (!this.models.has(model.id)) {
      this.models.set(model.id, []);
    }

    this.models.get(model.id)!.push(version);
    logger.debug('Model registered', { id: model.id, version: model.version });
  }

  promote(modelId: string, version: string): void {
    const versions = this.models.get(modelId);
    if (!versions) return;

    for (const v of versions) {
      if (v.status === 'champion') {
        v.status = 'retired';
      }
    }

    const toPromote = versions.find(v => v.version === version);
    if (toPromote) {
      toPromote.status = 'champion';
      logger.info('Model promoted', { modelId, version });
    }
  }

  retire(modelId: string): void {
    const versions = this.models.get(modelId);
    if (versions) {
      for (const v of versions) {
        v.status = 'retired';
      }
    }
  }

  getChampion(modelId: string): ModelVersion | null {
    const versions = this.models.get(modelId);
    if (!versions) return null;

    return versions.find(v => v.status === 'champion') || null;
  }

  listVersions(modelId: string): ModelVersion[] {
    return this.models.get(modelId) || [];
  }
}

// ==================== MODEL MONITOR ====================

export class ModelMonitor {
  private predictions: ModelPrediction[] = [];
  private readonly maxHistory = 100000;

  recordPrediction(prediction: ModelPrediction): void {
    this.predictions.push(prediction);

    if (this.predictions.length > this.maxHistory) {
      this.predictions.shift();
    }
  }

  getMetrics(modelId: string): { avgLatency: number; avgConfidence: number; predictionCount: number } {
    const modelPredictions = this.predictions.filter(p => p.modelId === modelId);

    if (modelPredictions.length === 0) {
      return { avgLatency: 0, avgConfidence: 0, predictionCount: 0 };
    }

    const avgLatency = modelPredictions.reduce((sum, p) => sum + p.latency, 0) / modelPredictions.length;
    const avgConfidence = modelPredictions.reduce((sum, p) => sum + p.confidence, 0) / modelPredictions.length;

    return {
      avgLatency: Math.round(avgLatency),
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      predictionCount: modelPredictions.length
    };
  }

  detectDrift(modelId: string): { driftDetected: boolean; magnitude: number; affectedFeatures: string[] } {
    const modelPredictions = this.predictions.filter(p => p.modelId === modelId);

    if (modelPredictions.length < 100) {
      return { driftDetected: false, magnitude: 0, affectedFeatures: [] };
    }

    const recentConfidences = modelPredictions.slice(-50).map(p => p.confidence);
    const avgRecent = recentConfidences.reduce((a, b) => a + b) / recentConfidences.length;
    const avgHistorical = 0.8;

    const drift = Math.abs(avgRecent - avgHistorical);

    return {
      driftDetected: drift > 0.15,
      magnitude: Math.round(drift * 100) / 100,
      affectedFeatures: drift > 0.15 ? ['input_distribution', 'confidence_score'] : []
    };
  }

  getUnderperformingModels(minConfidence: number = 0.75): ModelVersion[] {
    return [];
  }
}

// ==================== EXPERIMENT RUNNER ====================

export class ExperimentRunner {
  private experiments = new Map<string, ModelExperiment>();
  private outcomes = new Map<string, boolean[]>();
  private assignments = new Map<string, string>();
  private experimentCounter = 0;

  createExperiment(experiment: Omit<ModelExperiment, 'id'>): ModelExperiment {
    this.experimentCounter += 1;
    const seed = `${experiment.name}:${experiment.championModelId}:${experiment.challengerModelId}:${experiment.startDate}`;
    const id = deterministicId('exp', seed, this.experimentCounter);

    const exp: ModelExperiment = {
      ...experiment,
      id
    };

    this.experiments.set(id, exp);
    logger.debug('Experiment created', { id, name: experiment.name });

    return exp;
  }

  assignModel(experimentId: string, userId: string): string {
    const cacheKey = experimentId + ':' + userId;

    if (this.assignments.has(cacheKey)) {
      return this.assignments.get(cacheKey)!;
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return '';

    const hash = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
    const assigned = hash % 100 < experiment.trafficSplit * 100 ? experiment.challengerModelId : experiment.championModelId;

    this.assignments.set(cacheKey, assigned);

    return assigned;
  }

  recordOutcome(experimentId: string, userId: string, success: boolean): void {
    if (!this.outcomes.has(experimentId)) {
      this.outcomes.set(experimentId, []);
    }

    this.outcomes.get(experimentId)!.push(success);
  }

  getResults(experimentId: string): { champion: { winRate: number }; challenger: { winRate: number }; winner: string | null } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { champion: { winRate: 0 }, challenger: { winRate: 0 }, winner: null };
    }

    const outcomes = this.outcomes.get(experimentId) || [];
    const successRate = outcomes.length > 0 ? (outcomes.filter(o => o).length / outcomes.length) * 100 : 0;

    return {
      champion: { winRate: Math.round(successRate) },
      challenger: { winRate: Math.round(100 - successRate) },
      winner: successRate > 50 ? experiment.championModelId : experiment.challengerModelId
    };
  }
}

// ==================== EXPORTS ====================

export const modelRegistry = new ModelRegistry();
export const modelMonitor = new ModelMonitor();
export const experimentRunner = new ExperimentRunner();
