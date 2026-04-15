/**
 * Tests for Phase 263-268: Knowledge Mgmt, Supply Network, Pricing, Retention, Scheduling, CPM
 */

import { describe, it, expect } from 'vitest';

// Phase 263: Knowledge Management Intelligence
import { knowledgeAssetManager, expertiseMappingEngine, knowledgeGapAnalyzer, knowledgeReuseAnalyzer } from '../knowledge-management-intelligence';

// Phase 264: Supply Network Intelligence
import { supplierNetworkMapper, supplyChainLinkTracker, disruptionSimulator, networkResilienceScorer } from '../supply-network-intelligence';

// Phase 265: Pricing Intelligence
import { competitivePriceMonitor, priceElasticityCalculator, dynamicPricingRuleEngine, marginOptimizer } from '../pricing-intelligence';

// Phase 266: Customer Retention Intelligence
import { churnPredictionEngine, retentionInterventionTracker, churnCohortAnalyzer, winBackCampaignManager } from '../customer-retention-intelligence';

// Phase 267: Workforce Scheduling Intelligence
import { demandForecastEngine, shiftScheduler, coverageAnalyzer, schedulingOptimizer } from '../workforce-scheduling-intelligence';

// Phase 268: Corporate Performance Management
import { balancedScorecardManager, kpiCascadeManager, strategyExecutionMonitor, performanceDashboardEngine } from '../corporate-performance-management';

describe('Phase 263: Knowledge Management Intelligence', () => {
  it('creates knowledge assets and tracks reuse', () => {
    const asset = knowledgeAssetManager.create('Incident Response Runbook', 'runbook', 'operations', ['alice'], ['incident', 'ops']);
    knowledgeAssetManager.publish(asset.assetId);
    knowledgeAssetManager.recordReuse(asset.assetId);
    knowledgeAssetManager.recordReuse(asset.assetId);
    expect(knowledgeAssetManager.getAsset(asset.assetId)?.reuseCount).toBe(2);
    expect(knowledgeAssetManager.getTopReused(1)[0].assetId).toBe(asset.assetId);
  });

  it('maps expertise and finds single points of failure', () => {
    const profile = expertiseMappingEngine.upsert('alice', 'kubernetes', [
      { skill: 'Kubernetes', level: 'expert', endorsements: 5 },
      { skill: 'Helm', level: 'proficient', endorsements: 3 }
    ], 10, 2);
    expect(profile.expertiseScore).toBeGreaterThan(0);
    const spof = expertiseMappingEngine.getSinglePointsOfFailure();
    // alice is the only kubernetes expert
    expect(spof.some(p => p.employeeId === 'alice')).toBe(true);
  });

  it('analyzes knowledge gaps and assigns urgency', () => {
    const report = knowledgeGapAnalyzer.analyze('Q2', 'security', ['Zero Trust', 'SBOM', 'Threat Modeling', 'SAST', 'DAST', 'Pen Testing'], ['Old GDPR Guide'], 5, 4, 10);
    expect(report.urgency).toBe('critical');   // > 5 critical gaps
    expect(report.coverageScore).toBe(40);     // 4/10 × 100
    expect(report.recommendedActions.length).toBeGreaterThan(0);
  });

  it('calculates knowledge reuse metrics and time saved', () => {
    const a1 = knowledgeAssetManager.create('API Design Guide', 'best_practice', 'engineering', ['bob'], ['api']);
    knowledgeAssetManager.publish(a1.assetId);
    knowledgeAssetManager.recordReuse(a1.assetId);
    knowledgeAssetManager.recordReuse(a1.assetId);
    knowledgeAssetManager.recordReuse(a1.assetId);
    const allAssets = knowledgeAssetManager.getByDomain('engineering');
    const metric = knowledgeReuseAnalyzer.calculate('Q2', allAssets, 4);
    expect(metric.estimatedTimeSavedHours).toBeGreaterThan(0);
    expect(metric.reuseRatePct).toBeGreaterThan(0);
  });
});

