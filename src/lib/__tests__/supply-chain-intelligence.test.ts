/**
 * Advanced Supply Chain Intelligence (Phase 209-214)
 * Test suite for supplier risk, procurement analytics, carbon footprint,
 * supply chain resilience, cost optimization, and ESG compliance
 */

import { describe, it, expect } from 'vitest';
import {
  supplierProfileManager, riskScoreCalculator, supplierAuditTracker, riskMitigationManager,
  spendAnalyzer, procurementPerformanceTracker, contractUtilizationMonitor, savingsTracker,
  emissionTracker, carbonIntensityCalculator, scopeEmissionManager, carbonReductionPlanner,
  resilienceScoreCalculator, disruptionSimulator, alternativeSourceManager, recoveryTimeEstimator,
  costDriverAnalyzer, optimizationOpportunityFinder, tcoCalculator, costReductionTracker,
  esgScoreManager, supplierESGAssessor, esgReportGenerator, complianceFrameworkTracker
} from '../index';

// Phase 209: Supplier Risk Scoring
describe('Phase 209: Supplier Risk Scoring', () => {
  it('should register suppliers and identify critical ones', () => {
    const s1 = supplierProfileManager.register('Acme Parts', 'Germany', 'component', 1, 500000, 365);
    const s2 = supplierProfileManager.register('LogiServ', 'China', 'logistics', 2, 80000, 180);
    expect(s1.status).toBe('active');
    expect(s1.tier).toBe(1);

    const critical = supplierProfileManager.getCriticalSuppliers(200000);
    expect(critical.some(s => s.name === 'Acme Parts')).toBe(true);
    expect(critical.some(s => s.name === 'LogiServ')).toBe(false);
  });

  it('should calculate risk scores and identify high risk suppliers', () => {
    const s = supplierProfileManager.register('Risky Ltd', 'Myanmar', 'raw_material', 1, 200000);
    const score = riskScoreCalculator.calculate(s.supplierId, 70, 60, 85, 75, 80);
    expect(score.overallRisk).toBeGreaterThan(0);
    expect(['critical', 'high']).toContain(score.riskLevel);

    const highRisk = riskScoreCalculator.getHighRiskSuppliers();
    expect(highRisk.length).toBeGreaterThan(0);
    expect(riskScoreCalculator.getPortfolioRiskAvg()).toBeGreaterThan(0);
  });

  it('should schedule and complete supplier audits', () => {
    const s = supplierProfileManager.register('Audit Corp', 'USA', 'service', 1, 150000);
    const audit = supplierAuditTracker.schedule(s.supplierId, 'quality', 'auditor@company.com', 0);
    expect(audit.status).toBe('scheduled');

    supplierAuditTracker.complete(audit.auditId, 78, [
      { area: 'documentation', severity: 'minor', description: 'Missing sign-offs' }
    ]);
    const latest = supplierAuditTracker.getLatestAudit(s.supplierId);
    expect(latest?.score).toBe(78);
    expect(latest?.status).toBe('completed');
  });

  it('should create and track risk mitigations', () => {
    const s = supplierProfileManager.register('Mitigation Inc', 'Brazil', 'component', 2, 90000);
    const mitigation = riskMitigationManager.create(s.supplierId, 'geopoliticalRisk', 'Qualify alternative supplier', 'procurement@co.com', 60, 20);
    expect(mitigation.status).toBe('planned');

    riskMitigationManager.advance(mitigation.mitigationId, 'completed');
    const reduction = riskMitigationManager.getTotalExpectedReduction(s.supplierId);
    expect(reduction).toBe(20);
  });
});

