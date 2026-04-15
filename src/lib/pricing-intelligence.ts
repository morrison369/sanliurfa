/**
 * Phase 265: Pricing Intelligence
 * Competitive price monitoring, price elasticity, dynamic pricing rules, margin optimization
 */

import { logger } from './logger';

interface PricePoint {
  priceId: string;
  productId: string;
  productName: string;
  ourPrice: number;
  competitorPrices: Record<string, number>;   // competitorName → price
  marketAvgPrice: number;
  pricePositioning: 'premium' | 'parity' | 'value' | 'budget';
  priceIndexVsMarket: number;   // our price / market avg × 100
  currency: string;
  recordedAt: number;
}

interface PriceElasticityRecord {
  recordId: string;
  productId: string;
  priceChangePct: number;      // % price change
  demandChangePct: number;     // % demand change
  elasticityCoefficient: number;  // demandChange / priceChange (negative = elastic)
  interpretation: 'elastic' | 'inelastic' | 'unit_elastic';
  optimalPriceDirection: 'increase' | 'decrease' | 'hold';
  calculatedAt: number;
}

interface DynamicPricingRule {
  ruleId: string;
  name: string;
  productId: string;
  trigger: 'inventory_low' | 'demand_spike' | 'competitor_drop' | 'time_based' | 'segment_based';
  condition: string;
  priceAdjustmentPct: number;   // positive = increase, negative = decrease
  minPrice: number;
  maxPrice: number;
  enabled: boolean;
  activationCount: number;
  createdAt: number;
}

interface MarginOptimizationReport {
  reportId: string;
  period: string;
  productId: string;
  costOfGoods: number;
  currentPrice: number;
  currentMarginPct: number;
  targetMarginPct: number;
  suggestedPrice: number;
  priceGapPct: number;
  competitorHeadroom: number;   // how much we can raise before exceeding competitor avg
  recommendation: 'raise_price' | 'reduce_cost' | 'maintain' | 'bundle';
  estimatedMarginImprovement: number;
  generatedAt: number;
}

class CompetitivePriceMonitor {
  private priceHistory: Map<string, PricePoint[]> = new Map();
  private counter = 0;

  record(productId: string, productName: string, ourPrice: number, competitorPrices: Record<string, number>, currency = 'USD'): PricePoint {
    const prices = Object.values(competitorPrices);
    const marketAvgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : ourPrice;
    const priceIndexVsMarket = marketAvgPrice > 0 ? (ourPrice / marketAvgPrice) * 100 : 100;
    const pricePositioning: PricePoint['pricePositioning'] =
      priceIndexVsMarket >= 120 ? 'premium' :
      priceIndexVsMarket >= 95 ? 'parity' :
      priceIndexVsMarket >= 75 ? 'value' : 'budget';

    const priceId = `price-${Date.now()}-${++this.counter}`;
    const point: PricePoint = {
      priceId, productId, productName, ourPrice, competitorPrices, marketAvgPrice,
      pricePositioning, priceIndexVsMarket, currency, recordedAt: Date.now()
    };
    const history = this.priceHistory.get(productId) || [];
    history.push(point);
    this.priceHistory.set(productId, history);
    logger.debug('Price recorded', { productId, ourPrice, priceIndexVsMarket, pricePositioning });
    return point;
  }

  getPriceGap(productId: string): number {
    const latest = this.getLatest(productId);
    if (!latest) return 0;
    return latest.ourPrice - latest.marketAvgPrice;
  }

  getLatest(productId: string): PricePoint | undefined {
    const history = this.priceHistory.get(productId) || [];
    return history[history.length - 1];
  }

  getUnderpricedProducts(threshold = 85): PricePoint[] {
    return Array.from(this.priceHistory.values())
      .map(h => h[h.length - 1])
      .filter((p): p is PricePoint => !!p && p.priceIndexVsMarket < threshold)
      .sort((a, b) => a.priceIndexVsMarket - b.priceIndexVsMarket);
  }
}

class PriceElasticityCalculator {
  private records: Map<string, PriceElasticityRecord[]> = new Map();
  private counter = 0;

