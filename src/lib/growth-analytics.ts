/**
 * Phase 242: Growth Analytics
 * Growth loop tracking, acquisition funnel, retention cohort, growth experimentation
 */

import { logger } from './logger';

interface GrowthLoop {
  loopId: string;
  name: string;
  type: 'viral' | 'paid' | 'content' | 'product' | 'sales';
  inputMetric: string;
  outputMetric: string;
  loopCoefficient: number;  // multiplier effect
  cycleTimeDays: number;
  active: boolean;
  createdAt: number;
}

interface AcquisitionFunnelStage {
  stageId: string;
  name: string;
  order: number;
  entrants: number;
  exiters: number;
  conversionRate: number;  // exiters to next stage / entrants
  avgTimeInStageHours: number;
  period: string;
  capturedAt: number;
}

interface RetentionCohort {
  cohortId: string;
  cohortMonth: string;
  cohortSize: number;
  retentionByPeriod: Record<string, number>;  // "M1" → retention %
  avgRetention30: number;
  avgRetention90: number;
  churnRate: number;
  ltv: number;
  createdAt: number;
}

interface GrowthExperiment {
  experimentId: string;
  name: string;
  hypothesis: string;
  metric: string;
  controlValue: number;
  treatmentValue: number;
  uplift: number;          // percentage change
  pValue: number;
  isSignificant: boolean;  // p < 0.05
  sampleSize: number;
  status: 'running' | 'completed' | 'stopped';
  startedAt: number;
  completedAt?: number;
}

class GrowthLoopManager {
  private loops: Map<string, GrowthLoop> = new Map();
  private counter = 0;

  define(name: string, type: GrowthLoop['type'], inputMetric: string, outputMetric: string, loopCoefficient: number, cycleTimeDays: number): GrowthLoop {
    const loopId = `gloop-${Date.now()}-${++this.counter}`;
    const loop: GrowthLoop = {
      loopId, name, type, inputMetric, outputMetric,
      loopCoefficient, cycleTimeDays, active: true, createdAt: Date.now()
    };
    this.loops.set(loopId, loop);
    logger.debug('Growth loop defined', { loopId, name, type, loopCoefficient });
    return loop;
  }

  projectGrowth(loopId: string, initialInput: number, periods: number): number[] {
    const loop = this.loops.get(loopId);
    if (!loop) return [];
    const results = [initialInput];
    for (let i = 1; i <= periods; i++) {
      results.push(results[i - 1] * loop.loopCoefficient);
    }
    return results;
  }

  getViralLoops(): GrowthLoop[] {
    return Array.from(this.loops.values()).filter(l => l.type === 'viral' && l.active);
  }

  getLoop(loopId: string): GrowthLoop | undefined {
    return this.loops.get(loopId);
  }
}

class AcquisitionFunnelAnalyzer {
  private stages: Map<string, AcquisitionFunnelStage[]> = new Map();
  private counter = 0;

  record(name: string, order: number, entrants: number, exiters: number, avgTimeHours: number, period: string): AcquisitionFunnelStage {
    const stageId = `acqstage-${Date.now()}-${++this.counter}`;
    const stage: AcquisitionFunnelStage = {
      stageId, name, order, entrants, exiters,
      conversionRate: entrants > 0 ? (exiters / entrants) * 100 : 0,
      avgTimeInStageHours: avgTimeHours, period, capturedAt: Date.now()
    };
    const existing = this.stages.get(name) || [];
    existing.push(stage);
    this.stages.set(name, existing);
    return stage;
  }

  getOverallConversion(period: string): number {
    const periodStages = Array.from(this.stages.values())
      .map(h => h.filter(s => s.period === period))
      .flat()
      .sort((a, b) => a.order - b.order);
    if (!periodStages.length) return 0;
    const firstEntrants = periodStages[0].entrants;
    const lastExiters = periodStages[periodStages.length - 1].exiters;
    return firstEntrants > 0 ? (lastExiters / firstEntrants) * 100 : 0;
  }

