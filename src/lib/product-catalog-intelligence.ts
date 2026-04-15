/**
 * Phase 307: Product Catalog Intelligence
 * SKU analytics, product performance, pricing optimization, catalog health
 */

import { logger } from './logger';

interface ProductRecord {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  subcategory: string;
  brand: string;
  listPriceUSD: number;
  costUSD: number;
  grossMarginPct: number;
  status: 'active' | 'discontinued' | 'seasonal' | 'end_of_life' | 'new';
  launchDate: number;
  lastSaleDate?: number;
  totalUnitsSold: number;
  totalRevenueUSD: number;
  returnRatePct: number;
  avgRating: number;           // 0-5
  reviewCount: number;
  inventoryCount: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  daysInCatalog: number;
  velocityScore: number;       // units/day
  performanceTier: 'hero' | 'core' | 'niche' | 'tail' | 'zombie';
  createdAt: number;
}

interface PricingOptimizationRecord {
  recordId: string;
  productId: string;
  productName: string;
  currentPriceUSD: number;
  recommendedPriceUSD: number;
  pricingStrategy: 'value_based' | 'competitive' | 'cost_plus' | 'dynamic' | 'bundle';
  priceElasticity: number;        // % demand change per % price change
  competitorAvgPrice: number;
  pricePositioning: 'premium' | 'parity' | 'value';
  estimatedRevenueImpactUSD: number;
  estimatedMarginImpactPct: number;
  confidence: 'high' | 'medium' | 'low';
  calculatedAt: number;
}

interface CatalogHealthRecord {
  recordId: string;
  period: string;
  totalSKUs: number;
  activeSKUs: number;
  newSKUsAdded: number;
  skusDiscontinued: number;
  heroProductsPct: number;
  zombieProductsPct: number;      // products with near-zero velocity
  avgProductAge: number;          // days
  avgGrossMarginPct: number;
  outOfStockRatePct: number;
  returnRatePct: number;
  catalogHealthScore: number;     // 0-100 composite
  calculatedAt: number;
}

interface ProductAffinityRecord {
  recordId: string;
  productIdA: string;
  productNameA: string;
  productIdB: string;
  productNameB: string;
  coOccurrenceCount: number;
  liftScore: number;              // how much more likely bought together vs independently
  confidencePct: number;          // % of A buyers who also buy B
  supportPct: number;             // % of all transactions containing both
  bundleRecommended: boolean;
  estimatedBundleRevenueLift: number;
  calculatedAt: number;
}

class ProductCatalogManager {
  private products: Map<string, ProductRecord> = new Map();
  private counter = 0;
  private skuCounter = 10000;

  add(name: string, category: string, subcategory: string, brand: string, listPrice: number, cost: number, inventoryCount: number): ProductRecord {
    const productId = `prod-${Date.now()}-${++this.counter}`;
    const sku = `SKU-${++this.skuCounter}`;
    const margin = listPrice > 0 ? Math.round(((listPrice - cost) / listPrice) * 100 * 10) / 10 : 0;
    const stockStatus: ProductRecord['stockStatus'] = inventoryCount <= 0 ? 'out_of_stock' : inventoryCount <= 10 ? 'low_stock' : 'in_stock';

    const record: ProductRecord = {
      productId, sku, productName: name, category, subcategory, brand,
      listPriceUSD: listPrice, costUSD: cost, grossMarginPct: margin,
      status: 'active', launchDate: Date.now(), totalUnitsSold: 0,
      totalRevenueUSD: 0, returnRatePct: 0, avgRating: 0, reviewCount: 0,
      inventoryCount, stockStatus, daysInCatalog: 0, velocityScore: 0,
      performanceTier: 'new', createdAt: Date.now()
    };
    this.products.set(productId, record);
    logger.debug('Product added', { productId, sku, name, category });
    return record;
  }