  calculate(productId: string, priceChangePct: number, demandChangePct: number): PriceElasticityRecord {
    const elasticityCoefficient = priceChangePct !== 0 ? demandChangePct / priceChangePct : 0;
    const absElasticity = Math.abs(elasticityCoefficient);
    const interpretation: PriceElasticityRecord['interpretation'] =
      absElasticity > 1 ? 'elastic' : absElasticity < 1 ? 'inelastic' : 'unit_elastic';

    // If inelastic, raising price increases revenue; if elastic, lowering price increases revenue
    const optimalPriceDirection: PriceElasticityRecord['optimalPriceDirection'] =
      interpretation === 'inelastic' ? 'increase' :
      interpretation === 'elastic' ? 'decrease' : 'hold';

    const recordId = `elasticity-${Date.now()}-${++this.counter}`;
    const record: PriceElasticityRecord = {
      recordId, productId, priceChangePct, demandChangePct, elasticityCoefficient,
      interpretation, optimalPriceDirection, calculatedAt: Date.now()
    };
    const history = this.records.get(productId) || [];
    history.push(record);
    this.records.set(productId, history);
    return record;
  }

  getLatest(productId: string): PriceElasticityRecord | undefined {
    const history = this.records.get(productId) || [];
    return history[history.length - 1];
  }

  getElasticProducts(): PriceElasticityRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is PriceElasticityRecord => !!r && r.interpretation === 'elastic');
  }
}

class DynamicPricingRuleEngine {
  private rules: Map<string, DynamicPricingRule> = new Map();
  private counter = 0;

  create(name: string, productId: string, trigger: DynamicPricingRule['trigger'], condition: string, adjustmentPct: number, minPrice: number, maxPrice: number): DynamicPricingRule {
    const ruleId = `dprule-${Date.now()}-${++this.counter}`;
    const rule: DynamicPricingRule = {
      ruleId, name, productId, trigger, condition, priceAdjustmentPct: adjustmentPct,
      minPrice, maxPrice, enabled: true, activationCount: 0, createdAt: Date.now()
    };
    this.rules.set(ruleId, rule);
    return rule;
  }

  applyRule(ruleId: string, currentPrice: number): number {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) return currentPrice;
    const newPrice = currentPrice * (1 + rule.priceAdjustmentPct / 100);
    rule.activationCount++;
    return Math.max(rule.minPrice, Math.min(rule.maxPrice, newPrice));
  }

  getActiveRules(productId: string): DynamicPricingRule[] {
    return Array.from(this.rules.values()).filter(r => r.productId === productId && r.enabled);
  }

  getMostActivated(limit = 5): DynamicPricingRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.activationCount - a.activationCount)
      .slice(0, limit);
  }
}

class MarginOptimizer {
  private reports: MarginOptimizationReport[] = [];
  private counter = 0;

  analyze(period: string, productId: string, costOfGoods: number, currentPrice: number, targetMarginPct: number, competitorAvgPrice: number): MarginOptimizationReport {
    const currentMarginPct = currentPrice > 0 ? ((currentPrice - costOfGoods) / currentPrice) * 100 : 0;
    const suggestedPrice = costOfGoods / (1 - targetMarginPct / 100);
    const priceGapPct = currentPrice > 0 ? ((suggestedPrice - currentPrice) / currentPrice) * 100 : 0;
    const competitorHeadroom = competitorAvgPrice - currentPrice;

    const recommendation: MarginOptimizationReport['recommendation'] =
      priceGapPct > 5 && competitorHeadroom > 0 ? 'raise_price' :
      priceGapPct > 5 ? 'reduce_cost' :
      priceGapPct < -5 ? 'maintain' : 'bundle';

    const estimatedMarginImprovement = targetMarginPct - currentMarginPct;

    const reportId = `marginopt-${Date.now()}-${++this.counter}`;
    const report: MarginOptimizationReport = {
      reportId, period, productId, costOfGoods, currentPrice, currentMarginPct,
      targetMarginPct, suggestedPrice, priceGapPct, competitorHeadroom,
      recommendation, estimatedMarginImprovement, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLowMargin(threshold = 20): MarginOptimizationReport[] {
    return this.reports.filter(r => r.currentMarginPct < threshold)
      .sort((a, b) => a.currentMarginPct - b.currentMarginPct);
  }

  getLatest(): MarginOptimizationReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

export const competitivePriceMonitor = new CompetitivePriceMonitor();
export const priceElasticityCalculator = new PriceElasticityCalculator();
export const dynamicPricingRuleEngine = new DynamicPricingRuleEngine();
export const marginOptimizer = new MarginOptimizer();

export { PricePoint, PriceElasticityRecord, DynamicPricingRule, MarginOptimizationReport };