  getBottleneck(period: string): AcquisitionFunnelStage | undefined {
    const stages = Array.from(this.stages.values())
      .map(h => h.find(s => s.period === period))
      .filter((s): s is AcquisitionFunnelStage => !!s);
    return stages.sort((a, b) => a.conversionRate - b.conversionRate)[0];
  }

  getLatest(stageName: string): AcquisitionFunnelStage | undefined {
    const history = this.stages.get(stageName) || [];
    return history[history.length - 1];
  }
}

class RetentionCohortAnalyzer {
  private cohorts: Map<string, RetentionCohort> = new Map();
  private counter = 0;

  analyze(cohortMonth: string, cohortSize: number, retentionByPeriod: Record<string, number>, ltv: number): RetentionCohort {
    const m1 = retentionByPeriod['M1'] || 0;
    const m2 = retentionByPeriod['M2'] || 0;
    const m3 = retentionByPeriod['M3'] || 0;
    const avgRetention30 = m1;
    const avgRetention90 = (m1 + m2 + m3) / 3;
    const cohortId = `cohort-${Date.now()}-${++this.counter}`;
    const cohort: RetentionCohort = {
      cohortId, cohortMonth, cohortSize, retentionByPeriod,
      avgRetention30, avgRetention90, churnRate: 100 - avgRetention30, ltv, createdAt: Date.now()
    };
    this.cohorts.set(cohortMonth, cohort);
    logger.debug('Retention cohort analyzed', { cohortMonth, avgRetention30, churnRate: cohort.churnRate });
    return cohort;
  }

  getBestRetentionCohorts(limit = 5): RetentionCohort[] {
    return Array.from(this.cohorts.values())
      .sort((a, b) => b.avgRetention90 - a.avgRetention90)
      .slice(0, limit);
  }

  getAvgRetention30(): number {
    const all = Array.from(this.cohorts.values());
    if (!all.length) return 0;
    return all.reduce((s, c) => s + c.avgRetention30, 0) / all.length;
  }

  getCohort(cohortMonth: string): RetentionCohort | undefined {
    return this.cohorts.get(cohortMonth);
  }
}

class GrowthExperimentEngine {
  private experiments: Map<string, GrowthExperiment> = new Map();
  private counter = 0;

  create(name: string, hypothesis: string, metric: string): GrowthExperiment {
    const experimentId = `gexp-${Date.now()}-${++this.counter}`;
    const experiment: GrowthExperiment = {
      experimentId, name, hypothesis, metric,
      controlValue: 0, treatmentValue: 0, uplift: 0,
      pValue: 1, isSignificant: false, sampleSize: 0,
      status: 'running', startedAt: Date.now()
    };
    this.experiments.set(experimentId, experiment);
    return experiment;
  }

  conclude(experimentId: string, controlValue: number, treatmentValue: number, pValue: number, sampleSize: number): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.controlValue = controlValue;
    exp.treatmentValue = treatmentValue;
    exp.uplift = controlValue > 0 ? ((treatmentValue - controlValue) / controlValue) * 100 : 0;
    exp.pValue = pValue;
    exp.isSignificant = pValue < 0.05;
    exp.sampleSize = sampleSize;
    exp.status = 'completed';
    exp.completedAt = Date.now();
    logger.debug('Growth experiment concluded', { experimentId, uplift: exp.uplift, isSignificant: exp.isSignificant });
    return true;
  }

  getSignificantWins(): GrowthExperiment[] {
    return Array.from(this.experiments.values())
      .filter(e => e.isSignificant && e.uplift > 0)
      .sort((a, b) => b.uplift - a.uplift);
  }

  getExperiment(experimentId: string): GrowthExperiment | undefined {
    return this.experiments.get(experimentId);
  }
}

export const growthLoopManager = new GrowthLoopManager();
export const acquisitionFunnelAnalyzer = new AcquisitionFunnelAnalyzer();
export const retentionCohortAnalyzer = new RetentionCohortAnalyzer();
export const growthExperimentEngine = new GrowthExperimentEngine();

export { GrowthLoop, AcquisitionFunnelStage, RetentionCohort, GrowthExperiment };
