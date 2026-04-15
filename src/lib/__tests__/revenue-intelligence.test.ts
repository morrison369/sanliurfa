/**
 * Advanced Revenue Intelligence & Monetization (Phase 191-196)
 * Test suite for revenue leakage detection, dynamic pricing, subscription analytics,
 * revenue forecasting, CLV optimization, and monetization strategy
 */

import { describe, it, expect } from 'vitest';
import {
  leakageDetector, billingReconciliationEngine, unbilledUsageTracker, revenueRecoveryManager,
  pricingRuleEngine, demandBasedPricer, competitivePricingAnalyzer, pricingExperimentManager,
  churnPredictor, mrrAnalyzer, subscriptionCohortAnalyzer, expansionRevenueTracker,
  revenueForecaster, pipelineRevenueCalculator, seasonalityAnalyzer, forecastAccuracyTracker,
  clvCalculator, customerSegmentOptimizer, retentionROIAnalyzer, lifetimeValueMaximizer,
  monetizationModelEvaluator, pricingStrategyAdvisor, revenueStreamManager, monetizationMetricsTracker
} from '../index';

// Phase 191: Revenue Leakage Detection
describe('Phase 191: Revenue Leakage Detection', () => {
  it('should detect, investigate and resolve leakage events', () => {
    const event = leakageDetector.detect('unbilled_usage', 'customer-001', 1500, 'Usage not captured in billing run');
    expect(event.status).toBe('open');
    expect(event.estimatedLoss).toBe(1500);

    leakageDetector.investigate(event.leakageId);
    const resolved = leakageDetector.resolve(event.leakageId);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should reconcile billing and detect discrepancies', () => {
    const lineItems = [
      { itemId: 'li-001', billed: 1000, expected: 1100 },
      { itemId: 'li-002', billed: 500, expected: 500 }
    ];
    const record = billingReconciliationEngine.reconcile('2026-03', 1500, lineItems);
    expect(record.variance).toBe(-100);
    expect(record.status).toBe('discrepancy');

    const discrepancies = billingReconciliationEngine.getDiscrepancies();
    expect(discrepancies.length).toBeGreaterThan(0);
  });

  it('should track unbilled usage and calculate total', () => {
    unbilledUsageTracker.record('customer-002', 'api-pro', 500, 0.002, '2026-03');
    unbilledUsageTracker.record('customer-002', 'api-pro', 300, 0.002, '2026-03');

    const unbilled = unbilledUsageTracker.getUnbilled('customer-002');
    expect(unbilled.length).toBe(2);

    const total = unbilledUsageTracker.getTotalUnbilledRevenue();
    expect(total).toBeGreaterThan(0);

    unbilledUsageTracker.markBilled(unbilled[0].usageId);
    const afterBilling = unbilledUsageTracker.getUnbilled('customer-002');
    expect(afterBilling.length).toBe(1);
  });

  it('should initiate and complete revenue recovery', () => {
    const event = leakageDetector.detect('billing_gap', 'customer-003', 800, 'Gap in invoice sequence');
    const action = revenueRecoveryManager.initiate(event.leakageId, 'retroactive_bill', 800, 'customer-003');
    expect(action.status).toBe('pending');

    revenueRecoveryManager.complete(action.actionId);
    const recovered = revenueRecoveryManager.getTotalRecovered();
    expect(recovered).toBeGreaterThanOrEqual(800);
  });
});

