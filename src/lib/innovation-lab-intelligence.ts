/**
 * Phase 296: Innovation Lab Intelligence
 * Experiment tracking, prototype velocity, ideation funnel, lab ROI
 */

import { logger } from './logger';

interface ExperimentRecord {
  experimentId: string;
  title: string;
  hypothesis: string;
  category: 'product' | 'process' | 'business_model' | 'technology' | 'ux' | 'market';
  labTeam: string;
  budget: number;
  spentToDate: number;
  startDate: number;
  targetEndDate: number;
  actualEndDate?: number;
  successCriteria: string[];
  outcomeMetric: string;
  baselineValue: number;
  targetValue: number;
  measuredValue?: number;
  resultType: 'success' | 'fail' | 'inconclusive' | 'pivot' | 'pending';
  learnings: string[];
  nextSteps: string[];
  status: 'planning' | 'running' | 'analysis' | 'completed' | 'terminated';
  createdAt: number;
}

interface PrototypeRecord {
  prototypeId: string;
  experimentId: string;
  name: string;
  version: string;
  fidelity: 'low' | 'medium' | 'high';
  buildTimeDays: number;
  testUserCount: number;
  usabilityScore: number;       // 0-100
  featureCompleteness: number;  // 0-100
  technicalReadiness: number;   // TRL equivalent 1-5
  pivotRequired: boolean;
  advancedToMVP: boolean;
  createdAt: number;
}

interface IdeationFunnelRecord {
  recordId: string;
  period: string;
  ideasSubmitted: number;
  ideasScreened: number;
  ideasApprovedForExperiment: number;
  experimentsStarted: number;
  prototypesBuilt: number;
  mvpLaunched: number;
  productionDeployed: number;
  submissionToMVPDays: number;
  funnelConversionPct: number;   // production / submitted × 100
  calculatedAt: number;
}

interface LabROIRecord {
  recordId: string;
  period: string;
  totalLabBudget: number;
  totalExperimentsRun: number;
  successfulExperiments: number;
  successRatePct: number;
  revenueFromInnovations: number;
  costsSaved: number;
  totalReturn: number;
  roiPct: number;
  avgExperimentCost: number;
  avgTimeToMarketDays: number;
  calculatedAt: number;
}

class ExperimentTracker {
  private experiments: Map<string, ExperimentRecord> = new Map();
  private counter = 0;

  create(title: string, hypothesis: string, category: ExperimentRecord['category'], team: string, budget: number, targetEnd: number, successCriteria: string[], metric: string, baseline: number, target: number): ExperimentRecord {
    const experimentId = `exp-${Date.now()}-${++this.counter}`;
    const record: ExperimentRecord = {
      experimentId, title, hypothesis, category, labTeam: team, budget, spentToDate: 0,
      startDate: Date.now(), targetEndDate: targetEnd, successCriteria, outcomeMetric: metric,
      baselineValue: baseline, targetValue: target, resultType: 'pending',
      learnings: [], nextSteps: [], status: 'planning', createdAt: Date.now()
    };
    this.experiments.set(experimentId, record);
    logger.debug('Experiment created', { experimentId, title, category });
    return record;
  }

  recordResult(experimentId: string, measuredValue: number, resultType: ExperimentRecord['resultType'], learnings: string[], nextSteps: string[]): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.measuredValue = measuredValue;
    exp.resultType = resultType;
    exp.learnings = learnings;
    exp.nextSteps = nextSteps;
    exp.actualEndDate = Date.now();
    exp.status = 'completed';
    return true;
  }

  getSuccessRate(): number {
    const completed = Array.from(this.experiments.values()).filter(e => e.status === 'completed');
    if (!completed.length) return 0;
    return (completed.filter(e => e.resultType === 'success').length / completed.length) * 100;
  }

  getActiveExperiments(): ExperimentRecord[] {
    return Array.from(this.experiments.values()).filter(e => e.status === 'running' || e.status === 'planning');
  }

  getByCategory(category: ExperimentRecord['category']): ExperimentRecord[] {
    return Array.from(this.experiments.values()).filter(e => e.category === category);
  }

  getExperiment(id: string): ExperimentRecord | undefined {
    return this.experiments.get(id);
  }
}

