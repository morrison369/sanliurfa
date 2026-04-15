/**
 * Phase 192: Dynamic Pricing Engine
 * Pricing rules, demand-based pricing, competitive analysis, pricing experiments
 */

import { logger } from './logger';

interface PricingRule {
  ruleId: string;
  name: string;
  productId: string;
  condition: 'demand_high' | 'demand_low' | 'inventory_low' | 'competitor_lower' | 'peak_hour' | 'off_peak';
  adjustment: 'percentage' | 'fixed';
  adjustmentValue: number; // positive = increase, negative = decrease
  maxAdjustmentPct: number;
  priority: number;
  active: boolean;
  createdAt: number;
}

interface PricePoint {
  priceId: string;
  productId: string;
  basePrice: number;
  adjustedPrice: number;
  adjustmentReason: string;
  appliedRules: string[];
  validFrom: number;
  validUntil: number;
  currency: string;
}

interface CompetitorPrice {
  competitorId: string;
  productId: string;
  price: number;
  currency: string;
  capturedAt: number;
  source: string;
}

interface PricingExperiment {
  experimentId: string;
  name: string;
  productId: string;
  controlPrice: number;
  variantPrice: number;
  trafficSplit: number; // 0-1, portion going to variant
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'stopped';
  metrics: { controlConversions: number; variantConversions: number; controlRevenue: number; variantRevenue: number };
}

class PricingRuleEngine {
  private rules: Map<string, PricingRule> = new Map();
  private counter = 0;

  addRule(name: string, productId: string, condition: PricingRule['condition'], adjustment: PricingRule['adjustment'], adjustmentValue: number, maxAdjustmentPct: number, priority = 1): PricingRule {
    const ruleId = `rule-${Date.now()}-${++this.counter}`;
    const rule: PricingRule = {
      ruleId, name, productId, condition, adjustment, adjustmentValue,
      maxAdjustmentPct, priority, active: true, createdAt: Date.now()
    };
    this.rules.set(ruleId, rule);
    logger.debug('Pricing rule added', { ruleId, name, condition, adjustmentValue });
    return rule;
  }

  applyRules(productId: string, basePrice: number, activeConditions: PricingRule['condition'][]): { price: number; appliedRules: string[]; adjustmentPct: number } {
    const applicableRules = Array.from(this.rules.values())
      .filter(r => r.productId === productId && r.active && activeConditions.includes(r.condition))
      .sort((a, b) => b.priority - a.priority);

    let price = basePrice;
    const appliedRules: string[] = [];

    for (const rule of applicableRules) {
      const delta = rule.adjustment === 'percentage'
        ? basePrice * (rule.adjustmentValue / 100)
        : rule.adjustmentValue;

      const maxDelta = basePrice * (rule.maxAdjustmentPct / 100);
      const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta), Math.abs(maxDelta));
      price += clampedDelta;
      appliedRules.push(rule.ruleId);
    }

    price = Math.max(0, price);
    return { price, appliedRules, adjustmentPct: ((price - basePrice) / basePrice) * 100 };
  }

  deactivateRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) { rule.active = false; return true; }
    return false;
  }

  getRulesForProduct(productId: string): PricingRule[] {
    return Array.from(this.rules.values()).filter(r => r.productId === productId);
  }
}

class DemandBasedPricer {
  private demandSignals: Map<string, Array<{ timestamp: number; demandScore: number }>> = new Map();
  private priceHistory: Map<string, PricePoint[]> = new Map();
  private counter = 0;

  recordDemandSignal(productId: string, demandScore: number): void {
    const signals = this.demandSignals.get(productId) || [];
    signals.push({ timestamp: Date.now(), demandScore: Math.max(0, Math.min(100, demandScore)) });
    if (signals.length > 50) signals.shift();
    this.demandSignals.set(productId, signals);
  }

  getCurrentDemandScore(productId: string): number {
    const signals = this.demandSignals.get(productId) || [];
    if (!signals.length) return 50;
    const recent = signals.slice(-10);
    return recent.reduce((sum, s) => sum + s.demandScore, 0) / recent.length;
  }

