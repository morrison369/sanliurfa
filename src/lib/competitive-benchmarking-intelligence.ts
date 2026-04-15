/**
 * Phase 285: Competitive Benchmarking Intelligence
 * Competitor tracking, performance gap analysis, market position scoring, win/loss analytics
 */

import { logger } from './logger';

interface CompetitorProfileRecord {
  competitorId: string;
  name: string;
  tier: 'primary' | 'secondary' | 'emerging' | 'niche';
  marketSharePct: number;
  revenueEstimateUSD: number;
  employeeCount: number;
  founded: number;
  strengths: string[];
  weaknesses: string[];
  productCount: number;
  pricingTier: 'budget' | 'mid_market' | 'premium' | 'enterprise';
  growthRatePct: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  updatedAt: number;
  createdAt: number;
}

interface BenchmarkMetricRecord {
  recordId: string;
  period: string;
  metricName: string;
  category: 'financial' | 'operational' | 'customer' | 'product' | 'market';
  ourValue: number;
  industryAverage: number;
  bestInClass: number;
  worstInClass: number;
  percentileRank: number;       // 0-100 (100 = best)
  gapToIndustryAvg: number;
  gapToBestInClass: number;
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

interface WinLossRecord {
  recordId: string;
  opportunityId: string;
  outcome: 'won' | 'lost';
  competitorId?: string;
  competitorName?: string;
  dealSizeUSD: number;
  salesCycleDays: number;
  lossReason?: string;
  winReason?: string;
  productCategory: string;
  regionId: string;
  recordedAt: number;
}

interface CompetitivePositionRecord {
  positionId: string;
  period: string;
  overallRank: number;
  competitorsTracked: number;
  marketSharePct: number;
  pricePositionScore: number;    // 0-100 (100 = best price-value)
  productStrengthScore: number;  // 0-100
  brandStrengthScore: number;    // 0-100
  customerSatisfactionScore: number;  // 0-100
  innovationScore: number;       // 0-100
  overallCompetitiveScore: number;
  yoyRankChange: number;
  calculatedAt: number;
}

class CompetitorProfileManager {
  private competitors: Map<string, CompetitorProfileRecord> = new Map();
  private counter = 0;

  track(name: string, tier: CompetitorProfileRecord['tier'], marketShare: number, revenueEstimate: number, employees: number, founded: number, pricing: CompetitorProfileRecord['pricingTier']): CompetitorProfileRecord {
    const competitorId = `comp-${Date.now()}-${++this.counter}`;
    const threatLevel: CompetitorProfileRecord['threatLevel'] =
      tier === 'primary' && marketShare > 20 ? 'critical' :
      tier === 'primary' ? 'high' :
      tier === 'secondary' ? 'medium' : 'low';

    const profile: CompetitorProfileRecord = {
      competitorId, name, tier, marketSharePct: marketShare, revenueEstimateUSD: revenueEstimate,
      employeeCount: employees, founded, strengths: [], weaknesses: [],
      productCount: 0, pricingTier: pricing, growthRatePct: 0, threatLevel,
      updatedAt: Date.now(), createdAt: Date.now()
    };
    this.competitors.set(competitorId, profile);
    logger.debug('Competitor tracked', { competitorId, name, tier, threatLevel });
    return profile;
  }

  update(competitorId: string, marketShare: number, growthRate: number, strengths: string[], weaknesses: string[]): boolean {
    const comp = this.competitors.get(competitorId);
    if (!comp) return false;
    comp.marketSharePct = marketShare;
    comp.growthRatePct = growthRate;
    comp.strengths = strengths;
    comp.weaknesses = weaknesses;
    comp.updatedAt = Date.now();
    return true;
  }

  getPrimaryCompetitors(): CompetitorProfileRecord[] {
    return Array.from(this.competitors.values())
      .filter(c => c.tier === 'primary')
      .sort((a, b) => b.marketSharePct - a.marketSharePct);
  }

  getHighThreatCompetitors(): CompetitorProfileRecord[] {
    return Array.from(this.competitors.values())
      .filter(c => c.threatLevel === 'high' || c.threatLevel === 'critical')
      .sort((a, b) => b.marketSharePct - a.marketSharePct);
  }

  getTotalTrackedMarketShare(): number {
    return Array.from(this.competitors.values()).reduce((s, c) => s + c.marketSharePct, 0);
  }
}

class BenchmarkMetricsEngine {
  private metrics: Map<string, BenchmarkMetricRecord[]> = new Map();
  private counter = 0;

  record(period: string, metricName: string, category: BenchmarkMetricRecord['category'], ourValue: number, industryAvg: number, bestInClass: number, worstInClass: number, previousValue?: number): BenchmarkMetricRecord {
    const range = bestInClass - worstInClass;
    const percentileRank = range > 0 ? ((ourValue - worstInClass) / range) * 100 : 50;
    const trend: BenchmarkMetricRecord['trend'] =
      previousValue === undefined ? 'stable' :
      ourValue > previousValue * 1.02 ? 'improving' :
      ourValue < previousValue * 0.98 ? 'declining' : 'stable';

