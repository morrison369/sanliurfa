/**
 * Phase 338: Sales Forecasting Intelligence
 * Pipeline analysis, forecast accuracy, deal scoring, revenue prediction
 */

import { logger } from './logger';

interface DealRecord {
  dealId: string;
  dealName: string;
  accountId: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  valueUSD: number;
  probabilityPct: number;
  weightedValueUSD: number;
  forecastCategory: 'pipeline' | 'best_case' | 'commit' | 'closed';
  closeDate: number;
  daysInStage: number;
  daysInPipeline: number;
  nextAction: string;
  nextActionDate?: number;
  competitors: string[];
  dealScore: number;               // 0-100 ML-style score
  riskFlags: string[];
  createdAt: number;
  updatedAt: number;
}

interface ForecastRecord {
  forecastId: string;
  period: string;
  ownerId?: string;
  teamId?: string;
  forecastType: 'individual' | 'team' | 'company';
  quotaUSD: number;
  committedUSD: number;            // rep-committed deals
  bestCaseUSD: number;
  pipelineUSD: number;
  closedUSD: number;
  forecastedTotalUSD: number;
  coverageRatio: number;           // pipeline / quota
  commitAttainmentPct: number;
  bestCaseAttainmentPct: number;
  callAccuracyPct?: number;        // vs actual outcome
  createdAt: number;
}

interface PipelineHealthRecord {
  healthId: string;
  period: string;
  totalPipelineUSD: number;
  weightedPipelineUSD: number;
  dealCount: number;
  avgDealSizeUSD: number;
  avgDaysToClose: number;
  stageDistribution: { stage: string; count: number; valueUSD: number }[];
  staleDealCount: number;          // no activity in >14 days
  staleDealValueUSD: number;
  atRiskDealCount: number;
  conversionRate: number;          // won / (won + lost)
  slipRate: number;                // deals that missed close date
  pipelineVelocity: number;        // $ generated per day
  healthScore: number;             // 0-100
  calculatedAt: number;
}

interface ForecastAccuracyRecord {
  accuracyId: string;
  period: string;
  forecastedUSD: number;
  actualUSD: number;
  variancePct: number;
  absoluteAccuracyPct: number;     // 100 - |variance|
  overForecastedUSD: number;
  underForecastedUSD: number;
  isWithin10Pct: boolean;
  biasDirection: 'optimistic' | 'pessimistic' | 'accurate';
  calculatedAt: number;
}

class DealManager {
  private deals: Map<string, DealRecord> = new Map();
  private counter = 0;

  create(name: string, accountId: string, accountName: string, ownerId: string, ownerName: string, stage: DealRecord['stage'], value: number, probability: number, closeDate: number, forecastCat: DealRecord['forecastCategory'], nextAction: string, competitors: string[] = []): DealRecord {
    const dealId = `deal-${Date.now()}-${++this.counter}`;
    const dealScore = this.calcDealScore(stage, probability, closeDate, competitors.length);
    const riskFlags: string[] = [];
    if (probability < 20 && stage !== 'prospecting') riskFlags.push('Low probability');
    if (competitors.length > 2) riskFlags.push('Crowded competitive landscape');
    if (closeDate < Date.now() + 7 * 86400000 && stage !== 'closed_won' && stage !== 'closed_lost') riskFlags.push('Closing within 7 days — requires action');

    const record: DealRecord = {
      dealId, dealName: name, accountId, accountName, ownerId, ownerName,
      stage, valueUSD: value, probabilityPct: probability,
      weightedValueUSD: Math.round(value * probability / 100),
      forecastCategory: forecastCat, closeDate, daysInStage: 0, daysInPipeline: 0,
      nextAction, competitors, dealScore, riskFlags, createdAt: Date.now(), updatedAt: Date.now()
    };
    this.deals.set(dealId, record);
    return record;
  }

  private calcDealScore(stage: DealRecord['stage'], probability: number, closeDate: number, competitorCount: number): number {
    const stageScore = { prospecting: 10, qualification: 30, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0 };
    const timeScore = Math.max(0, 30 - Math.floor((closeDate - Date.now()) / 86400000 / 10));
    const compPenalty = competitorCount * 5;
    return Math.max(0, Math.min(100, Math.round(stageScore[stage] * 0.4 + probability * 0.4 + timeScore - compPenalty)));
  }

