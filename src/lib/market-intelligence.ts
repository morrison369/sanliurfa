/**
 * Phase 335: Market Intelligence
 * Market sizing, competitive landscape, trend monitoring, market share tracking
 */

import { logger } from './logger';

interface MarketSizeRecord {
  marketId: string;
  marketName: string;
  segment: string;
  geographicScope: 'global' | 'regional' | 'national' | 'local';
  tamUSD: number;                  // Total Addressable Market
  samUSD: number;                  // Serviceable Addressable Market
  somUSD: number;                  // Serviceable Obtainable Market
  ourRevenueUSD: number;
  ourMarketSharePct: number;
  growthRateYoyPct: number;
  projectedTamUSD: number;         // 3-year projection
  maturity: 'emerging' | 'growing' | 'mature' | 'declining';
  keyGrowthDrivers: string[];
  keyConstraints: string[];
  dataSource: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  updatedAt: number;
  createdAt: number;
}

interface CompetitorRecord {
  competitorId: string;
  competitorName: string;
  marketId: string;
  revenueUSD?: number;
  marketSharePct?: number;
  employeeCount?: number;
  fundingUSD?: number;
  lastFundingRound?: string;
  keyProducts: string[];
  strengths: string[];
  weaknesses: string[];
  recentMoves: string[];
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  pricingPosition: 'premium' | 'parity' | 'value';
  targetSegments: string[];
  winRateVsThemPct?: number;
  updatedAt: number;
  createdAt: number;
}

interface MarketTrendRecord {
  trendId: string;
  trendName: string;
  category: 'technology' | 'regulatory' | 'economic' | 'social' | 'competitive' | 'customer';
  direction: 'positive' | 'negative' | 'neutral';
  velocity: 'fast' | 'moderate' | 'slow';
  timeHorizon: 'short_term' | 'medium_term' | 'long_term';
  impactOnUs: 'opportunity' | 'threat' | 'neutral';
  impactSeverity: 'high' | 'medium' | 'low';
  description: string;
  evidenceSources: string[];
  recommendedActions: string[];
  confidenceScore: number;         // 0-100
  detectedAt: number;
}

interface MarketShareRecord {
  shareId: string;
  marketId: string;
  period: string;
  ourSharePct: number;
  previousSharePct: number;
  shareChangePct: number;
  competitorShares: { competitorName: string; sharePct: number; change: number }[];
  ourRevenue: number;
  totalMarketRevenue: number;
  gainedFromCompetitors: string[];
  lostToCompetitors: string[];
  shareGrowthDrivers: string[];
  calculatedAt: number;
}

class MarketSizeAnalyzer {
  private markets: Map<string, MarketSizeRecord> = new Map();
  private counter = 0;

  define(name: string, segment: string, scope: MarketSizeRecord['geographicScope'], tam: number, sam: number, som: number, ourRevenue: number, growthRate: number, maturity: MarketSizeRecord['maturity'], drivers: string[], constraints: string[], source: string, confidence: MarketSizeRecord['confidenceLevel']): MarketSizeRecord {
    const marketId = `mkt-${Date.now()}-${++this.counter}`;
    const marketShare = sam > 0 ? Math.round((ourRevenue / sam) * 100 * 100) / 100 : 0;
    const projectedTam = Math.round(tam * Math.pow(1 + growthRate / 100, 3));

    const record: MarketSizeRecord = {
      marketId, marketName: name, segment, geographicScope: scope,
      tamUSD: tam, samUSD: sam, somUSD: som, ourRevenueUSD: ourRevenue,
      ourMarketSharePct: marketShare, growthRateYoyPct: growthRate,
      projectedTamUSD: projectedTam, maturity,
      keyGrowthDrivers: drivers, keyConstraints: constraints,
      dataSource: source, confidenceLevel: confidence,
      updatedAt: Date.now(), createdAt: Date.now()
    };
    this.markets.set(marketId, record);
    logger.debug('Market defined', { marketId, name, tam, marketShare });
    return record;
  }

  updateRevenue(marketId: string, ourRevenue: number): boolean {
    const mkt = this.markets.get(marketId);
    if (!mkt) return false;
    mkt.ourRevenueUSD = ourRevenue;
    mkt.ourMarketSharePct = mkt.samUSD > 0 ? Math.round((ourRevenue / mkt.samUSD) * 100 * 100) / 100 : 0;
    mkt.updatedAt = Date.now();
    return true;
  }

  getGrowingMarkets(minGrowthPct = 10): MarketSizeRecord[] {
    return Array.from(this.markets.values()).filter(m => m.growthRateYoyPct >= minGrowthPct && m.maturity !== 'declining');
  }

  getAll(): MarketSizeRecord[] {
    return Array.from(this.markets.values());
  }

  getMarket(id: string): MarketSizeRecord | undefined {
    return this.markets.get(id);
  }
}

class CompetitorTracker {
  private competitors: Map<string, CompetitorRecord> = new Map();
  private counter = 0;