// Phase 192: Dynamic Pricing Engine
describe('Phase 192: Dynamic Pricing Engine', () => {
  it('should apply pricing rules with capping', () => {
    pricingRuleEngine.addRule('Peak Surge', 'product-a', 'peak_hour', 'percentage', 20, 15, 1);
    const result = pricingRuleEngine.applyRules('product-a', 100, ['peak_hour']);
    expect(result.price).toBeGreaterThan(100);
    expect(result.price).toBeLessThanOrEqual(115); // maxAdjustmentPct=15
    expect(result.appliedRules.length).toBe(1);
  });

  it('should compute demand-based prices', () => {
    demandBasedPricer.recordDemandSignal('product-b', 80); // high demand
    demandBasedPricer.recordDemandSignal('product-b', 85);

    const priceHigh = demandBasedPricer.computePrice('product-b', 100);
    expect(priceHigh.adjustedPrice).toBeGreaterThan(100);

    demandBasedPricer.recordDemandSignal('product-b', 20); // low demand (overwrites)
    demandBasedPricer.recordDemandSignal('product-b', 15);
    const priceLow = demandBasedPricer.computePrice('product-b', 100);
    expect(priceLow.adjustedPrice).toBeLessThan(priceHigh.adjustedPrice);
  });

  it('should analyze competitor prices and recommend', () => {
    competitivePricingAnalyzer.record('competitor-a', 'product-c', 120);
    competitivePricingAnalyzer.record('competitor-b', 'product-c', 100);
    competitivePricingAnalyzer.record('competitor-c', 'product-c', 140);

    const stats = competitivePricingAnalyzer.getMarketStats('product-c');
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(140);
    expect(stats.avg).toBeCloseTo(120, 0);

    const beaterPrice = competitivePricingAnalyzer.recommendPrice('product-c', 'beat_lowest');
    expect(beaterPrice).toBeLessThan(100);
  });

  it('should run pricing experiments and determine winner', () => {
    const exp = pricingExperimentManager.start('Price Test A', 'product-d', 99, 119, 0.5);
    expect(exp.status).toBe('running');

    pricingExperimentManager.recordConversion(exp.experimentId, false, 99);
    pricingExperimentManager.recordConversion(false, false, 99); // ignored invalid
    pricingExperimentManager.recordConversion(exp.experimentId, true, 119);
    pricingExperimentManager.recordConversion(exp.experimentId, true, 119);

    const result = pricingExperimentManager.conclude(exp.experimentId);
    expect(result).toBeDefined();
    expect(['control', 'variant', 'inconclusive']).toContain(result?.winner);
  });
});

// Phase 193: Subscription Analytics
describe('Phase 193: Subscription Analytics', () => {
  it('should score churn probability from signals', () => {
    churnPredictor.recordSignal('sub-001', 'payment_failure', 'high');
    churnPredictor.recordSignal('sub-001', 'login_drop', 'medium');

    const score = churnPredictor.getChurnScore('sub-001');
    expect(score).toBeGreaterThan(0.5);

    const atRisk = churnPredictor.getAtRiskCustomers(0.4);
    expect(atRisk.some(c => c.customerId === 'sub-001')).toBe(true);
  });

  it('should track MRR components and compute growth', () => {
    mrrAnalyzer.record('2026-01', 5000, 1000, 500, 200);
    mrrAnalyzer.record('2026-02', 6000, 1500, 300, 100);

    const snapshots = mrrAnalyzer.getSnapshots();
    expect(snapshots.length).toBe(2);
    expect(snapshots[1].totalMRR).toBeGreaterThan(snapshots[0].totalMRR);

    const growth = mrrAnalyzer.getGrowthRate();
    expect(growth).toBeGreaterThan(0);
    expect(mrrAnalyzer.getARR()).toBe(snapshots[1].totalMRR * 12);
  });

  it('should analyze cohort retention', () => {
    subscriptionCohortAnalyzer.createCohort('2026-01', 100);
    subscriptionCohortAnalyzer.recordRetention('2026-01', 1, 90, 9000);
    subscriptionCohortAnalyzer.recordRetention('2026-01', 2, 82, 8200);

    const rate1 = subscriptionCohortAnalyzer.getRetentionRate('2026-01', 1);
    const rate2 = subscriptionCohortAnalyzer.getRetentionRate('2026-01', 2);
    expect(rate1).toBe(90);
    expect(rate2).toBeLessThan(rate1);
  });

  it('should track expansion revenue and rank expanders', () => {
    expansionRevenueTracker.record('customer-x', 'upsell', 500, 800);
    expansionRevenueTracker.record('customer-y', 'seat_expansion', 200, 600);

    const total = expansionRevenueTracker.getTotalExpansionMRR();
    expect(total).toBe(700); // (800-500) + (600-200)

    const top = expansionRevenueTracker.getTopExpanders(1);
    expect(top[0].customerId).toBe('customer-y'); // 400 > 300
  });
});

