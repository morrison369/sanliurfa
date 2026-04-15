/**
 * Phase 299: Sales Intelligence
 * Pipeline analytics, quota management, territory performance, win-loss analysis
 */

import { logger } from './logger';

interface SalesPipelineRecord {
  opportunityId: string;
  accountName: string;
  ownerName: string;
  territory: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  dealValueUSD: number;
  probabilityPct: number;
  weightedValueUSD: number;
  expectedCloseDate: number;
  createdAt: number;
  closedAt?: number;
  lostReason?: string;
  productLine: string;
  forecastCategory: 'pipeline' | 'best_case' | 'commit' | 'closed';
  daysInStage: number;
  status: 'open' | 'won' | 'lost';
}

interface SalesQuotaRecord {
  recordId: string;
  repId: string;
  repName: string;
  territory: string;
  period: string;
  quotaUSD: number;
  achievedUSD: number;
  attainmentPct: number;
  pipelineCoverageRatio: number;
  rank: number;
  status: 'above_quota' | 'on_track' | 'at_risk' | 'below_quota';
  recordedAt: number;
}

interface WinLossRecord {
  recordId: string;
  period: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRatePct: number;
  avgDealSizeWonUSD: number;
  avgDealSizeLostUSD: number;
  avgSalesCycleDaysWon: number;
  avgSalesCycleDaysLost: number;
  topLostReasons: { reason: string; count: number }[];
  topWinFactors: string[];
  calculatedAt: number;
}

interface TerritoryPerformanceRecord {
  recordId: string;
  territory: string;
  period: string;
  totalRevenue: number;
  quotaAttainmentPct: number;
  dealCount: number;
  avgDealSizeUSD: number;
  winRatePct: number;
  pipelineValueUSD: number;
  marketPenetrationPct: number;
  yoyGrowthPct: number;
  rank: number;
  recordedAt: number;
}

class SalesPipelineManager {
  private opportunities: Map<string, SalesPipelineRecord> = new Map();
  private counter = 0;

  add(accountName: string, owner: string, territory: string, stage: SalesPipelineRecord['stage'], value: number, probability: number, expectedClose: number, product: string): SalesPipelineRecord {
    const opportunityId = `opp-${Date.now()}-${++this.counter}`;
    const forecastCategory: SalesPipelineRecord['forecastCategory'] =
      stage === 'closed_won' || stage === 'closed_lost' ? 'closed' :
      stage === 'negotiation' ? 'commit' :
      stage === 'proposal' ? 'best_case' : 'pipeline';

    const record: SalesPipelineRecord = {
      opportunityId, accountName, ownerName: owner, territory, stage, dealValueUSD: value,
      probabilityPct: probability, weightedValueUSD: value * probability / 100,
      expectedCloseDate: expectedClose, createdAt: Date.now(), productLine: product,
      forecastCategory, daysInStage: 0, status: 'open'
    };
    this.opportunities.set(opportunityId, record);
    logger.debug('Opportunity added', { opportunityId, accountName, stage, value });
    return record;
  }

  close(opportunityId: string, won: boolean, lostReason?: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;
    opp.stage = won ? 'closed_won' : 'closed_lost';
    opp.status = won ? 'won' : 'lost';
    opp.closedAt = Date.now();
    opp.lostReason = lostReason;
    opp.probabilityPct = won ? 100 : 0;
    opp.weightedValueUSD = won ? opp.dealValueUSD : 0;
    opp.forecastCategory = 'closed';
    return true;
  }

  getTotalPipelineValue(): number {
    return Array.from(this.opportunities.values())
      .filter(o => o.status === 'open')
      .reduce((s, o) => s + o.weightedValueUSD, 0);
  }

  getByStage(stage: SalesPipelineRecord['stage']): SalesPipelineRecord[] {
    return Array.from(this.opportunities.values()).filter(o => o.stage === stage);
  }

  getOverdueOpportunities(): SalesPipelineRecord[] {
    const now = Date.now();
    return Array.from(this.opportunities.values())
      .filter(o => o.status === 'open' && o.expectedCloseDate < now)
      .sort((a, b) => a.expectedCloseDate - b.expectedCloseDate);
  }

  getOpportunity(id: string): SalesPipelineRecord | undefined {
    return this.opportunities.get(id);
  }

  getAll(): SalesPipelineRecord[] {
    return Array.from(this.opportunities.values());
  }
}

class SalesQuotaTracker {
  private records: SalesQuotaRecord[] = [];
  private counter = 0;

  record(repId: string, repName: string, territory: string, period: string, quota: number, achieved: number, pipelineValue: number): SalesQuotaRecord {
    const attainment = quota > 0 ? (achieved / quota) * 100 : 0;
    const coverage = quota > 0 ? pipelineValue / quota : 0;
    const status: SalesQuotaRecord['status'] =
      attainment >= 100 ? 'above_quota' :
      attainment >= 75 ? 'on_track' :
      attainment >= 50 ? 'at_risk' : 'below_quota';

