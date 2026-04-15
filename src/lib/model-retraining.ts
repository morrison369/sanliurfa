/**
 * Phase 170: Model Retraining Orchestration
 * Retraining scheduler, training data management, hyperparameter tuning, orchestration
 */

import { logger } from './logger';

interface RetrainingJob {
  jobId: string;
  modelId: string;
  triggeredBy: 'schedule' | 'drift' | 'performance' | 'manual';
  status: 'queued' | 'running' | 'completed' | 'failed';
  datasetId: string;
  hyperparameters: Record<string, any>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metrics?: Record<string, number>;
}

interface TrainingDataset {
  datasetId: string;
  name: string;
  source: string;
  samplesCount: number;
  featuresCount: number;
  createdAt: number;
  version: number;
  splitRatios: { train: number; validation: number; test: number };
}

interface HyperparameterTrial {
  trialId: string;
  hyperparameters: Record<string, any>;
  metrics: Record<string, number>;
  status: 'running' | 'completed' | 'pruned';
  createdAt: number;
}

class RetrainingScheduler {
  private schedules: Map<string, { modelId: string; trigger: 'drift' | 'schedule' | 'performance'; intervalMs?: number; driftThreshold?: number; performanceThreshold?: number; nextRunAt: number }> = new Map();
  private counter = 0;

  scheduleRetraining(modelId: string, trigger: 'drift' | 'schedule' | 'performance', options: { intervalMs?: number; driftThreshold?: number; performanceThreshold?: number }): string {
    const scheduleId = `schedule-${Date.now()}-${++this.counter}`;

    this.schedules.set(scheduleId, {
      modelId,
      trigger,
      intervalMs: options.intervalMs,
      driftThreshold: options.driftThreshold,
      performanceThreshold: options.performanceThreshold,
      nextRunAt: Date.now() + (options.intervalMs || 24 * 60 * 60 * 1000)
    });

    logger.debug('Retraining scheduled', { scheduleId, modelId, trigger });

    return scheduleId;
  }

  checkDueTriggers(): string[] {
    const due: string[] = [];
    for (const [scheduleId, schedule] of this.schedules) {
      if (schedule.trigger === 'schedule' && Date.now() >= schedule.nextRunAt) {
        due.push(scheduleId);
        schedule.nextRunAt = Date.now() + (schedule.intervalMs || 24 * 60 * 60 * 1000);
      }
    }
    return due;
  }

  triggerManualRetraining(modelId: string): string {
    const scheduleId = `manual-${Date.now()}-${++this.counter}`;
    logger.debug('Manual retraining triggered', { scheduleId, modelId });
    return scheduleId;
  }

  getSchedule(scheduleId: string): any {
    return this.schedules.get(scheduleId);
  }
}

class TrainingDataManager {
  private datasets: Map<string, TrainingDataset> = new Map();
  private counter = 0;

  registerDataset(name: string, source: string, samplesCount: number, featuresCount: number, splitRatios: { train: number; validation: number; test: number }): TrainingDataset {
    const datasetId = `dataset-${Date.now()}-${++this.counter}`;

    const dataset: TrainingDataset = {
      datasetId,
      name,
      source,
      samplesCount,
      featuresCount,
      createdAt: Date.now(),
      version: 1,
      splitRatios
    };

    this.datasets.set(datasetId, dataset);

    logger.debug('Training dataset registered', {
      datasetId,
      name,
      samplesCount,
      featuresCount
    });

    return dataset;
  }

  getSplits(datasetId: string): { trainCount: number; validationCount: number; testCount: number } | undefined {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) return undefined;

    return {
      trainCount: Math.floor(dataset.samplesCount * dataset.splitRatios.train),
      validationCount: Math.floor(dataset.samplesCount * dataset.splitRatios.validation),
      testCount: Math.floor(dataset.samplesCount * dataset.splitRatios.test)
    };
  }

  getDataset(datasetId: string): TrainingDataset | undefined {
    return this.datasets.get(datasetId);
  }

  versionDataset(datasetId: string): TrainingDataset | undefined {
    const dataset = this.datasets.get(datasetId);
    if (dataset) {
      const newVersionId = `${datasetId}-v${dataset.version + 1}`;
      const versioned: TrainingDataset = {
        ...dataset,
        datasetId: newVersionId,
        version: dataset.version + 1,
        createdAt: Date.now()
      };
      this.datasets.set(newVersionId, versioned);
      return versioned;
    }
    return undefined;
  }

  listDatasets(): TrainingDataset[] {
    return Array.from(this.datasets.values());
  }
}