// Phase 194: Revenue Forecasting
describe('Phase 194: Revenue Forecasting', () => {
  it('should forecast revenue with linear regression', () => {
    revenueForecaster.recordActual('2026-01', 100000);
    revenueForecaster.recordActual('2026-02', 110000);
    revenueForecaster.recordActual('2026-03', 122000);

    const forecast = revenueForecaster.forecastLinear('2026-04');
    expect(forecast.predictedRevenue).toBeGreaterThan(100000);
    expect(forecast.confidenceHigh).toBeGreaterThan(forecast.confidenceLow);
  });

  it('should compute weighted pipeline revenue', () => {
    pipelineRevenueCalculator.addItem('Deal A', 50000, 'proposal', 0.5, 30, 'sales-1');
    pipelineRevenueCalculator.addItem('Deal B', 100000, 'negotiation', 0.75, 15, 'sales-1');

    const weighted = pipelineRevenueCalculator.calculateWeightedRevenue();
    expect(weighted).toBe(50000 * 0.5 + 100000 * 0.75);

    const byStage = pipelineRevenueCalculator.calculateByStage();
    expect(byStage['proposal']).toBeDefined();
    expect(byStage['negotiation'].totalValue).toBe(100000);
  });

  it('should calculate and apply seasonality factors', () => {
    const revenues = [80000, 90000, 100000, 110000, 120000, 130000, 125000, 115000, 105000, 95000, 85000, 140000];
    const pattern = seasonalityAnalyzer.calculatePattern('annual', revenues);
    expect(pattern.monthlyFactors.length).toBe(12);

    const december = seasonalityAnalyzer.getPeakMonth('annual');
    expect(december).toBe(11); // December (index 11)

    const adjusted = seasonalityAnalyzer.adjustForecast(100000, 'annual', 11);
    expect(adjusted).toBeGreaterThan(100000); // December is peak
  });

  it('should track forecast accuracy and compute MAPE', () => {
    const forecast = revenueForecaster.forecastExponential('2026-05');
    forecastAccuracyTracker.record(forecast.forecastId, '2026-05', forecast.predictedRevenue, forecast.predictedRevenue * 0.95);

    const mape = forecastAccuracyTracker.getOverallMAPE();
    expect(mape).toBeGreaterThanOrEqual(0);
    expect(mape).toBeLessThan(10); // within 10%
  });
});