// Phase 210: Procurement Analytics
describe('Phase 210: Procurement Analytics', () => {
  it('should record spend and analyze by category', () => {
    spendAnalyzer.record('supplier-A', 'IT Hardware', 50000, '2026-Q1', 'Engineering', 'PO-001');
    spendAnalyzer.record('supplier-B', 'Software', 30000, '2026-Q1', 'Engineering', 'PO-002');
    spendAnalyzer.record('supplier-A', 'IT Hardware', 20000, '2026-Q1', 'HR', 'PO-003');

    const total = spendAnalyzer.getTotalSpend('2026-Q1');
    expect(total).toBe(100000);

    const byCategory = spendAnalyzer.getSpendByCategory('2026-Q1');
    expect(byCategory['IT Hardware']).toBe(70000);

    const top = spendAnalyzer.getTopSuppliers('2026-Q1', 1);
    expect(top[0].supplierId).toBe('supplier-A');
  });

  it('should track procurement KPIs and compute trends', () => {
    procurementPerformanceTracker.record('2026-Q1', 100000, 85000, 12, 14, 92, 96, 8000);
    procurementPerformanceTracker.record('2026-Q2', 110000, 98000, 14, 12, 95, 97, 10000);

    const kpi = procurementPerformanceTracker.getKPI('2026-Q2');
    expect(kpi?.poComplianceRate).toBe(95);

    const trend = procurementPerformanceTracker.getTrend('poComplianceRate');
    expect(trend).toBe('improving');

    const maverick = procurementPerformanceTracker.getMaverickSpendRate('2026-Q1');
    expect(maverick).toBe(15); // (100000-85000)/100000 * 100
  });

  it('should track contract utilization and detect underuse', () => {
    const contract = contractUtilizationMonitor.track('contract-001', 'supplier-A', 100000, 30000, 180);
    expect(contract.status).toBe('underutilized');

    contractUtilizationMonitor.updateSpend('contract-001', 40000);
    const updated = contractUtilizationMonitor.getContract('contract-001');
    expect(updated?.utilizationRate).toBe(70);
    expect(updated?.status).toBe('on_track');
  });

  it('should record savings and compute rates', () => {
    savingsTracker.record('supplier-A', 'IT Hardware', 'negotiated', 50000, 42000, '2026-Q1');
    savingsTracker.record('supplier-B', 'Software', 'process_improvement', 30000, 28000, '2026-Q1');

    const total = savingsTracker.getTotalSavings('2026-Q1');
    expect(total).toBe(10000); // (50000-42000) + (30000-28000)

    const byType = savingsTracker.getSavingsByType('2026-Q1');
    expect(byType['negotiated']).toBe(8000);

    const rate = savingsTracker.getSavingsRate(100000, '2026-Q1');
    expect(rate).toBe(10);
  });
});

// Phase 211: Carbon Footprint Tracking
describe('Phase 211: Carbon Footprint Tracking', () => {
  it('should record emissions across scopes', () => {
    emissionTracker.record('facility-01', 'HQ Building', 1, 'stationary_combustion', 500, 'MWh', 0.233, '2026-Q1');
    emissionTracker.record('grid-01', 'Electricity', 2, 'purchased_electricity', 1000, 'MWh', 0.386, '2026-Q1');
    emissionTracker.record('supply-01', 'Supply Chain', 3, 'upstream_transport', 200, 'ton-km', 0.12, '2026-Q1');

    const scope1 = emissionTracker.getTotalEmissions('2026-Q1', 1);
    expect(scope1).toBeCloseTo(116.5, 0);

    const top = emissionTracker.getTopEmitters('2026-Q1', 2);
    expect(top.length).toBe(2);
    expect(top[0].co2Equivalent).toBeGreaterThan(top[1].co2Equivalent);
  });

  it('should calculate carbon intensity and detect trend', () => {
    const m1 = carbonIntensityCalculator.calculate('2026-Q1', 500, 5000000, 10000);
    const m2 = carbonIntensityCalculator.calculate('2026-Q2', 450, 5500000, 11000);

    expect(m1.intensityByRevenue).toBeCloseTo(100, 0); // 500 / (5M/1M)
    const trend = carbonIntensityCalculator.getIntensityTrend();
    expect(trend).toBe('improving'); // 450/5.5 < 500/5
  });

  it('should compile scope breakdown and compute year-over-year change', () => {
    const breakdown = scopeEmissionManager.compile('2026-Q1', emissionTracker);
    expect(breakdown.total).toBeGreaterThan(0);
    expect(breakdown.scope1Pct + breakdown.scope2Pct + breakdown.scope3Pct).toBeCloseTo(100, 0);

    const dominant = scopeEmissionManager.getLargestScope('2026-Q1');
    expect([1, 2, 3]).toContain(dominant);
  });

  it('should set carbon reduction targets and track progress', () => {
    const target = carbonReductionPlanner.setTarget('Net Zero 2030', '2025', 1000, '2030', 50);
    expect(target.targetEmissions).toBe(500);
    expect(target.progressPct).toBe(0);

    carbonReductionPlanner.updateProgress(target.targetId, 800);
    const updated = carbonReductionPlanner.getTarget(target.targetId);
    expect(updated?.progressPct).toBe(40); // (1000-800)/(1000-500) = 200/500 = 40%
  });
});