  computePrice(productId: string, basePrice: number, elasticity = 0.5): PricePoint {
    const demandScore = this.getCurrentDemandScore(productId);
    const demandFactor = (demandScore - 50) / 50; // -1 to +1
    const adjustment = basePrice * demandFactor * elasticity;
    const adjustedPrice = Math.max(basePrice * 0.5, Math.min(basePrice * 2, basePrice + adjustment));

    const pricePoint: PricePoint = {
      priceId: `price-${Date.now()}-${++this.counter}`,
      productId, basePrice, adjustedPrice,
      adjustmentReason: `demand_score:${demandScore.toFixed(1)}`,
      appliedRules: ['demand_based'],
      validFrom: Date.now(),
      validUntil: Date.now() + 3600000,
      currency: 'USD'
    };
    const history = this.priceHistory.get(productId) || [];
    history.push(pricePoint);
    if (history.length > 100) history.shift();
    this.priceHistory.set(productId, history);
    return pricePoint;
  }

  getPriceHistory(productId: string, limit = 10): PricePoint[] {
    return (this.priceHistory.get(productId) || []).slice(-limit);
  }
}

class CompetitivePricingAnalyzer {
  private prices: Map<string, CompetitorPrice[]> = new Map();

  record(competitorId: string, productId: string, price: number, source = 'scrape'): CompetitorPrice {
    const cp: CompetitorPrice = { competitorId, productId, price, currency: 'USD', capturedAt: Date.now(), source };
    const key = `${productId}`;
    const existing = this.prices.get(key) || [];
    const idx = existing.findIndex(p => p.competitorId === competitorId);
    if (idx >= 0) existing[idx] = cp; else existing.push(cp);
    this.prices.set(key, existing);
    return cp;
  }

  getMarketStats(productId: string): { min: number; max: number; avg: number; competitorCount: number } {
    const prices = this.prices.get(productId) || [];
    if (!prices.length) return { min: 0, max: 0, avg: 0, competitorCount: 0 };
    const values = prices.map(p => p.price);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      competitorCount: prices.length
    };
  }

  recommendPrice(productId: string, strategy: 'match_lowest' | 'beat_lowest' | 'match_avg' | 'premium'): number {
    const stats = this.getMarketStats(productId);
    if (!stats.competitorCount) return 0;
    switch (strategy) {
      case 'match_lowest': return stats.min;
      case 'beat_lowest': return stats.min * 0.95;
      case 'match_avg': return stats.avg;
      case 'premium': return stats.max * 1.1;
    }
  }
}

class PricingExperimentManager {
  private experiments: Map<string, PricingExperiment> = new Map();
  private counter = 0;

  start(name: string, productId: string, controlPrice: number, variantPrice: number, trafficSplit = 0.5): PricingExperiment {
    const experimentId = `exp-${Date.now()}-${++this.counter}`;
    const experiment: PricingExperiment = {
      experimentId, name, productId, controlPrice, variantPrice,
      trafficSplit: Math.max(0, Math.min(1, trafficSplit)),
      startedAt: Date.now(), status: 'running',
      metrics: { controlConversions: 0, variantConversions: 0, controlRevenue: 0, variantRevenue: 0 }
    };
    this.experiments.set(experimentId, experiment);
    logger.debug('Pricing experiment started', { experimentId, name, controlPrice, variantPrice });
    return experiment;
  }

  recordConversion(experimentId: string, isVariant: boolean, revenue: number): void {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== 'running') return;
    if (isVariant) {
      exp.metrics.variantConversions++;
      exp.metrics.variantRevenue += revenue;
    } else {
      exp.metrics.controlConversions++;
      exp.metrics.controlRevenue += revenue;
    }
  }

  conclude(experimentId: string): { winner: 'control' | 'variant' | 'inconclusive'; liftPct: number } | undefined {
    const exp = this.experiments.get(experimentId);
    if (!exp) return undefined;
    exp.status = 'completed';
    exp.endedAt = Date.now();

    const controlRate = exp.metrics.controlConversions > 0 ? exp.metrics.controlRevenue / exp.metrics.controlConversions : 0;
    const variantRate = exp.metrics.variantConversions > 0 ? exp.metrics.variantRevenue / exp.metrics.variantConversions : 0;
    const liftPct = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
    const winner = Math.abs(liftPct) < 2 ? 'inconclusive' : liftPct > 0 ? 'variant' : 'control';
    return { winner, liftPct };
  }

  getRunningExperiments(): PricingExperiment[] {
    return Array.from(this.experiments.values()).filter(e => e.status === 'running');
  }
}

export const pricingRuleEngine = new PricingRuleEngine();
export const demandBasedPricer = new DemandBasedPricer();
export const competitivePricingAnalyzer = new CompetitivePricingAnalyzer();
export const pricingExperimentManager = new PricingExperimentManager();

export { PricingRule, PricePoint, CompetitorPrice, PricingExperiment };