describe('Phase 264: Supply Network Intelligence', () => {
  it('maps supplier nodes and identifies high-risk ones', () => {
    const safe = supplierNetworkMapper.addNode('s1', 'SafeSupplier', 1, 'Germany', 'Electronics', 5000000, 70, 14, 92, 95);
    const risky = supplierNetworkMapper.addNode('s2', 'RiskySupplier', 1, 'Conflict Zone', 'Metals', 2000000, 98, 60, 40, 35);
    expect(safe.riskScore).toBeLessThan(risky.riskScore);
    const highRisk = supplierNetworkMapper.getHighRisk(50);
    expect(highRisk.some(n => n.supplierId === 's2')).toBe(true);
  });

  it('tracks supply chain links and detects vulnerable ones', () => {
    const n1 = supplierNetworkMapper.addNode('s3', 'UniqueSupplier', 2, 'Taiwan', 'Chips', 1000000, 95, 90, 75, 70);
    const link = supplyChainLinkTracker.add(n1.nodeId, 'factory-1', 'Semiconductors', 500000, true, false, 90);
    expect(link.singleSourceRisk).toBe(true);
    expect(supplyChainLinkTracker.getVulnerableLinks().some(l => l.linkId === link.linkId)).toBe(true);
    expect(supplyChainLinkTracker.getCriticalPathLinks().some(l => l.linkId === link.linkId)).toBe(true);
  });

  it('simulates disruptions and finds worst case', () => {
    const s1 = disruptionSimulator.create('Taiwan Earthquake', 'natural_disaster', ['node-1'], 15, 90, 50000000, ['Alternate sourcing from South Korea']);
    const s2 = disruptionSimulator.create('Minor Logistics Delay', 'logistics', ['node-2'], 60, 5, 100000, ['Safety stock']);
    const worst = disruptionSimulator.getWorstCase();
    expect(worst?.scenarioId).toBe(s1.scenarioId);
    expect(s1.residualRiskAfterMitigation).toBeLessThan(s1.probabilityPct);
  });

  it('scores network resilience and detects trend', () => {
    networkResilienceScorer.score('Q1', 50, 40, 70, 60, 5);
    networkResilienceScorer.score('Q2', 65, 60, 80, 70, 3);
    expect(networkResilienceScorer.getTrend()).toBe('improving');
    expect(networkResilienceScorer.getLatest()!.vulnerableLinks).toBe(3);
  });
});

describe('Phase 265: Pricing Intelligence', () => {
  it('monitors competitive prices and classifies positioning', () => {
    const premium = competitivePriceMonitor.record('prod-1', 'Premium Widget', 150, { 'Competitor A': 100, 'Competitor B': 110 });
    const budget = competitivePriceMonitor.record('prod-2', 'Budget Widget', 60, { 'Competitor A': 100, 'Competitor B': 110 });
    expect(premium.pricePositioning).toBe('premium');
    expect(budget.pricePositioning).toBe('budget');
    const underpriced = competitivePriceMonitor.getUnderpricedProducts(70);
    expect(underpriced.some(p => p.productId === 'prod-2')).toBe(true);
  });

  it('calculates price elasticity and recommends direction', () => {
    const elastic = priceElasticityCalculator.calculate('prod-3', 10, -20);   // 10% up → 20% down
    const inelastic = priceElasticityCalculator.calculate('prod-4', 10, -3);  // 10% up → 3% down
    expect(elastic.interpretation).toBe('elastic');
    expect(elastic.optimalPriceDirection).toBe('decrease');
    expect(inelastic.interpretation).toBe('inelastic');
    expect(inelastic.optimalPriceDirection).toBe('increase');
  });

  it('applies dynamic pricing rules within bounds', () => {
    const rule = dynamicPricingRuleEngine.create('Demand Surge', 'prod-5', 'demand_spike', 'demand > 2x avg', 20, 50, 200);
    const newPrice = dynamicPricingRuleEngine.applyRule(rule.ruleId, 100);
    expect(newPrice).toBe(120);   // 100 × 1.2
    expect(dynamicPricingRuleEngine.getMostActivated(1)[0].activationCount).toBe(1);
    // Test bounds
    const capped = dynamicPricingRuleEngine.applyRule(rule.ruleId, 180);  // 180 × 1.2 = 216 → capped at 200
    expect(capped).toBe(200);
  });

  it('optimizes margins and generates recommendations', () => {
    const report = marginOptimizer.analyze('Q2', 'prod-6', 60, 80, 40, 110);
    // suggestedPrice = 60 / (1 - 0.4) = 100; currentPrice = 80 → raise
    expect(report.suggestedPrice).toBeCloseTo(100, 0);
    expect(report.recommendation).toBe('raise_price');
    expect(marginOptimizer.getLowMargin(30).some(r => r.productId === 'prod-6')).toBe(true);
  });
});