// Phase 212: Supply Chain Resilience
describe('Phase 212: Supply Chain Resilience', () => {
  it('should score resilience and identify critical nodes', () => {
    resilienceScoreCalculator.calculate('node-A', 'Taiwan Fab', 30, 3, 20, 60);
    resilienceScoreCalculator.calculate('node-B', 'EU Warehouse', 80, 15, 85, 90);

    const critical = resilienceScoreCalculator.getCriticalNodes();
    expect(critical.some(n => n.nodeId === 'node-A')).toBe(true);
    expect(critical.some(n => n.nodeId === 'node-B')).toBe(false);

    const avg = resilienceScoreCalculator.getPortfolioAvgScore();
    expect(avg).toBeGreaterThan(0);
  });

  it('should simulate disruptions and calculate expected loss', () => {
    const scenario = disruptionSimulator.createScenario(
      'Taiwan Fab Disruption', 'natural_disaster', 0.15, 'major',
      ['node-A'], 90, 5000000, ['dual_source', 'safety_stock']
    );
    expect(scenario.probability).toBe(0.15);

    const expectedLoss = disruptionSimulator.calculateExpectedLoss(scenario.scenarioId);
    expect(expectedLoss).toBe(750000); // 0.15 * 5M

    const highProb = disruptionSimulator.getHighProbabilityScenarios(0.1);
    expect(highProb.some(s => s.scenarioId === scenario.scenarioId)).toBe(true);
  });

  it('should register and qualify alternative sources', () => {
    const source = alternativeSourceManager.register('supplier-primary', 'supplier-alt', 'AltTech GmbH', 'component', 45, 8, 5000);
    expect(source.qualificationStatus).toBe('not_started');

    alternativeSourceManager.qualify(source.sourceId);
    const alternatives = alternativeSourceManager.getAlternatives('supplier-primary');
    expect(alternatives.length).toBe(1);
    expect(alternatives[0].qualificationStatus).toBe('qualified');
  });

  it('should estimate recovery times and compute mitigation benefit', () => {
    const scenario = disruptionSimulator.createScenario('Test', 'supplier_failure', 0.2, 'moderate', [], 30, 1000000, []);
    const estimate = recoveryTimeEstimator.estimate(scenario.scenarioId, 'node-A', 72, 24, 30, 10, 'medium');
    expect(estimate.mttrDays).toBe(30);

    const benefit = recoveryTimeEstimator.getMitigationBenefit(scenario.scenarioId, 'node-A');
    expect(benefit).toBe(20); // 30 - 10
  });
});