  track(name: string, marketId: string, keyProducts: string[], strengths: string[], weaknesses: string[], recentMoves: string[], threatLevel: CompetitorRecord['threatLevel'], pricingPosition: CompetitorRecord['pricingPosition'], targetSegments: string[], marketSharePct?: number, revenueUSD?: number): CompetitorRecord {
    const competitorId = `comp-${Date.now()}-${++this.counter}`;
    const record: CompetitorRecord = {
      competitorId, competitorName: name, marketId, revenueUSD, marketSharePct,
      keyProducts, strengths, weaknesses, recentMoves, threatLevel, pricingPosition,
      targetSegments, updatedAt: Date.now(), createdAt: Date.now()
    };
    this.competitors.set(competitorId, record);
    logger.debug('Competitor tracked', { competitorId, name, threatLevel });
    return record;
  }

  updateWinRate(competitorId: string, winRatePct: number): boolean {
    const comp = this.competitors.get(competitorId);
    if (!comp) return false;
    comp.winRateVsThemPct = winRatePct;
    comp.updatedAt = Date.now();
    return true;
  }

  getCriticalThreats(): CompetitorRecord[] {
    return Array.from(this.competitors.values()).filter(c => c.threatLevel === 'critical' || c.threatLevel === 'high');
  }

  getByMarket(marketId: string): CompetitorRecord[] {
    return Array.from(this.competitors.values()).filter(c => c.marketId === marketId);
  }

  getAll(): CompetitorRecord[] {
    return Array.from(this.competitors.values());
  }
}

class TrendMonitor {
  private trends: TrendRecord[] = [];
  private counter = 0;

  detect(name: string, category: MarketTrendRecord['category'], direction: MarketTrendRecord['direction'], velocity: MarketTrendRecord['velocity'], horizon: MarketTrendRecord['timeHorizon'], impact: MarketTrendRecord['impactOnUs'], severity: MarketTrendRecord['impactSeverity'], description: string, sources: string[], actions: string[], confidence: number): MarketTrendRecord {
    const trendId = `trend-${Date.now()}-${++this.counter}`;
    const record: MarketTrendRecord = {
      trendId, trendName: name, category, direction, velocity, timeHorizon: horizon,
      impactOnUs: impact, impactSeverity: severity, description,
      evidenceSources: sources, recommendedActions: actions,
      confidenceScore: Math.min(100, Math.max(0, confidence)), detectedAt: Date.now()
    };
    this.trends.push(record);
    logger.debug('Market trend detected', { trendId, name, impact, severity });
    return record;
  }

  getThreats(): MarketTrendRecord[] {
    return this.trends.filter(t => t.impactOnUs === 'threat' && t.impactSeverity === 'high');
  }

  getOpportunities(): MarketTrendRecord[] {
    return this.trends.filter(t => t.impactOnUs === 'opportunity').sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return sev[b.impactSeverity] - sev[a.impactSeverity];
    });
  }

  getAll(): MarketTrendRecord[] {
    return [...this.trends];
  }
}

// Alias for export compatibility
type TrendRecord = MarketTrendRecord;

class MarketShareTracker {
  private shares: MarketShareRecord[] = [];
  private counter = 0;

  record(marketId: string, period: string, ourRevenue: number, totalMarketRevenue: number, competitorShares: MarketShareRecord['competitorShares'], gainedFrom: string[], lostTo: string[], drivers: string[]): MarketShareRecord {
    const shareId = `mktshare-${Date.now()}-${++this.counter}`;
    const ourShare = totalMarketRevenue > 0 ? Math.round((ourRevenue / totalMarketRevenue) * 100 * 100) / 100 : 0;
    const prev = this.shares.filter(s => s.marketId === marketId).slice(-1)[0];
    const prevShare = prev?.ourSharePct || 0;
    const shareChange = Math.round((ourShare - prevShare) * 100) / 100;

    const record: MarketShareRecord = {
      shareId, marketId, period, ourSharePct: ourShare, previousSharePct: prevShare,
      shareChangePct: shareChange, competitorShares, ourRevenue, totalMarketRevenue,
      gainedFromCompetitors: gainedFrom, lostToCompetitors: lostTo,
      shareGrowthDrivers: drivers, calculatedAt: Date.now()
    };
    this.shares.push(record);
    return record;
  }

  getShareTrend(marketId: string): number[] {
    return this.shares.filter(s => s.marketId === marketId).map(s => s.ourSharePct);
  }

  getLatest(marketId: string): MarketShareRecord | undefined {
    return this.shares.filter(s => s.marketId === marketId).slice(-1)[0];
  }
}

export const marketSizeAnalyzer = new MarketSizeAnalyzer();
export const competitorTracker = new CompetitorTracker();
export const trendMonitor = new TrendMonitor();
export const marketShareTracker = new MarketShareTracker();

export { MarketSizeRecord, CompetitorRecord, MarketTrendRecord, MarketShareRecord };
