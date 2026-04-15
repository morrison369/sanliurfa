/**
 * Phase 329: Price Optimization Intelligence
 * Dynamic pricing, elasticity analysis, markdown optimization, price testing
 */

import { logger } from './logger';

interface PricePointRecord {
  pricePointId: string;
  skuId: string;
  productName: string;
  category: string;
  currentPriceUSD: number;
  costUSD: number;
  marginPct: number;
  listPriceUSD: number;
  competitorAvgPriceUSD?: number;
  pricePositioning: 'premium' | 'parity' | 'value' | 'discount';
  demandElasticity: number;        // negative: elastic if < -1
  optimalPriceUSD: number;
  potentialRevenueUSD: number;
  recommendedAction: 'increase' | 'decrease' | 'hold' | 'test';
  confidenceScore: number;         // 0-100
  updatedAt: number;
  createdAt: number;
}

interface ElasticityRecord {
  elasticityId: string;
  skuId: string;
  productName: string;
  basePrice: number;
  baseQuantity: number;
  testPrice: number;
  testQuantity: number;
  priceChangePct: number;
  quantityChangePct: number;
  elasticity: number;              // % qty change / % price change
  elasticityType: 'elastic' | 'unit_elastic' | 'inelastic';
  revenueImpact: 'positive' | 'negative' | 'neutral';
  optimalPriceDirection: 'increase' | 'decrease' | 'hold';
  calculatedAt: number;
}

interface MarkdownRecord {
  markdownId: string;
  skuId: string;
  productName: string;
  currentStock: number;
  daysOfSupply: number;
  currentPriceUSD: number;
  markdownPct: number;
  markdownPriceUSD: number;
  expectedSellThroughDays: number;
  estimatedRevenueLossUSD: number;
  estimatedInventorySavingsUSD: number;
  netBenefitUSD: number;
  urgency: 'immediate' | 'schedule' | 'monitor';
  reason: 'overstock' | 'season_end' | 'product_lifecycle' | 'competitive_pressure';
  approvalStatus: 'pending' | 'approved' | 'active' | 'completed';
  createdAt: number;
}

interface PriceTestRecord {
  testId: string;
  skuId: string;
  productName: string;
  testType: 'a_b' | 'multivariate' | 'sequential';
  controlPrice: number;
  testPrice: number;
  controlRevenue: number;
  testRevenue: number;
  controlConversions: number;
  testConversions: number;
  controlConversionRate: number;
  testConversionRate: number;
  revenueLift: number;             // %
  statisticalSignificance: number; // 0-100 %
  winner: 'control' | 'test' | 'inconclusive';
  sampleSize: number;
  durationDays: number;
  startedAt: number;
  completedAt?: number;
}

class PriceOptimizer {
  private prices: Map<string, PricePointRecord> = new Map();
  private counter = 0;

  analyze(skuId: string, name: string, category: string, currentPrice: number, cost: number, listPrice: number, elasticity: number, competitorAvgPrice?: number): PricePointRecord {
    const pricePointId = `pp-${Date.now()}-${++this.counter}`;
    const marginPct = currentPrice > 0 ? Math.round(((currentPrice - cost) / currentPrice) * 100 * 10) / 10 : 0;

    const positioning: PricePointRecord['pricePositioning'] = competitorAvgPrice
      ? (currentPrice >= competitorAvgPrice * 1.1 ? 'premium' : currentPrice >= competitorAvgPrice * 0.95 ? 'parity' : currentPrice >= competitorAvgPrice * 0.85 ? 'value' : 'discount')
      : 'parity';

    // Optimal price: for elastic products, lower price may increase revenue; inelastic — raise
    const isElastic = elasticity < -1;
    const optimalPrice = isElastic
      ? Math.max(cost * 1.1, currentPrice * 0.95)     // slight decrease
      : Math.min(listPrice, currentPrice * 1.05);      // slight increase
    const potentialRevenue = Math.round(optimalPrice * (1 + Math.abs(elasticity) * (optimalPrice - currentPrice) / currentPrice));

    const priceDiff = optimalPrice - currentPrice;
    const action: PricePointRecord['recommendedAction'] =
      Math.abs(priceDiff) < currentPrice * 0.02 ? 'hold' :
      priceDiff > 0 ? 'increase' : 'decrease';

    const confidence = Math.min(100, 50 + Math.round(Math.abs(elasticity) * 10));

    const record: PricePointRecord = {
      pricePointId, skuId, productName: name, category,
      currentPriceUSD: currentPrice, costUSD: cost, marginPct, listPriceUSD: listPrice,
      competitorAvgPriceUSD: competitorAvgPrice, pricePositioning: positioning,
      demandElasticity: elasticity, optimalPriceUSD: Math.round(optimalPrice * 100) / 100,
      potentialRevenueUSD: potentialRevenue, recommendedAction: action,
      confidenceScore: confidence, updatedAt: Date.now(), createdAt: Date.now()
    };
    this.prices.set(skuId, record);
    logger.debug('Price analyzed', { pricePointId, skuId, action, optimalPrice });
    return record;
  }