describe('Phase 266: Customer Retention Intelligence', () => {
  it('predicts churn risk with correct signals and risk levels', () => {
    const risky = churnPredictionEngine.predict('cust-1', 'enterprise', 45, 5, 60, 4, 50000);
    const safe = churnPredictionEngine.predict('cust-2', 'smb', 2, 0, 0, 9, 5000);
    expect(risky.churnRisk).not.toBe('low');
    expect(safe.churnRisk).toBe('low');
    expect(risky.topChurnSignals.length).toBeGreaterThan(0);
    expect(churnPredictionEngine.getTotalRetentionValueAtRisk()).toBeGreaterThan(0);
  });

  it('tracks retention interventions and calculates success rate', () => {
    const inv = retentionInterventionTracker.create('cust-1', 'outreach_call', 'csm-alice', 'immediate');
    retentionInterventionTracker.resolve(inv.interventionId, 'retained', 50000);
    expect(retentionInterventionTracker.getSuccessRate()).toBe(100);
    expect(retentionInterventionTracker.getTotalRevenueRetained()).toBe(50000);
  });

  it('analyzes churn cohorts and finds best-retaining cohort', () => {
    churnCohortAnalyzer.analyze('2025-Q1', 1000, 850, 780, 720, 680, 5000);
    churnCohortAnalyzer.analyze('2025-Q2', 1200, 900, 800, 700, 580, 4500);
    const best = churnCohortAnalyzer.getBestRetainingCohort();
    expect(best?.cohortPeriod).toBe('2025-Q1');  // 68% vs 48.3%
    expect(best?.retention365DayPct).toBeCloseTo(68, 0);
  });

  it('runs win-back campaigns and calculates win-back rate', () => {
    const campaign = winBackCampaignManager.create('Q2 Win-Back', 'enterprise', ['c1', 'c2', 'c3'], 'discount', 20);
    winBackCampaignManager.updateResults(campaign.campaignId, 100, 30, 15, 750000);
    expect(campaign.winBackRatePct).toBe(15);
    expect(campaign.responseRatePct).toBe(30);
    expect(winBackCampaignManager.getTotalRevenueRecovered()).toBe(750000);
  });
});

