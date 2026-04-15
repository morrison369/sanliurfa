/**
 * Phase 314: Competitive Pricing Intelligence
 * Competitor price tracking, price index, discount analytics, margin optimization
 */

import { logger } from './logger';

interface CompetitorPriceRecord {
  recordId: string;
  productId: string;
  productName: string;
  competitorId: string;
  competitorName: string;
  competitorPrice: number;
  ourPrice: number;
  priceIndexVsCompetitor: number;   // ourPrice / competitorPrice × 100
  priceDifferencePct: number;
  positioning: 'premium' | 'parity' | 'value' | 'aggressive';
  promotionActive: boolean;
  source: 'web_scraping' | 'manual' | 'api' | 'distributor';
  capturedAt: number;
}

interface PriceIndexRecord {
  recordId: string;
  productId: string;
  productName: string;
  category: string;
  period: string;
  ourPrice: number;
  marketAvgPrice: number;
  marketMinPrice: number;
  marketMaxPrice: number;
  priceIndex: number;               // ourPrice / marketAvg × 100
  competitorCount: number;
  pricePercentileRank: number;
  recommendedPriceUSD: number;
  estimatedVolumeImpactPct: number;
  calculatedAt: number;
}

interface DiscountRecord {
  discountId: string;
  productId: string;
  productName: string;
  discountType: 'promotional' | 'volume' | 'loyalty' | 'clearance' | 'competitive_match' | 'channel';
  originalPriceUSD: number;
  discountedPriceUSD: number;
  discountPct: number;
  discountUSD: number;
  marginAfterDiscountPct: number;
  minMarginPct: number;
  approved: boolean;
  unitsExpected: number;
  revenueExpected: number;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: number;
}

interface MarginOptimizationRecord {
  recordId: string;
  productId: string;
  productName: string;
  period: string;
  currentPriceUSD: number;
  costUSD: number;
  currentMarginPct: number;
  targetMarginPct: number;
  marginGapPct: number;
  leversIdentified: string[];
  priceIncreasePotentialPct: number;
  costReductionPotentialPct: number;
  estimatedMarginImprovementPct: number;
  priorityScore: number;
  calculatedAt: number;
}

class CompetitorPriceMonitor {
  private records: CompetitorPriceRecord[] = [];
  private counter = 0;

  capture(productId: string, productName: string, competitorId: string, competitorName: string, competitorPrice: number, ourPrice: number, promoActive: boolean, source: CompetitorPriceRecord['source']): CompetitorPriceRecord {
    const priceIndex = competitorPrice > 0 ? Math.round((ourPrice / competitorPrice) * 100 * 10) / 10 : 100;
    const priceDiffPct = competitorPrice > 0 ? Math.round(((ourPrice - competitorPrice) / competitorPrice) * 100 * 10) / 10 : 0;
    const positioning: CompetitorPriceRecord['positioning'] =
      priceIndex >= 110 ? 'premium' :
      priceIndex >= 95 ? 'parity' :
      priceIndex >= 80 ? 'value' : 'aggressive';

    const recordId = `cmprc-${Date.now()}-${++this.counter}`;
    const record: CompetitorPriceRecord = {
      recordId, productId, productName, competitorId, competitorName, competitorPrice,
      ourPrice, priceIndexVsCompetitor: priceIndex, priceDifferencePct: priceDiffPct,
      positioning, promotionActive: promoActive, source, capturedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Competitor price captured', { productId, competitorName, priceIndex, positioning });
    return record;
  }

  getProductsUnderPressure(threshold = 95): CompetitorPriceRecord[] {
    return this.records.filter(r => r.priceIndexVsCompetitor < threshold)
      .sort((a, b) => a.priceIndexVsCompetitor - b.priceIndexVsCompetitor);
  }

  getAvgPriceIndexByProduct(productId: string): number {
    const recs = this.records.filter(r => r.productId === productId);
    if (!recs.length) return 100;
    return Math.round(recs.reduce((s, r) => s + r.priceIndexVsCompetitor, 0) / recs.length * 10) / 10;
  }

  getPremiumPositionedProducts(): CompetitorPriceRecord[] {
    return this.records.filter(r => r.positioning === 'premium');
  }
}

class PriceIndexCalculator {
  private records: PriceIndexRecord[] = [];
  private counter = 0;