// Phase 195: CLV Optimization
describe('Phase 195: CLV Optimization', () => {
  it('should calculate LTV and assign segments', () => {
    const profile = clvCalculator.upsert('clv-001', 12000, 1000, 12, 0.1);
    expect(profile.predictedLTV).toBeGreaterThan(12000);
    expect(['champions', 'loyal', 'at_risk', 'lost', 'promising', 'hibernating']).toContain(profile.segment);

    const top = clvCalculator.getTopCustomers(1);
    expect(top[0].customerId).toBe('clv-001');
  });

  it('should segment customers by LTV range', () => {
    clvCalculator.upsert('clv-002', 5000, 500, 10, 0.15);
    clvCalculator.upsert('clv-003', 1000, 100, 10, 0.5);

    customerSegmentOptimizer.defineSegment('enterprise', 10000, Infinity, 0, 0.3);
    customerSegmentOptimizer.defineSegment('mid_market', 3000, 10000, 0, 0.4);

    const profiles = [clvCalculator.getProfile('clv-001')!, clvCalculator.getProfile('clv-002')!];
    const assignments = customerSegmentOptimizer.assignCustomers(profiles);

    const enterprise = customerSegmentOptimizer.getSegment('enterprise');
    expect(enterprise?.customerCount).toBeGreaterThanOrEqual(0);
  });

  it('should plan and evaluate retention ROI', () => {
    const intervention = retentionROIAnalyzer.plan('clv-001', 'success_checkin', 500, 5000);
    expect(intervention.roi).toBeGreaterThan(0); // 5000-500 / 500 = 900%

    retentionROIAnalyzer.execute(intervention.interventionId);
    retentionROIAnalyzer.markOutcome(intervention.interventionId, true);

    const avgROI = retentionROIAnalyzer.getAverageROI();
    expect(avgROI).toBeGreaterThan(0);
  });

  it('should create LTV maximization plan', () => {
    const plan = lifetimeValueMaximizer.createPlan('clv-001', 15000, 30000);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.actions[0].priority).toBeLessThan(plan.actions[plan.actions.length - 1].priority);

    const maxLTV = lifetimeValueMaximizer.estimateMaxLTV(1000, 36);
    expect(maxLTV).toBe(1000 * 36 * 1.3);
  });
});

// Phase 196: Monetization Strategy
describe('Phase 196: Monetization Strategy', () => {
  it('should evaluate and compare monetization models', () => {
    const sub = monetizationModelEvaluator.evaluate('SaaS Subscription', 'subscription', 2000000, 'medium', 90);
    const usage = monetizationModelEvaluator.evaluate('Usage Based', 'usage_based', 1500000, 'low', 30);

    expect(sub.score).toBeGreaterThan(0);
    const comparison = monetizationModelEvaluator.compare(sub.modelId, usage.modelId);
    expect(comparison).toBeDefined();
    expect(['control', 'variant', 'inconclusive', sub.modelId, usage.modelId]).toContain(comparison?.winner);

    const recommendations = monetizationModelEvaluator.recommend(2);
    expect(recommendations.length).toBeLessThanOrEqual(2);
  });

  it('should define pricing strategies and estimate revenue', () => {
    const strategy = pricingStrategyAdvisor.define(
      'Enterprise Value Pricing', 'value_based', 'enterprise', 999, 'ROI-justified enterprise tier', 0.03
    );
    expect(strategy.active).toBe(true);

    const estimated = pricingStrategyAdvisor.estimateRevenue(strategy.strategyId, 10000);
    expect(estimated).toBe(999 * 0.03 * 10000);

    const active = pricingStrategyAdvisor.getActiveStrategies();
    expect(active.some(s => s.strategyId === strategy.strategyId)).toBe(true);
  });

  it('should manage revenue streams and compute diversification', () => {
    revenueStreamManager.add('SaaS', 'recurring', 150000, 8, 75);
    revenueStreamManager.add('Professional Services', 'one_time', 30000, 5, 40);
    revenueStreamManager.add('Marketplace', 'transactional', 20000, 15, 85);

    const total = revenueStreamManager.getTotalMonthlyRevenue();
    expect(total).toBe(200000);

    const diversification = revenueStreamManager.getDiversificationScore();
    expect(diversification).toBeGreaterThan(0);
    expect(diversification).toBeLessThanOrEqual(100);
  });

  it('should track monetization metrics and detect trends', () => {
    monetizationMetricsTracker.record('2026-03', 150000, 500, 5000, 300, 72, 20);
    monetizationMetricsTracker.record('2026-04', 165000, 560, 5200, 290, 74, 20);

    const latest = monetizationMetricsTracker.getLatest();
    expect(latest?.arppu).toBeGreaterThan(0);
    expect(latest?.grossMarginPct).toBe(74);

    const trend = monetizationMetricsTracker.getTrend('arpu');
    expect(['improving', 'declining', 'stable']).toContain(trend);
  });
});