    const recordId = `quota-${Date.now()}-${++this.counter}`;
    const rec: SalesQuotaRecord = {
      recordId, repId, repName, territory, period, quotaUSD: quota, achievedUSD: achieved,
      attainmentPct: Math.round(attainment * 10) / 10, pipelineCoverageRatio: Math.round(coverage * 10) / 10,
      rank: 0, status, recordedAt: Date.now()
    };
    this.records.push(rec);
    this.updateRankings(period);
    return rec;
  }

  private updateRankings(period: string): void {
    const periodRecs = this.records
      .filter(r => r.period === period)
      .sort((a, b) => b.attainmentPct - a.attainmentPct);
    periodRecs.forEach((r, i) => { r.rank = i + 1; });
  }

  getTopPerformers(period: string, limit = 5): SalesQuotaRecord[] {
    return this.records.filter(r => r.period === period)
      .sort((a, b) => b.attainmentPct - a.attainmentPct)
      .slice(0, limit);
  }

  getAtRiskReps(): SalesQuotaRecord[] {
    return this.records.filter(r => r.status === 'at_risk' || r.status === 'below_quota');
  }

  getTeamAttainment(period: string): number {
    const periodRecs = this.records.filter(r => r.period === period);
    if (!periodRecs.length) return 0;
    const totalQuota = periodRecs.reduce((s, r) => s + r.quotaUSD, 0);
    const totalAchieved = periodRecs.reduce((s, r) => s + r.achievedUSD, 0);
    return totalQuota > 0 ? (totalAchieved / totalQuota) * 100 : 0;
  }
}

class WinLossAnalyzer {
  private records: WinLossRecord[] = [];
  private counter = 0;

  analyze(period: string, total: number, won: number, lost: number, avgWonSize: number, avgLostSize: number, avgCycleDaysWon: number, avgCycleDaysLost: number, lostReasons: { reason: string; count: number }[], winFactors: string[]): WinLossRecord {
    const recordId = `winloss-${Date.now()}-${++this.counter}`;
    const record: WinLossRecord = {
      recordId, period, totalDeals: total, wonDeals: won, lostDeals: lost,
      winRatePct: total > 0 ? (won / total) * 100 : 0,
      avgDealSizeWonUSD: avgWonSize, avgDealSizeLostUSD: avgLostSize,
      avgSalesCycleDaysWon: avgCycleDaysWon, avgSalesCycleDaysLost: avgCycleDaysLost,
      topLostReasons: lostReasons.sort((a, b) => b.count - a.count),
      topWinFactors: winFactors, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Win-loss analyzed', { period, winRate: record.winRatePct });
    return record;
  }

  getLatest(): WinLossRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getWinRateTrend(): number[] {
    return this.records.map(r => r.winRatePct);
  }
}

class TerritoryPerformanceAnalyzer {
  private records: TerritoryPerformanceRecord[] = [];
  private counter = 0;

  analyze(territory: string, period: string, revenue: number, quota: number, deals: number, winRate: number, pipeline: number, penetration: number, previousRevenue: number): TerritoryPerformanceRecord {
    const attainment = quota > 0 ? (revenue / quota) * 100 : 0;
    const yoyGrowth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
    const avgDeal = deals > 0 ? revenue / deals : 0;

    const recordId = `territory-${Date.now()}-${++this.counter}`;
    const rec: TerritoryPerformanceRecord = {
      recordId, territory, period, totalRevenue: revenue, quotaAttainmentPct: Math.round(attainment * 10) / 10,
      dealCount: deals, avgDealSizeUSD: Math.round(avgDeal), winRatePct: winRate,
      pipelineValueUSD: pipeline, marketPenetrationPct: penetration,
      yoyGrowthPct: Math.round(yoyGrowth * 10) / 10, rank: 0, recordedAt: Date.now()
    };
    this.records.push(rec);
    this.updateRankings(period);
    return rec;
  }

  private updateRankings(period: string): void {
    const periodRecs = this.records
      .filter(r => r.period === period)
      .sort((a, b) => b.quotaAttainmentPct - a.quotaAttainmentPct);
    periodRecs.forEach((r, i) => { r.rank = i + 1; });
  }

  getTopTerritories(period: string, limit = 3): TerritoryPerformanceRecord[] {
    return this.records.filter(r => r.period === period)
      .sort((a, b) => b.quotaAttainmentPct - a.quotaAttainmentPct)
      .slice(0, limit);
  }

  getUnderperformingTerritories(threshold = 80): TerritoryPerformanceRecord[] {
    return this.records.filter(r => r.quotaAttainmentPct < threshold);
  }
}

export const salesPipelineManager = new SalesPipelineManager();
export const salesQuotaTracker = new SalesQuotaTracker();
export const winLossAnalyzer = new WinLossAnalyzer();
export const territoryPerformanceAnalyzer = new TerritoryPerformanceAnalyzer();

export { SalesPipelineRecord, SalesQuotaRecord, WinLossRecord, TerritoryPerformanceRecord };