  advance(dealId: string, newStage: DealRecord['stage'], newProbability: number): boolean {
    const deal = this.deals.get(dealId);
    if (!deal) return false;
    deal.stage = newStage;
    deal.probabilityPct = newProbability;
    deal.weightedValueUSD = Math.round(deal.valueUSD * newProbability / 100);
    deal.forecastCategory = newProbability >= 90 ? 'commit' : newProbability >= 60 ? 'best_case' : newStage === 'closed_won' ? 'closed' : 'pipeline';
    deal.dealScore = this.calcDealScore(newStage, newProbability, deal.closeDate, deal.competitors.length);
    deal.daysInPipeline = Math.floor((Date.now() - deal.createdAt) / 86400000);
    deal.updatedAt = Date.now();
    logger.debug('Deal advanced', { dealId, newStage, newProbability });
    return true;
  }

  getByStage(stage: DealRecord['stage']): DealRecord[] {
    return Array.from(this.deals.values()).filter(d => d.stage === stage);
  }

  getAtRisk(): DealRecord[] {
    return Array.from(this.deals.values()).filter(d => d.riskFlags.length > 0 && d.stage !== 'closed_won' && d.stage !== 'closed_lost');
  }

  getAll(): DealRecord[] {
    return Array.from(this.deals.values());
  }
}

class ForecastEngine {
  private forecasts: ForecastRecord[] = [];
  private counter = 0;

  generate(period: string, deals: DealRecord[], quota: number, forecastType: ForecastRecord['forecastType'], ownerId?: string, teamId?: string): ForecastRecord {
    const forecastId = `forecast-${Date.now()}-${++this.counter}`;
    const active = deals.filter(d => d.stage !== 'closed_lost');
    const closed = deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + d.valueUSD, 0);
    const committed = deals.filter(d => d.forecastCategory === 'commit').reduce((s, d) => s + d.weightedValueUSD, 0);
    const bestCase = deals.filter(d => d.forecastCategory === 'best_case' || d.forecastCategory === 'commit').reduce((s, d) => s + d.weightedValueUSD, 0);
    const pipeline = active.reduce((s, d) => s + d.weightedValueUSD, 0);
    const forecastTotal = closed + committed + bestCase * 0.5;
    const coverage = quota > 0 ? Math.round((pipeline / quota) * 100 * 10) / 10 : 0;

    const record: ForecastRecord = {
      forecastId, period, ownerId, teamId, forecastType, quotaUSD: quota,
      committedUSD: closed + committed, bestCaseUSD: closed + bestCase, pipelineUSD: pipeline,
      closedUSD: closed, forecastedTotalUSD: Math.round(forecastTotal), coverageRatio: coverage,
      commitAttainmentPct: quota > 0 ? Math.round(((closed + committed) / quota) * 100 * 10) / 10 : 0,
      bestCaseAttainmentPct: quota > 0 ? Math.round(((closed + bestCase) / quota) * 100 * 10) / 10 : 0,
      createdAt: Date.now()
    };
    this.forecasts.push(record);
    logger.debug('Forecast generated', { forecastId, period, forecastTotal, coverage });
    return record;
  }

  getLatest(): ForecastRecord | undefined {
    return this.forecasts[this.forecasts.length - 1];
  }

  getAll(): ForecastRecord[] {
    return [...this.forecasts];
  }
}

class PipelineHealthAnalyzer {
  private healthRecords: PipelineHealthRecord[] = [];
  private counter = 0;