  recordSales(productId: string, unitsSold: number, revenue: number, returnRate: number): boolean {
    const p = this.products.get(productId);
    if (!p) return false;
    p.totalUnitsSold += unitsSold;
    p.totalRevenueUSD += revenue;
    p.returnRatePct = returnRate;
    p.daysInCatalog = Math.floor((Date.now() - p.launchDate) / 86400000);
    p.velocityScore = p.daysInCatalog > 0 ? Math.round((p.totalUnitsSold / p.daysInCatalog) * 10) / 10 : 0;
    p.lastSaleDate = Date.now();
    p.performanceTier = this.classifyPerformance(p.totalRevenueUSD, p.velocityScore);
    return true;
  }

  private classifyPerformance(revenue: number, velocity: number): ProductRecord['performanceTier'] {
    if (revenue >= 100000 && velocity >= 10) return 'hero';
    if (revenue >= 20000 && velocity >= 2) return 'core';
    if (revenue >= 5000) return 'niche';
    if (velocity < 0.1 && revenue < 1000) return 'zombie';
    return 'tail';
  }

  getByTier(tier: ProductRecord['performanceTier']): ProductRecord[] {
    return Array.from(this.products.values()).filter(p => p.performanceTier === tier);
  }

  getLowStockProducts(): ProductRecord[] {
    return Array.from(this.products.values()).filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock');
  }

  getTopRevenueProducts(limit = 10): ProductRecord[] {
    return Array.from(this.products.values()).sort((a, b) => b.totalRevenueUSD - a.totalRevenueUSD).slice(0, limit);
  }

  getTotalCatalogRevenue(): number {
    return Array.from(this.products.values()).reduce((s, p) => s + p.totalRevenueUSD, 0);
  }

  getProduct(id: string): ProductRecord | undefined {
    return this.products.get(id);
  }

  getAll(): ProductRecord[] {
    return Array.from(this.products.values());
  }
}

class PricingOptimizer {
  private records: PricingOptimizationRecord[] = [];
  private counter = 0;