// Phase 213: Supply Chain Cost Optimization
describe('Phase 213: Supply Chain Cost Optimization', () => {
  it('should identify high-variance cost drivers', () => {
    costDriverAnalyzer.record('logistics', 'Air Freight', 50000, 30000, '2026-Q1');
    costDriverAnalyzer.record('inventory', 'Safety Stock', 20000, 18000, '2026-Q1');

    const highVariance = costDriverAnalyzer.getHighVarianceDrivers(10);
    expect(highVariance.length).toBeGreaterThan(0);
    expect(highVariance[0].variancePct).toBeGreaterThanOrEqual(10);

    const totalVariance = costDriverAnalyzer.getTotalVariance('2026-Q1');
    expect(totalVariance).toBe(22000);
  });

  it('should find optimization opportunities and quick wins', () => {
    const driver = costDriverAnalyzer.getHighVarianceDrivers()[0];
    const opp = optimizationOpportunityFinder.identify(driver.driverId, 'Switch to Sea Freight', 'renegotiate', 18000, 2000, 'low');
    expect(opp.paybackMonths).toBeLessThan(12);

    const quickWins = optimizationOpportunityFinder.getQuickWins(12);
    expect(quickWins.some(q => q.opportunityId === opp.opportunityId)).toBe(true);

    const total = optimizationOpportunityFinder.getTotalPotentialSavings();
    expect(total).toBeGreaterThan(0);
  });

  it('should calculate and compare TCO', () => {
    tcoCalculator.calculate('sup-A', 'item-x', 100, 20, 5, 8, 3, 2, 1000, '2026-Q1');
    tcoCalculator.calculate('sup-B', 'item-x', 90, 35, 3, 10, 12, 2, 1000, '2026-Q1');

    const comparison = tcoCalculator.compareTCO('sup-A', 'item-x', 'sup-B');
    expect(comparison).toBeDefined();
    expect(['sup-A', 'sup-B']).toContain(comparison?.preferred);
    // sup-A TCO = 138, sup-B TCO = 152 → sup-A wins
    expect(comparison?.preferred).toBe('sup-A');
  });

  it('should track cost reductions and compute achievement rate', () => {
    const opp = optimizationOpportunityFinder.getQuickWins()[0];
    const record = costReductionTracker.report(opp.opportunityId, '2026-Q1', 18000, 15000);
    expect(record.achievementRate).toBeCloseTo(83.3, 0);
    expect(record.status).toBe('on_track');

    const totalSavings = costReductionTracker.getTotalActualSavings('2026-Q1');
    expect(totalSavings).toBe(15000);
  });
});

// Phase 214: ESG Compliance
describe('Phase 214: ESG Compliance', () => {
  it('should assess ESG scores and determine ratings', () => {
    const score = esgScoreManager.assess('company-001', 'company', 75, 80, 85);
    expect(['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']).toContain(score.rating);
    expect(score.overallESG).toBeCloseTo(79.5, 0);
    expect(score.rating).toBe('A');

    const portfolio = esgScoreManager.getPortfolioAvg();
    expect(portfolio.overall).toBeGreaterThan(0);
  });

  it('should assess supplier ESG and flag non-compliant', () => {
    const compliant = supplierESGAssessor.assess('esg-sup-1', 80, 75, 85, 90, ['ISO14001', 'SA8000']);
    expect(compliant.status).toBe('compliant');

    const problematic = supplierESGAssessor.assess('esg-sup-2', 35, 40, 30, 60, []);
    expect(problematic.status).toBe('non_compliant');
    expect(problematic.redFlags.length).toBeGreaterThan(0);

    const nonCompliant = supplierESGAssessor.getNonCompliantSuppliers();
    expect(nonCompliant.some(a => a.supplierId === 'esg-sup-2')).toBe(true);
  });

  it('should generate ESG reports', () => {
    const report = esgReportGenerator.create('2026', 'GRI', {
      total_emissions_tco2e: 1250,
      renewable_energy_pct: 45,
      women_in_leadership_pct: 38
    });
    expect(report.status).toBe('draft');

    esgReportGenerator.recordTargets(report.reportId, ['emissions_reduction', 'diversity'], ['renewable_target']);
    const updated = esgReportGenerator.getReport(report.reportId);
    expect(updated?.targetsMet.length).toBe(2);
    expect(updated?.targetsMissed.length).toBe(1);
  });

  it('should track compliance framework requirements', () => {
    complianceFrameworkTracker.addRequirement('CSRD', 'climate', 'Disclose Scope 1, 2, 3 emissions', true, 90);
    complianceFrameworkTracker.addRequirement('CSRD', 'social', 'Report workforce diversity metrics', true, 90);

    const req = Array.from({ length: 0 }); // just get count
    const rate = complianceFrameworkTracker.getComplianceRate('CSRD');
    expect(rate).toBe(0); // none assessed yet

    const reqs = complianceFrameworkTracker['requirements'];
    const firstId = Array.from(reqs.keys())[0];
    complianceFrameworkTracker.updateStatus(firstId, 'compliant', ['emissions_report_2026.pdf']);

    const newRate = complianceFrameworkTracker.getComplianceRate('CSRD');
    expect(newRate).toBe(50); // 1 of 2 compliant
  });
});