    const recordId = `bench-${Date.now()}-${++this.counter}`;
    const record: BenchmarkMetricRecord = {
      recordId, period, metricName, category, ourValue, industryAverage: industryAvg,
      bestInClass, worstInClass, percentileRank: Math.max(0, Math.min(100, percentileRank)),
      gapToIndustryAvg: ourValue - industryAvg, gapToBestInClass: ourValue - bestInClass,
      trend, calculatedAt: Date.now()
    };
    const history = this.metrics.get(metricName) || [];
    history.push(record);
    this.metrics.set(metricName, history);
    return record;
  }

  getLatest(metricName: string): BenchmarkMetricRecord | undefined {
    const history = this.metrics.get(metricName) || [];
    return history[history.length - 1];
  }

  getBelowAverage(): BenchmarkMetricRecord[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((r): r is BenchmarkMetricRecord => !!r && r.gapToIndustryAvg < 0)
      .sort((a, b) => a.gapToIndustryAvg - b.gapToIndustryAvg);
  }

  getTopPerformingMetrics(limit = 5): BenchmarkMetricRecord[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((r): r is BenchmarkMetricRecord => !!r)
      .sort((a, b) => b.percentileRank - a.percentileRank)
      .slice(0, limit);
  }
}

class WinLossAnalyzer {
  private records: WinLossRecord[] = [];
  private counter = 0;

  record(opportunityId: string, outcome: WinLossRecord['outcome'], dealSize: number, cycleDays: number, competitorId: string | undefined, competitorName: string | undefined, reason: string, productCategory: string, regionId: string): WinLossRecord {
    const recordId = `winloss-${Date.now()}-${++this.counter}`;
    const record: WinLossRecord = {
      recordId, opportunityId, outcome, competitorId, competitorName, dealSizeUSD: dealSize,
      salesCycleDays: cycleDays, productCategory, regionId,
      [outcome === 'won' ? 'winReason' : 'lossReason']: reason, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getWinRate(): number {
    if (!this.records.length) return 0;
    return (this.records.filter(r => r.outcome === 'won').length / this.records.length) * 100;
  }

  getWinRateByCompetitor(): Record<string, number> {
    const result: Record<string, { wins: number; total: number }> = {};
    for (const r of this.records) {
      const key = r.competitorName || 'unknown';
      if (!result[key]) result[key] = { wins: 0, total: 0 };
      result[key].total++;
      if (r.outcome === 'won') result[key].wins++;
    }
    return Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k, v.total > 0 ? (v.wins / v.total) * 100 : 0])
    );
  }

  getTopLossReasons(): Record<string, number> {
    const result: Record<string, number> = {};
    this.records.filter(r => r.outcome === 'lost' && r.lossReason).forEach(r => {
      const reason = r.lossReason!;
      result[reason] = (result[reason] || 0) + 1;
    });
    return result;
  }

  getAvgWonDealSize(): number {
    const won = this.records.filter(r => r.outcome === 'won');
    if (!won.length) return 0;
    return won.reduce((s, r) => s + r.dealSizeUSD, 0) / won.length;
  }
}

class CompetitivePositionTracker {
  private positions: CompetitivePositionRecord[] = [];
  private counter = 0;

  assess(period: string, rank: number, competitorsTracked: number, marketShare: number, priceScore: number, productScore: number, brandScore: number, csatScore: number, innovationScore: number, previousRank?: number): CompetitivePositionRecord {
    const overallScore = priceScore * 0.2 + productScore * 0.3 + brandScore * 0.2 + csatScore * 0.2 + innovationScore * 0.1;
    const yoyRankChange = previousRank !== undefined ? previousRank - rank : 0; // positive = improved

    const positionId = `comppos-${Date.now()}-${++this.counter}`;
    const record: CompetitivePositionRecord = {
      positionId, period, overallRank: rank, competitorsTracked, marketSharePct: marketShare,
      pricePositionScore: priceScore, productStrengthScore: productScore, brandStrengthScore: brandScore,
      customerSatisfactionScore: csatScore, innovationScore,
      overallCompetitiveScore: Math.max(0, Math.min(100, overallScore)),
      yoyRankChange, calculatedAt: Date.now()
    };
    this.positions.push(record);
    logger.debug('Competitive position assessed', { period, rank, overallScore });
    return record;
  }

  getLatest(): CompetitivePositionRecord | undefined {
    return this.positions[this.positions.length - 1];
  }

  getRankTrend(): number[] {
    return this.positions.map(p => p.overallRank);
  }

  getScoreTrend(): number[] {
    return this.positions.map(p => p.overallCompetitiveScore);
  }
}

export const competitorProfileManager = new CompetitorProfileManager();
export const benchmarkMetricsEngine = new BenchmarkMetricsEngine();
export const winLossAnalyzer = new WinLossAnalyzer();
export const competitivePositionTracker = new CompetitivePositionTracker();

export { CompetitorProfileRecord, BenchmarkMetricRecord, WinLossRecord, CompetitivePositionRecord };