class PrototypeManager {
  private prototypes: Map<string, PrototypeRecord[]> = new Map();
  private counter = 0;

  build(experimentId: string, name: string, version: string, fidelity: PrototypeRecord['fidelity'], buildDays: number, testUsers: number, usability: number, featureCompleteness: number, techReadiness: number): PrototypeRecord {
    const prototypeId = `proto-${Date.now()}-${++this.counter}`;
    const record: PrototypeRecord = {
      prototypeId, experimentId, name, version, fidelity, buildTimeDays: buildDays,
      testUserCount: testUsers, usabilityScore: usability, featureCompleteness,
      technicalReadiness: techReadiness, pivotRequired: usability < 50,
      advancedToMVP: usability >= 70 && featureCompleteness >= 60 && techReadiness >= 3,
      createdAt: Date.now()
    };
    const existing = this.prototypes.get(experimentId) || [];
    existing.push(record);
    this.prototypes.set(experimentId, existing);
    return record;
  }

  getAvgBuildTime(): number {
    const all = Array.from(this.prototypes.values()).flat();
    if (!all.length) return 0;
    return all.reduce((s, p) => s + p.buildTimeDays, 0) / all.length;
  }

  getMVPReadyPrototypes(): PrototypeRecord[] {
    return Array.from(this.prototypes.values()).flat().filter(p => p.advancedToMVP);
  }

  getByExperiment(experimentId: string): PrototypeRecord[] {
    return this.prototypes.get(experimentId) || [];
  }
}

class IdeationFunnelAnalyzer {
  private records: IdeationFunnelRecord[] = [];
  private counter = 0;

  analyze(period: string, submitted: number, screened: number, approved: number, started: number, prototypes: number, mvpLaunched: number, deployed: number, submissionToMVPDays: number): IdeationFunnelRecord {
    const conversion = submitted > 0 ? (deployed / submitted) * 100 : 0;
    const recordId = `funnel-${Date.now()}-${++this.counter}`;
    const record: IdeationFunnelRecord = {
      recordId, period, ideasSubmitted: submitted, ideasScreened: screened,
      ideasApprovedForExperiment: approved, experimentsStarted: started,
      prototypesBuilt: prototypes, mvpLaunched, productionDeployed: deployed,
      submissionToMVPDays, funnelConversionPct: conversion, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): IdeationFunnelRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getConversionTrend(): number[] {
    return this.records.map(r => r.funnelConversionPct);
  }
}

class LabROICalculator {
  private records: LabROIRecord[] = [];
  private counter = 0;

  calculate(period: string, budget: number, experimentsRun: number, successful: number, innovationRevenue: number, costsSaved: number, avgTimeToMarket: number): LabROIRecord {
    const totalReturn = innovationRevenue + costsSaved;
    const roi = budget > 0 ? ((totalReturn - budget) / budget) * 100 : 0;
    const recordId = `labroi-${Date.now()}-${++this.counter}`;
    const record: LabROIRecord = {
      recordId, period, totalLabBudget: budget, totalExperimentsRun: experimentsRun,
      successfulExperiments: successful,
      successRatePct: experimentsRun > 0 ? (successful / experimentsRun) * 100 : 0,
      revenueFromInnovations: innovationRevenue, costsSaved, totalReturn, roiPct: roi,
      avgExperimentCost: experimentsRun > 0 ? budget / experimentsRun : 0,
      avgTimeToMarketDays: avgTimeToMarket, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Lab ROI calculated', { period, roi, successRate: record.successRatePct });
    return record;
  }

  getLatest(): LabROIRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getROITrend(): number[] {
    return this.records.map(r => r.roiPct);
  }
}

export const experimentTracker = new ExperimentTracker();
export const prototypeManager = new PrototypeManager();
export const ideationFunnelAnalyzer = new IdeationFunnelAnalyzer();
export const labROICalculator = new LabROICalculator();

export { ExperimentRecord, PrototypeRecord, IdeationFunnelRecord, LabROIRecord };