  getIncreaseOpportunities(minMarginPct = 20): PricePointRecord[] {
    return Array.from(this.prices.values()).filter(p => p.recommendedAction === 'increase' && p.marginPct >= minMarginPct);
  }

  getPremiumPositioned(): PricePointRecord[] {
    return Array.from(this.prices.values()).filter(p => p.pricePositioning === 'premium');
  }

  getAll(): PricePointRecord[] {
    return Array.from(this.prices.values());
  }
}

class ElasticityAnalyzer {
  private records: ElasticityRecord[] = [];
  private counter = 0;

  measure(skuId: string, name: string, basePrice: number, baseQty: number, testPrice: number, testQty: number): ElasticityRecord {
    const elasticityId = `elast-${Date.now()}-${++this.counter}`;
    const priceChangePct = basePrice > 0 ? Math.round(((testPrice - basePrice) / basePrice) * 100 * 100) / 100 : 0;
    const qtyChangePct = baseQty > 0 ? Math.round(((testQty - baseQty) / baseQty) * 100 * 100) / 100 : 0;
    const elasticity = priceChangePct !== 0 ? Math.round((qtyChangePct / priceChangePct) * 100) / 100 : 0;
    const type: ElasticityRecord['elasticityType'] = Math.abs(elasticity) > 1 ? 'elastic' : Math.abs(elasticity) === 1 ? 'unit_elastic' : 'inelastic';

    // Revenue impact: if elastic and price goes up, revenue drops; inelastic — price up, revenue up
    const baseRevenue = basePrice * baseQty;
    const testRevenue = testPrice * testQty;
    const revenueImpact: ElasticityRecord['revenueImpact'] = testRevenue > baseRevenue * 1.01 ? 'positive' : testRevenue < baseRevenue * 0.99 ? 'negative' : 'neutral';
    const optDir: ElasticityRecord['optimalPriceDirection'] = type === 'elastic' ? (priceChangePct > 0 ? 'decrease' : 'increase') : (priceChangePct < 0 ? 'increase' : 'decrease');

    const record: ElasticityRecord = {
      elasticityId, skuId, productName: name, basePrice, baseQuantity: baseQty,
      testPrice, testQuantity: testQty, priceChangePct, quantityChangePct: qtyChangePct,
      elasticity, elasticityType: type, revenueImpact, optimalPriceDirection: optDir,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getElasticProducts(): ElasticityRecord[] {
    return this.records.filter(r => r.elasticityType === 'elastic');
  }

  getAll(): ElasticityRecord[] {
    return [...this.records];
  }
}

class MarkdownManager {
  private markdowns: MarkdownRecord[] = [];
  private counter = 0;

  plan(skuId: string, name: string, currentStock: number, avgDailySales: number, currentPrice: number, markdownPct: number, holdingCostPerUnitPerDay: number, reason: MarkdownRecord['reason']): MarkdownRecord {
    const markdownId = `md-${Date.now()}-${++this.counter}`;
    const markdownPrice = Math.round(currentPrice * (1 - markdownPct / 100) * 100) / 100;
    const daysOfSupply = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
    const expectedNewDailySales = avgDailySales * (1 + Math.min(markdownPct * 0.03, 2));  // markdown stimulates demand
    const expectedSellThroughDays = Math.ceil(currentStock / expectedNewDailySales);
    const revLoss = Math.round(currentStock * (currentPrice - markdownPrice));
    const holdingSavings = Math.round((daysOfSupply - expectedSellThroughDays) * currentStock * holdingCostPerUnitPerDay);
    const netBenefit = holdingSavings - revLoss;
    const urgency: MarkdownRecord['urgency'] = daysOfSupply > 120 ? 'immediate' : daysOfSupply > 60 ? 'schedule' : 'monitor';

    const record: MarkdownRecord = {
      markdownId, skuId, productName: name, currentStock, daysOfSupply,
      currentPriceUSD: currentPrice, markdownPct, markdownPriceUSD: markdownPrice,
      expectedSellThroughDays, estimatedRevenueLossUSD: revLoss,
      estimatedInventorySavingsUSD: holdingSavings, netBenefitUSD: netBenefit,
      urgency, reason, approvalStatus: 'pending', createdAt: Date.now()
    };
    this.markdowns.push(record);
    logger.debug('Markdown planned', { markdownId, skuId, markdownPct, netBenefit });
    return record;
  }

  approve(markdownId: string): boolean {
    const md = this.markdowns.find(m => m.markdownId === markdownId);
    if (!md) return false;
    md.approvalStatus = 'approved';
    return true;
  }

  getImmediateMarkdowns(): MarkdownRecord[] {
    return this.markdowns.filter(m => m.urgency === 'immediate' && m.approvalStatus === 'pending');
  }

  getTotalNetBenefit(): number {
    return this.markdowns.reduce((s, m) => s + m.netBenefitUSD, 0);
  }
}

class PriceTestManager {
  private tests: PriceTestRecord[] = [];
  private counter = 0;

  start(skuId: string, name: string, type: PriceTestRecord['testType'], controlPrice: number, testPrice: number): PriceTestRecord {
    const testId = `ptest-${Date.now()}-${++this.counter}`;
    const record: PriceTestRecord = {
      testId, skuId, productName: name, testType: type,
      controlPrice, testPrice,
      controlRevenue: 0, testRevenue: 0,
      controlConversions: 0, testConversions: 0,
      controlConversionRate: 0, testConversionRate: 0,
      revenueLift: 0, statisticalSignificance: 0,
      winner: 'inconclusive', sampleSize: 0, durationDays: 0,
      startedAt: Date.now()
    };
    this.tests.push(record);
    return record;
  }

  conclude(testId: string, controlRevenue: number, testRevenue: number, controlConversions: number, testConversions: number, sampleSize: number, durationDays: number): boolean {
    const test = this.tests.find(t => t.testId === testId);
    if (!test) return false;
    test.controlRevenue = controlRevenue;
    test.testRevenue = testRevenue;
    test.controlConversions = controlConversions;
    test.testConversions = testConversions;
    test.controlConversionRate = sampleSize > 0 ? Math.round((controlConversions / (sampleSize / 2)) * 100 * 100) / 100 : 0;
    test.testConversionRate = sampleSize > 0 ? Math.round((testConversions / (sampleSize / 2)) * 100 * 100) / 100 : 0;
    test.revenueLift = controlRevenue > 0 ? Math.round(((testRevenue - controlRevenue) / controlRevenue) * 100 * 10) / 10 : 0;
    test.statisticalSignificance = Math.min(99, Math.round(Math.sqrt(sampleSize) * 2));  // simplified
    test.winner = test.statisticalSignificance >= 95 ? (testRevenue > controlRevenue ? 'test' : 'control') : 'inconclusive';
    test.sampleSize = sampleSize;
    test.durationDays = durationDays;
    test.completedAt = Date.now();
    return true;
  }

  getSignificantWins(): PriceTestRecord[] {
    return this.tests.filter(t => t.winner === 'test' && t.statisticalSignificance >= 95);
  }
}

export const priceOptimizer = new PriceOptimizer();
export const elasticityAnalyzer = new ElasticityAnalyzer();
export const markdownManager = new MarkdownManager();
export const priceTestManager = new PriceTestManager();

export { PricePointRecord, ElasticityRecord, MarkdownRecord, PriceTestRecord };