describe('Phase 267: Workforce Scheduling Intelligence', () => {
  it('forecasts staffing demand from historical data', () => {
    const forecast = demandForecastEngine.forecast('support', '2026-05-15', '09:00-12:00', [100, 110, 90, 105, 95], ['tier-1-support']);
    expect(forecast.forecastedVolume).toBeGreaterThan(0);
    expect(forecast.requiredStaffCount).toBeGreaterThan(0);
    expect(forecast.confidencePct).toBeGreaterThanOrEqual(50);
  });

  it('assigns shifts and tracks overtime', () => {
    shiftScheduler.assign('emp-1', 'support', '2026-05-15', '08:00', '18:00', 'agent', ['tier-1']);  // 10h → 2h OT
    shiftScheduler.assign('emp-2', 'support', '2026-05-15', '09:00', '17:00', 'agent', ['tier-1']);  // 8h → 0h OT
    const daily = shiftScheduler.getDailyAssignments('support', '2026-05-15');
    expect(daily).toHaveLength(2);
    expect(daily[0].overtimeHours).toBe(2);
    expect(daily[1].overtimeHours).toBe(0);
    expect(shiftScheduler.getTotalOvertimeHours('support')).toBe(2);
  });

  it('analyzes coverage gaps and flags critical understaffing', () => {
    const report = coverageAnalyzer.analyze('support', 'Q2', 160, 200, 5, 1, [{ skill: 'tier-2-support', shortage: 4 }]);
    expect(report.coverageRatePct).toBe(80);
    expect(report.criticalGaps).toBe(true);  // skill shortage > 3
    expect(coverageAnalyzer.getCriticalGaps().some(r => r.reportId === report.reportId)).toBe(true);
  });

  it('optimizes scheduling and calculates cost savings', () => {
    const result = schedulingOptimizer.optimize('support', 'Q2', 75, 90, 40, 25);
    expect(result.coverageImprovement).toBe(15);
    expect(result.overtimeReductionHours).toBe(16);   // 40 × 0.4
    expect(result.costSavings).toBeGreaterThan(0);
    expect(schedulingOptimizer.getTotalCostSavings()).toBeGreaterThan(0);
  });
});

describe('Phase 268: Corporate Performance Management', () => {
  it('builds balanced scorecard and calculates overall score', () => {
    balancedScorecardManager.upsertPerspective('financial', [], 85, 40);
    balancedScorecardManager.upsertPerspective('customer', [], 78, 25);
    balancedScorecardManager.upsertPerspective('internal_process', [], 72, 20);
    balancedScorecardManager.upsertPerspective('learning_growth', [], 65, 15);
    const overall = balancedScorecardManager.getOverallScore();
    const expected = (85 * 40 + 78 * 25 + 72 * 20 + 65 * 15) / 100;
    expect(overall).toBeCloseTo(expected, 1);
    expect(balancedScorecardManager.getWeakestPerspective()?.name).toBe('learning_growth');
  });

  it('cascades KPIs to divisions and aggregates corporate actual', () => {
    const cascade = kpiCascadeManager.create('Revenue Growth %', 20, '%', 'average');
    kpiCascadeManager.addDivision(cascade.cascadeId, 'EMEA', 20, 22);   // achieved
    kpiCascadeManager.addDivision(cascade.cascadeId, 'APAC', 20, 14);   // at_risk
    const updated = kpiCascadeManager.getCascade(cascade.cascadeId);
    expect(updated?.corporateActual).toBe(18);   // avg(22, 14)
    expect(updated?.divisions.find(d => d.divisionName === 'EMEA')?.status).toBe('achieved');
    expect(updated?.divisions.find(d => d.divisionName === 'APAC')?.status).toBe('at_risk');
  });

  it('monitors strategy execution pulse and detects trend', () => {
    strategyExecutionMonitor.record('March', 8, 3, 2, 80, 70, ['Market volatility']);
    strategyExecutionMonitor.record('April', 10, 2, 1, 85, 78, ['Talent gap']);
    const latest = strategyExecutionMonitor.getLatest();
    expect(latest?.overallPulse).toBe('amber');   // 10/13 ≈ 77% but behind > 0
    expect(strategyExecutionMonitor.getTrend()).toBe('improving');
  });

  it('generates performance dashboard snapshots with unit rankings', () => {
    const snap = performanceDashboardEngine.snapshot('Q2', 88, 82, 75, 68, { 'NorthAmerica': 90, 'Europe': 75, 'APAC': 65 }, ['Customer NPS', 'Employee Retention']);
    const expectedOverall = 88 * 0.4 + 82 * 0.25 + 75 * 0.2 + 68 * 0.15;
    expect(snap.overallScorecardScore).toBeCloseTo(expectedOverall, 1);
    expect(snap.topPerformingUnit).toBe('NorthAmerica');
    expect(snap.bottomPerformingUnit).toBe('APAC');
    expect(snap.criticalKPIs).toHaveLength(2);
  });
});