  optimize(productId: string, productName: string, currentPrice: number, cost: number, competitorAvg: number, elasticity: number, strategy: PricingOptimizationRecord['pricingStrategy']): PricingOptimizationRecord {
    let recommendedPrice = currentPrice;
    if (strategy === 'competitive') recommendedPrice = competitorAvg * 0.98;
    else if (strategy === 'value_based') recommendedPrice = competitorAvg * 1.05;
    else if (strategy === 'cost_plus') recommendedPrice = cost * 1.5;
    else if (strategy === 'dynamic') recommendedPrice = elasticity < -1.5 ? currentPrice * 0.95 : currentPrice * 1.05;

    const priceDiff = recommendedPrice - currentPrice;
    const demandChange = elasticity * (priceDiff / currentPrice); // % demand change
    const revenueImpact = (priceDiff + demandChange * currentPrice) * 100; // approximate
    const marginImpact = recommendedPrice > 0 ? ((recommendedPrice - cost) / recommendedPrice * 100) - ((currentPrice - cost) / currentPrice * 100) : 0;

    const positioning: PricingOptimizationRecord['pricePositioning'] =
      recommendedPrice > competitorAvg * 1.1 ? 'premium' :
      recommendedPrice < competitorAvg * 0.9 ? 'value' : 'parity';

    const recordId = `price-${Date.now()}-${++this.counter}`;
    const record: PricingOptimizationRecord = {
      recordId, productId, productName, currentPriceUSD: currentPrice,
      recommendedPriceUSD: Math.round(recommendedPrice * 100) / 100, pricingStrategy: strategy,
      priceElasticity: elasticity, competitorAvgPrice: competitorAvg, pricePositioning: positioning,
      estimatedRevenueImpactUSD: Math.round(revenueImpact),
      estimatedMarginImpactPct: Math.round(marginImpact * 10) / 10,
      confidence: Math.abs(priceDiff / currentPrice) < 0.1 ? 'high' : 'medium',
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getHighImpactOpportunities(minImpact = 1000): PricingOptimizationRecord[] {
    return this.records
      .filter(r => Math.abs(r.estimatedRevenueImpactUSD) >= minImpact)
      .sort((a, b) => Math.abs(b.estimatedRevenueImpactUSD) - Math.abs(a.estimatedRevenueImpactUSD));
  }

  getTotalEstimatedRevenueLift(): number {
    return this.records.reduce((s, r) => s + r.estimatedRevenueImpactUSD, 0);
  }
}

class CatalogHealthAnalyzer {
  private records: CatalogHealthRecord[] = [];
  private counter = 0;

  analyze(period: string, products: ProductRecord[]): CatalogHealthRecord {
    const total = products.length;
    const active = products.filter(p => p.status === 'active').length;
    const heroes = products.filter(p => p.performanceTier === 'hero').length;
    const zombies = products.filter(p => p.performanceTier === 'zombie').length;
    const avgMargin = active > 0 ? products.filter(p => p.status === 'active').reduce((s, p) => s + p.grossMarginPct, 0) / active : 0;
    const avgAge = active > 0 ? products.filter(p => p.status === 'active').reduce((s, p) => s + p.daysInCatalog, 0) / active : 0;
    const oos = active > 0 ? products.filter(p => p.stockStatus === 'out_of_stock').length / active * 100 : 0;
    const avgReturn = active > 0 ? products.reduce((s, p) => s + p.returnRatePct, 0) / active : 0;

    const heroScore = total > 0 ? (heroes / total) * 100 : 0;
    const zombieScore = total > 0 ? (1 - zombies / total) * 100 : 100;
    const healthScore = heroScore * 0.3 + (100 - oos) * 0.25 + (100 - avgReturn * 5) * 0.2 + avgMargin * 0.25;

    const recordId = `cathlth-${Date.now()}-${++this.counter}`;
    const record: CatalogHealthRecord = {
      recordId, period, totalSKUs: total, activeSKUs: active, newSKUsAdded: 0, skusDiscontinued: 0,
      heroProductsPct: Math.round(heroScore * 10) / 10, zombieProductsPct: total > 0 ? Math.round((zombies / total) * 100 * 10) / 10 : 0,
      avgProductAge: Math.round(avgAge), avgGrossMarginPct: Math.round(avgMargin * 10) / 10,
      outOfStockRatePct: Math.round(oos * 10) / 10, returnRatePct: Math.round(avgReturn * 10) / 10,
      catalogHealthScore: Math.round(Math.max(0, Math.min(100, healthScore)) * 10) / 10,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Catalog health analyzed', { period, health: record.catalogHealthScore });
    return record;
  }

  getLatest(): CatalogHealthRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

class ProductAffinityAnalyzer {
  private records: ProductAffinityRecord[] = [];
  private counter = 0;

  analyze(productIdA: string, nameA: string, productIdB: string, nameB: string, coOccurrences: number, totalTransactions: number, transactionsWithA: number): ProductAffinityRecord {
    const support = totalTransactions > 0 ? (coOccurrences / totalTransactions) * 100 : 0;
    const confidence = transactionsWithA > 0 ? (coOccurrences / transactionsWithA) * 100 : 0;
    const expectedCoOccurrence = transactionsWithA > 0 && totalTransactions > 0 ? transactionsWithA / totalTransactions : 0;
    const lift = expectedCoOccurrence > 0 ? (support / 100) / (expectedCoOccurrence * expectedCoOccurrence) : 1;

    const recordId = `affinity-${Date.now()}-${++this.counter}`;
    const record: ProductAffinityRecord = {
      recordId, productIdA, productNameA: nameA, productIdB, productNameB: nameB,
      coOccurrenceCount: coOccurrences, liftScore: Math.round(lift * 100) / 100,
      confidencePct: Math.round(confidence * 10) / 10, supportPct: Math.round(support * 10) / 10,
      bundleRecommended: lift >= 1.5 && confidence >= 20,
      estimatedBundleRevenueLift: coOccurrences * 10,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getBundleOpportunities(): ProductAffinityRecord[] {
    return this.records.filter(r => r.bundleRecommended).sort((a, b) => b.liftScore - a.liftScore);
  }
}

export const productCatalogManager = new ProductCatalogManager();
export const pricingOptimizer = new PricingOptimizer();
export const catalogHealthAnalyzer = new CatalogHealthAnalyzer();
export const productAffinityAnalyzer = new ProductAffinityAnalyzer();

export { ProductRecord, PricingOptimizationRecord, CatalogHealthRecord, ProductAffinityRecord };