class HyperparameterTuner {
  private trials: Map<string, HyperparameterTrial[]> = new Map();
  private counter = 0;

  startTrial(jobId: string, hyperparameters: Record<string, any>): HyperparameterTrial {
    const trialId = `trial-${Date.now()}-${++this.counter}`;

    const trial: HyperparameterTrial = {
      trialId,
      hyperparameters,
      metrics: {},
      status: 'running',
      createdAt: Date.now()
    };

    const existing = this.trials.get(jobId) || [];
    existing.push(trial);
    this.trials.set(jobId, existing);

    logger.debug('Hyperparameter trial started', { trialId, jobId, params: Object.keys(hyperparameters).length });

    return trial;
  }

  completeTrial(jobId: string, trialId: string, metrics: Record<string, number>): HyperparameterTrial | undefined {
    const trials = this.trials.get(jobId) || [];
    const trial = trials.find(t => t.trialId === trialId);

    if (trial) {
      trial.metrics = metrics;
      trial.status = 'completed';
      return trial;
    }

    return undefined;
  }

  getBestTrial(jobId: string, optimizeMetric: string, minimize: boolean): HyperparameterTrial | undefined {
    const trials = (this.trials.get(jobId) || []).filter(t => t.status === 'completed');

    if (trials.length === 0) return undefined;

    return trials.reduce((best, current) => {
      const bestVal = best.metrics[optimizeMetric] ?? (minimize ? Infinity : -Infinity);
      const currentVal = current.metrics[optimizeMetric] ?? (minimize ? Infinity : -Infinity);

      if (minimize) {
        return currentVal < bestVal ? current : best;
      }
      return currentVal > bestVal ? current : best;
    });
  }

  suggestHyperparameters(paramRanges: Record<string, { min: number; max: number }>): Record<string, number> {
    const suggested: Record<string, number> = {};

    for (const [param, range] of Object.entries(paramRanges)) {
      suggested[param] = range.min + Math.random() * (range.max - range.min);
    }

    return suggested;
  }
}

class RetrainingOrchestrator {
  private jobs: Map<string, RetrainingJob> = new Map();
  private counter = 0;

  createJob(modelId: string, triggeredBy: 'schedule' | 'drift' | 'performance' | 'manual', datasetId: string, hyperparameters: Record<string, any>): RetrainingJob {
    const jobId = `retrain-${Date.now()}-${++this.counter}`;

    const job: RetrainingJob = {
      jobId,
      modelId,
      triggeredBy,
      status: 'queued',
      datasetId,
      hyperparameters,
      createdAt: Date.now()
    };

    this.jobs.set(jobId, job);

    logger.debug('Retraining job created', { jobId, modelId, triggeredBy });

    return job;
  }

  startJob(jobId: string): RetrainingJob | undefined {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'queued') {
      job.status = 'running';
      job.startedAt = Date.now();
      return job;
    }
    return undefined;
  }

  completeJob(jobId: string, metrics: Record<string, number>): RetrainingJob | undefined {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = Date.now();
      job.metrics = metrics;

      logger.debug('Retraining job completed', {
        jobId,
        durationMs: job.completedAt - (job.startedAt || job.createdAt),
        metrics
      });

      return job;
    }
    return undefined;
  }

  getJob(jobId: string): RetrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByModel(modelId: string): RetrainingJob[] {
    return Array.from(this.jobs.values()).filter(j => j.modelId === modelId);
  }

  getRunningJobs(): RetrainingJob[] {
    return Array.from(this.jobs.values()).filter(j => j.status === 'running');
  }
}

export const retrainingScheduler = new RetrainingScheduler();
export const trainingDataManager = new TrainingDataManager();
export const hyperparameterTuner = new HyperparameterTuner();
export const retrainingOrchestrator = new RetrainingOrchestrator();

export { RetrainingJob, TrainingDataset, HyperparameterTrial };