  analyze(period: string, deals: DealRecord[], avgSaleCycleDays: number): PipelineHealthRecord {
    const healthId = `pihealth-${Date.now()}-${++this.counter}`;
    const active = deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
    const totalPipeline = active.reduce((s, d) => s + d.valueUSD, 0);
    const weightedPipeline = active.reduce((s, d) => s + d.weightedValueUSD, 0);
    const avgDealSize = active.length > 0 ? Math.round(totalPipeline / active.length) : 0;

    const stageDist = ['prospecting', 'qualification', 'proposal', 'negotiation'].map(stage => ({
      stage, count: active.filter(d => d.stage === stage).length,
      valueUSD: active.filter(d => d.stage === stage).reduce((s, d) => s + d.valueUSD, 0)
    }));

    const stale = active.filter(d => Date.now() - d.updatedAt > 14 * 86400000);
    const atRisk = active.filter(d => d.riskFlags.length > 0);
    const won = deals.filter(d => d.stage === 'closed_won').length;
    const lost = deals.filter(d => d.stage === 'closed_lost').length;
    const convRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100 * 10) / 10 : 0;
    const slipped = active.filter(d => d.closeDate < Date.now()).length;
    const slipRate = active.length > 0 ? Math.round((slipped / active.length) * 100 * 10) / 10 : 0;
    const velocity = avgSaleCycleDays > 0 ? Math.round(weightedPipeline / avgSaleCycleDays) : 0;

    const healthScore = Math.max(0, Math.min(100, Math.round(
      convRate * 0.3 + (100 - slipRate) * 0.3 + Math.min(active.length * 2, 20) * 0.2 + (stale.length === 0 ? 20 : 0)
    )));

    const record: PipelineHealthRecord = {
      healthId, period, totalPipelineUSD: totalPipeline, weightedPipelineUSD: weightedPipeline,
      dealCount: active.length, avgDealSizeUSD: avgDealSize, avgDaysToClose: avgSaleCycleDays,
      stageDistribution: stageDist, staleDealCount: stale.length,
      staleDealValueUSD: stale.reduce((s, d) => s + d.valueUSD, 0),
      atRiskDealCount: atRisk.length, conversionRate: convRate, slipRate, pipelineVelocity: velocity,
      healthScore, calculatedAt: Date.now()
    };
    this.healthRecords.push(record);
    logger.debug('Pipeline health analyzed', { period, healthScore, convRate, slipRate });
    return record;
  }

  getLatest(): PipelineHealthRecord | undefined {
    return this.healthRecords[this.healthRecords.length - 1];
  }
}

class ForecastAccuracyTracker {
  private records: ForecastAccuracyRecord[] = [];
  private counter = 0;

  track(period: string, forecastedUSD: number, actualUSD: number): ForecastAccuracyRecord {
    const accuracyId = `forecastacc-${Date.now()}-${++this.counter}`;
    const variancePct = forecastedUSD > 0 ? Math.round(((actualUSD - forecastedUSD) / forecastedUSD) * 100 * 10) / 10 : 0;
    const absoluteAccuracy = Math.round((100 - Math.abs(variancePct)) * 10) / 10;
    const overForecasted = Math.max(0, forecastedUSD - actualUSD);
    const underForecasted = Math.max(0, actualUSD - forecastedUSD);
    const biasDirection: ForecastAccuracyRecord['biasDirection'] =
      variancePct > 5 ? 'pessimistic' : variancePct < -5 ? 'optimistic' : 'accurate';

    const record: ForecastAccuracyRecord = {
      accuracyId, period, forecastedUSD, actualUSD, variancePct,
      absoluteAccuracyPct: Math.max(0, absoluteAccuracy),
      overForecastedUSD: overForecasted, underForecastedUSD: underForecasted,
      isWithin10Pct: Math.abs(variancePct) <= 10, biasDirection, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getAverageAccuracy(): number {
    const all = this.records;
    return all.length > 0 ? Math.round(all.reduce((s, r) => s + r.absoluteAccuracyPct, 0) / all.length * 10) / 10 : 0;
  }

  getTrend(): ForecastAccuracyRecord[] {
    return [...this.records];
  }
}

export const dealManager = new DealManager();
export const forecastEngine = new ForecastEngine();
export const pipelineHealthAnalyzer = new PipelineHealthAnalyzer();
export const forecastAccuracyTracker = new ForecastAccuracyTracker();

export { DealRecord, ForecastRecord, PipelineHealthRecord, ForecastAccuracyRecord };