  calculate(productId: string, name: string, category: string, period: string, ourPrice: number, competitorPrices: number[]): PriceIndexRecord {
    const allPrices = [...competitorPrices, ourPrice];
    const marketAvg = allPrices.reduce((s, p) => s + p, 0) / allPrices.length;
    const marketMin = Math.min(...allPrices);
    const marketMax = Math.max(...allPrices);
    const priceIndex = marketAvg > 0 ? Math.round((ourPrice / marketAvg) * 100 * 10) / 10 : 100;
    const sorted = [...allPrices].sort((a, b) => a - b);
    const rank = sorted.indexOf(ourPrice);
    const percentileRank = allPrices.length > 1 ? Math.round((rank / (allPrices.length - 1)) * 100) : 50;
    const recommendedPrice = priceIndex > 110 ? ourPrice * 0.97 : priceIndex < 90 ? ourPrice * 1.03 : ourPrice;
    const volumeImpact = Math.round(((recommendedPrice - ourPrice) / ourPrice) * -1.5 * 100 * 10) / 10;

    const recordId = `pridx-${Date.now()}-${++this.counter}`;
    const record: PriceIndexRecord = {
      recordId, productId, productName: name, category, period, ourPrice,
      marketAvgPrice: Math.round(marketAvg * 100) / 100,
      marketMinPrice: marketMin, marketMaxPrice: marketMax,
      priceIndex, competitorCount: competitorPrices.length,
      pricePercentileRank: percentileRank,
      recommendedPriceUSD: Math.round(recommendedPrice * 100) / 100,
      estimatedVolumeImpactPct: volumeImpact, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getOverpricedProducts(threshold = 115): PriceIndexRecord[] {
    return this.records.filter(r => r.priceIndex >= threshold).sort((a, b) => b.priceIndex - a.priceIndex);
  }

  getUnderpricedProducts(threshold = 90): PriceIndexRecord[] {
    return this.records.filter(r => r.priceIndex <= threshold).sort((a, b) => a.priceIndex - b.priceIndex);
  }
}

class DiscountManager {
  private discounts: DiscountRecord[] = [];
  private counter = 0;

  create(productId: string, name: string, type: DiscountRecord['discountType'], originalPrice: number, discountPct: number, costUSD: number, minMargin: number, unitsExpected: number, durationDays: number): DiscountRecord {
    const discountedPrice = Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100;
    const discountUSD = Math.round((originalPrice - discountedPrice) * 100) / 100;
    const margin = discountedPrice > 0 ? Math.round(((discountedPrice - costUSD) / discountedPrice) * 100 * 10) / 10 : 0;
    const approved = margin >= minMargin;

    const discountId = `disc-${Date.now()}-${++this.counter}`;
    const record: DiscountRecord = {
      discountId, productId, productName: name, discountType: type,
      originalPriceUSD: originalPrice, discountedPriceUSD: discountedPrice,
      discountPct, discountUSD, marginAfterDiscountPct: margin,
      minMarginPct: minMargin, approved, unitsExpected,
      revenueExpected: Math.round(discountedPrice * unitsExpected),
      startDate: Date.now(), endDate: Date.now() + durationDays * 86400000,
      status: 'active', createdAt: Date.now()
    };
    this.discounts.push(record);
    logger.debug('Discount created', { discountId, discountPct, margin, approved });
    return record;
  }

  getBelowMarginDiscounts(): DiscountRecord[] {
    return this.discounts.filter(d => !d.approved && d.status === 'active');
  }

  getAvgDiscountDepth(): number {
    const active = this.discounts.filter(d => d.status === 'active');
    if (!active.length) return 0;
    return Math.round(active.reduce((s, d) => s + d.discountPct, 0) / active.length * 10) / 10;
  }

  getTotalRevenueExpected(): number {
    return this.discounts.filter(d => d.status === 'active').reduce((s, d) => s + d.revenueExpected, 0);
  }
}

class MarginOptimizer {
  private records: MarginOptimizationRecord[] = [];
  private counter = 0;

  optimize(productId: string, name: string, period: string, currentPrice: number, cost: number, targetMargin: number, priceIncreasePotential: number, costReductionPotential: number): MarginOptimizationRecord {
    const currentMargin = currentPrice > 0 ? Math.round(((currentPrice - cost) / currentPrice) * 100 * 10) / 10 : 0;
    const marginGap = Math.round((targetMargin - currentMargin) * 10) / 10;
    const levers: string[] = [];
    if (priceIncreasePotential > 0) levers.push(`Price increase ${priceIncreasePotential}%`);
    if (costReductionPotential > 0) levers.push(`Cost reduction ${costReductionPotential}%`);
    const estimatedImprovement = Math.round((priceIncreasePotential * 0.6 + costReductionPotential * 0.4) * 10) / 10;
    const priority = Math.round(Math.min(100, Math.abs(marginGap) * 5 + (estimatedImprovement > 5 ? 20 : 0)));

    const recordId = `margopt-${Date.now()}-${++this.counter}`;
    const record: MarginOptimizationRecord = {
      recordId, productId, productName: name, period, currentPriceUSD: currentPrice,
      costUSD: cost, currentMarginPct: currentMargin, targetMarginPct: targetMargin,
      marginGapPct: marginGap, leversIdentified: levers,
      priceIncreasePotentialPct: priceIncreasePotential, costReductionPotentialPct: costReductionPotential,
      estimatedMarginImprovementPct: estimatedImprovement, priorityScore: priority,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopOpportunities(limit = 5): MarginOptimizationRecord[] {
    return [...this.records].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
  }

  getBelowTargetProducts(): MarginOptimizationRecord[] {
    return this.records.filter(r => r.marginGapPct > 0).sort((a, b) => b.marginGapPct - a.marginGapPct);
  }

  getTotalMarginOpportunityPct(): number {
    if (!this.records.length) return 0;
    return Math.round(this.records.reduce((s, r) => s + r.estimatedMarginImprovementPct, 0) / this.records.length * 10) / 10;
  }
}

export const competitorPriceMonitor = new CompetitorPriceMonitor();
export const priceIndexCalculator = new PriceIndexCalculator();
export const discountManager = new DiscountManager();
export const marginOptimizer = new MarginOptimizer();

export { CompetitorPriceRecord, PriceIndexRecord, DiscountRecord, MarginOptimizationRecord };
