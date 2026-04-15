/**
 * Tests for Phase 299-304: Sales, Asset Lifecycle, Regulatory Reporting,
 * Workforce Analytics, Customer Onboarding, Vendor Performance
 */

import { describe, it, expect } from 'vitest';

// Phase 299: Sales Intelligence
import {
  salesPipelineManager, salesQuotaTracker,
  winLossAnalyzer, territoryPerformanceAnalyzer
} from '../sales-intelligence';

// Phase 300: Asset Lifecycle Intelligence
import {
  assetTracker, maintenanceScheduler,
  depreciationEngine, assetDisposalManager
} from '../asset-lifecycle-intelligence';

// Phase 301: Regulatory Reporting Intelligence
import {
  regulatoryFilingManager, regulatoryChangeMonitor,
  complianceReportGenerator, filingDeadlineAlertEngine
} from '../regulatory-reporting-intelligence';

// Phase 302: Workforce Analytics Intelligence
import {
  headcountPlanner, attritionAnalyzer,
  productivityBenchmarker, orgHealthAnalyzer
} from '../workforce-analytics-intelligence';

// Phase 303: Customer Onboarding Intelligence
import {
  onboardingTracker, adoptionMilestoneTracker,
  onboardingDropOffAnalyzer, onboardingEffectivenessTracker
} from '../customer-onboarding-intelligence';

// Phase 304: Vendor Performance Intelligence
import {
  vendorScorecardManager, vendorSLAMonitor,
  vendorRiskAnalyzer, vendorContractComplianceTracker
} from '../vendor-performance-intelligence';

// ─── Phase 299: Sales Intelligence ───────────────────────────────────────────

describe('Phase 299: Sales Intelligence', () => {
  it('manages pipeline opportunities and calculates weighted value', () => {
    const opp = salesPipelineManager.add('Acme Corp', 'John Smith', 'EMEA', 'proposal', 200000, 60, Date.now() + 30 * 86400000, 'Enterprise Suite');
    expect(opp.opportunityId).toMatch(/^opp-/);
    expect(opp.weightedValueUSD).toBe(120000); // 200k × 60%
    expect(opp.forecastCategory).toBe('best_case');

    salesPipelineManager.close(opp.opportunityId, true);
    expect(salesPipelineManager.getOpportunity(opp.opportunityId)?.status).toBe('won');
  });

  it('tracks quota attainment and identifies at-risk reps', () => {
    salesQuotaTracker.record('rep-001', 'Alice Johnson', 'EMEA', '2026-Q1', 500000, 420000, 800000);
    salesQuotaTracker.record('rep-002', 'Bob Williams', 'APAC', '2026-Q1', 400000, 180000, 300000);

    const teamAttainment = salesQuotaTracker.getTeamAttainment('2026-Q1');
    expect(teamAttainment).toBeCloseTo(66.67, 0);

    const atRisk = salesQuotaTracker.getAtRiskReps();
    expect(atRisk.some(r => r.repId === 'rep-002')).toBe(true);
  });

  it('analyzes win-loss rates and cycle times', () => {
    const wl = winLossAnalyzer.analyze('2026-Q1', 100, 42, 58, 150000, 80000, 45, 90,
      [{ reason: 'price', count: 25 }, { reason: 'features', count: 18 }],
      ['Strong ROI', 'Customer references']);
    expect(wl.recordId).toMatch(/^winloss-/);
    expect(wl.winRatePct).toBe(42);
    expect(wl.topLostReasons[0].reason).toBe('price');
  });

  it('benchmarks territory performance and ranks territories', () => {
    territoryPerformanceAnalyzer.analyze('EMEA', '2026-Q1', 2000000, 2500000, 85, 48, 3500000, 15, 1800000);
    territoryPerformanceAnalyzer.analyze('APAC', '2026-Q1', 1200000, 1000000, 45, 52, 2000000, 10, 1000000);

    const top = territoryPerformanceAnalyzer.getTopTerritories('2026-Q1', 1);
    expect(top[0].territory).toBe('APAC'); // 120% attainment vs 80%

    const underperforming = territoryPerformanceAnalyzer.getUnderperformingTerritories(85);
    expect(underperforming.some(t => t.territory === 'EMEA')).toBe(true);
  });
});

// ─── Phase 300: Asset Lifecycle Intelligence ──────────────────────────────────

describe('Phase 300: Asset Lifecycle Intelligence', () => {
  it('registers asset and calculates depreciation', () => {
    const asset = assetTracker.register('Laptop Fleet', 'hardware', 'Dell', 'XPS 15', 'SN-12345', 'HQ', 'IT', Date.now() - 365 * 86400000, 2000, 200, 4, 'straight_line');
    expect(asset.assetId).toMatch(/^asset-/);
    expect(asset.assetTag).toMatch(/^AST-/);
    expect(asset.annualDepreciationUSD).toBe(450); // (2000-200)/4
    expect(asset.status).toBe('active');
  });

  it('schedules and completes maintenance', () => {
    const asset = assetTracker.register('Server Rack', 'hardware', 'HP', 'ProLiant', 'SN-99999', 'DC', 'IT', Date.now() - 500 * 86400000, 50000, 5000, 7, 'straight_line');
    const maint = maintenanceScheduler.schedule(asset.assetId, 'preventive', Date.now() + 7 * 86400000, 'Tech Team', 'Quarterly PM', 1500);
    expect(maint.maintenanceId).toMatch(/^maint-/);
    expect(maint.status).toBe('scheduled');

    maintenanceScheduler.complete(maint.maintenanceId, 4, 1200, ['Filter', 'Thermal paste'], Date.now() + 90 * 86400000);
    expect(maintenanceScheduler.getTotalMaintenanceCost()).toBe(1200);
  });

  it('calculates quarterly depreciation charge', () => {
    const asset = assetTracker.register('Office Furniture', 'furniture', 'IKEA', 'Mixed', 'SN-FURN', 'HQ', 'Admin', Date.now() - 90 * 86400000, 10000, 1000, 10, 'straight_line');
    const depr = depreciationEngine.calculate(asset.assetId, '2026-Q1', 9100, 10000, 900, 900);
    expect(depr.recordId).toMatch(/^depr-/);
    expect(depr.depreciationChargeUSD).toBe(225); // 900/4 quarterly
    expect(depr.closingValueUSD).toBe(8875);
  });

  it('disposes asset and records gain/loss', () => {
    const asset = assetTracker.register('Old Copier', 'other', 'Canon', 'iR2500', 'SN-COPY', 'HQ', 'Admin', Date.now() - 1095 * 86400000, 5000, 500, 5, 'straight_line');
    const disposal = assetDisposalManager.dispose(asset.assetId, 'sale', 800, 500, 'CFO', 'Sold to secondary market');
    expect(disposal.disposalId).toMatch(/^disposal-/);
    expect(disposal.gainLossUSD).toBe(300); // 800 - 500
    expect(assetDisposalManager.getTotalGainLoss()).toBeGreaterThan(0);
  });
});

// ─── Phase 301: Regulatory Reporting Intelligence ────────────────────────────

describe('Phase 301: Regulatory Reporting Intelligence', () => {
  it('registers filing and detects overdue status', () => {
    const overdueFiling = regulatoryFilingManager.register('VAT Return Q4', 'Tax Authority', 'TR', 'quarterly', 'tax', Date.now() - 5 * 86400000, 'Finance', 50000, 0, ['VAT ledger', 'Invoices'], true);
    expect(overdueFiling.filingId).toMatch(/^filing-/);
    expect(overdueFiling.status).toBe('overdue');

    const overdue = regulatoryFilingManager.getOverdueFilings();
    expect(overdue.some(f => f.filingName === 'VAT Return Q4')).toBe(true);
    expect(regulatoryFilingManager.getTotalPotentialPenalties()).toBeGreaterThan(0);
  });

  it('tracks regulatory changes and estimates compliance cost', () => {
    const change = regulatoryChangeMonitor.track('GDPR Authority', 'EU', 'New data retention rules', Date.now() + 180 * 86400000, 'high', ['IT', 'Legal', 'Data Ops'], Date.now() + 90 * 86400000, 75000, ['Audit data stores', 'Update retention policy']);
    expect(change.changeId).toMatch(/^regchange-/);
    expect(change.impactLevel).toBe('high');

    const high = regulatoryChangeMonitor.getHighImpactChanges();
    expect(high.length).toBeGreaterThan(0);
    expect(regulatoryChangeMonitor.getTotalComplianceCost()).toBeGreaterThan(0);
  });

  it('generates compliance report with on-time rate', () => {
    const filing1 = regulatoryFilingManager.register('Annual Report', 'SEC', 'US', 'annual', 'securities', Date.now() + 60 * 86400000, 'Legal', 100000, 5000, ['FS', '10-K'], false);
    regulatoryFilingManager.submit(filing1.filingId);
    regulatoryFilingManager.accept(filing1.filingId);

    const allFilings = regulatoryFilingManager.getAll();
    const report = complianceReportGenerator.generate('2026-Q1', allFilings);
    expect(report.reportId).toMatch(/^comprep-/);
    expect(report.totalFilings).toBeGreaterThan(0);
    expect(report.overallComplianceScore).toBeGreaterThanOrEqual(0);
  });

  it('generates deadline alerts for upcoming filings', () => {
    regulatoryFilingManager.register('KVKK Report', 'BTK', 'TR', 'annual', 'data_privacy', Date.now() + 10 * 86400000, 'Legal', 25000, 0, ['Privacy policy', 'Data map'], true);

    const allFilings = regulatoryFilingManager.getAll();
    const alerts = filingDeadlineAlertEngine.generateAlerts(allFilings);
    expect(alerts.length).toBeGreaterThan(0);

    const critical = filingDeadlineAlertEngine.getCriticalAlerts();
    // overdue filing from earlier test has negative days — filtered out; KVKK is 10d = warning
    expect(alerts.some(a => a.alertLevel === 'warning')).toBe(true);
  });
});

// ─── Phase 302: Workforce Analytics Intelligence ──────────────────────────────

describe('Phase 302: Workforce Analytics Intelligence', () => {
  it('records headcount and detects plan variance', () => {
    const hc = headcountPlanner.record('2026-Q1', 'Engineering', 'Istanbul', 'R&D', 100, 8, 5, 2, 110, 95, 12, 5);
    expect(hc.recordId).toMatch(/^hc-/);
    expect(hc.closingHeadcount).toBe(105); // 100+8-5+2
    expect(hc.varianceVsPlan).toBe(-5);   // 105-110

    const overVariance = headcountPlanner.getDepartmentsByVariance(3);
    expect(overVariance.length).toBeGreaterThan(0);
  });

  it('analyzes attrition and calculates replacement cost', () => {
    const attr = attritionAnalyzer.analyze('2026-Q1', 'Sales', 200, 30, 24, 6, 2.5,
      [{ reason: 'compensation', count: 10 }, { reason: 'career growth', count: 8 }],
      15000, 35);
    expect(attr.recordId).toMatch(/^attr-/);
    expect(attr.attritionRatePct).toBe(15);  // 30/200 × 100
    expect(attr.replacementCostUSD).toBe(450000); // 30 × 15k

    const highAttr = attritionAnalyzer.getHighAttritionDepts(10);
    expect(highAttr.some(a => a.department === 'Sales')).toBe(true);
  });

  it('benchmarks department productivity', () => {
    const prod = productivityBenchmarker.benchmark('2026-Q1', 'Engineering', 250000, 120, 45, 3.5, 2.5, 40, 4.2, 78);
    expect(prod.recordId).toMatch(/^prod-/);
    expect(prod.productivityIndex).toBeGreaterThan(0);
    expect(prod.productivityIndex).toBeLessThanOrEqual(100);

    const top = productivityBenchmarker.getTopProductiveDepts(1);
    expect(top[0].department).toBe('Engineering');
  });

  it('assesses org health composite score', () => {
    const health = orgHealthAnalyzer.assess('2026-Q1', 7.2, 5, 12, 18, 68, 72, 65, 22, 74);
    expect(health.recordId).toMatch(/^orghealth-/);
    expect(health.overallOrgHealthScore).toBeGreaterThan(0);
    expect(health.overallOrgHealthScore).toBeLessThanOrEqual(100);

    const trend = orgHealthAnalyzer.getHealthTrend();
    expect(trend.length).toBeGreaterThan(0);
  });
});

// ─── Phase 303: Customer Onboarding Intelligence ─────────────────────────────

describe('Phase 303: Customer Onboarding Intelligence', () => {
  it('initiates onboarding and tracks step completion', () => {
    const onb = onboardingTracker.initiate('cust-001', 'TechCorp', 'enterprise', 'Enterprise', 'CSM-1', 'enterprise-template', 10, 45, 30, 120000);
    expect(onb.onboardingId).toMatch(/^onboard-/);
    expect(onb.status).toBe('not_started');

    onboardingTracker.progressStep(onb.onboardingId, 7, 85);
    const updated = onboardingTracker.getOnboarding(onb.onboardingId);
    expect(updated?.completionPct).toBe(70);
    expect(updated?.isAtRisk).toBe(false);
  });

  it('identifies at-risk onboardings with low health scores', () => {
    const onb = onboardingTracker.initiate('cust-002', 'RiskyStartup', 'smb', 'Starter', 'CSM-2', 'smb-template', 8, 30, 14, 12000);
    onboardingTracker.progressStep(onb.onboardingId, 1, 45); // health < 60 → at risk

    const atRisk = onboardingTracker.getAtRiskOnboardings();
    expect(atRisk.some(o => o.customerId === 'cust-002')).toBe(true);
  });

  it('tracks adoption milestones and measures on-time rate', () => {
    const onb = onboardingTracker.initiate('cust-003', 'MegaEnterprise', 'enterprise', 'Enterprise', 'CSM-3', 'enterprise-template', 12, 60, 45, 500000);
    const ms = adoptionMilestoneTracker.add('cust-003', onb.onboardingId, 'Go Live', 'go_live', Date.now() + 30 * 86400000, 30, []);
    expect(ms.milestoneId).toMatch(/^milestone-/);

    adoptionMilestoneTracker.achieve(ms.milestoneId, 'cust-003');
    expect(adoptionMilestoneTracker.getOnTimeAchievementRate()).toBe(100);
  });

  it('analyzes drop-off patterns and effectiveness tracking', () => {
    const onb1 = onboardingTracker.initiate('cust-004', 'StableInc', 'mid_market', 'Pro', 'CSM-4', 'pro-template', 8, 30, 21, 40000);
    onboardingTracker.progressStep(onb1.onboardingId, 8, 92); // completed
    const onb2 = onboardingTracker.initiate('cust-005', 'SlowCorp', 'smb', 'Starter', 'CSM-5', 'smb-template', 6, 20, 14, 8000);
    onboardingTracker.progressStep(onb2.onboardingId, 1, 55); // at risk

    const report = onboardingDropOffAnalyzer.analyze('2026-Q1', [onb1, onb2]);
    expect(report.recordId).toMatch(/^dropoff-/);
    expect(report.totalStarted).toBe(2);
    expect(report.revenueAtRiskUSD).toBeGreaterThanOrEqual(0);

    const eff = onboardingEffectivenessTracker.track('2026-Q1', 'pro-template', 'mid_market', 88, 25, 92, 85, 94, 52);
    expect(eff.recordId).toMatch(/^onbeff-/);
    expect(onboardingEffectivenessTracker.getAvgNPS()).toBe(52);
  });
});

// ─── Phase 304: Vendor Performance Intelligence ───────────────────────────────

describe('Phase 304: Vendor Performance Intelligence', () => {
  it('scores vendor and assigns tier based on composite score', () => {
    const scorecard = vendorScorecardManager.score('ven-001', 'CloudProvider Inc', 'Cloud Services', '2026-Q1', 90, 88, 75, 92, 70, 95, 500000);
    expect(scorecard.scorecardId).toMatch(/^vsc-/);
    expect(scorecard.tier).toBe('strategic');    // overall ≥ 85
    expect(scorecard.recommendation).toBe('expand');

    const strategic = vendorScorecardManager.getStrategicVendors();
    expect(strategic.some(s => s.vendorId === 'ven-001')).toBe(true);
  });

  it('monitors SLA breaches and calculates penalties', () => {
    const sla = vendorSLAMonitor.measure('ven-001', 'CloudProvider Inc', 'Uptime SLA', 'availability', 99.9, 99.5, '2026-Q1', 'Automated monitoring', 10000);
    expect(sla.slaId).toMatch(/^sla-/);
    expect(sla.breached).toBe(true);
    expect(sla.penaltyAmountUSD).toBe(10000);

    expect(vendorSLAMonitor.getTotalPenalties('2026-Q1')).toBe(10000);
    expect(vendorSLAMonitor.getSLAComplianceByVendor('ven-001')).toBe(0); // 0/1 met
  });

  it('assesses vendor risks and identifies critical items', () => {
    const risk = vendorRiskAnalyzer.assess('ven-002', 'SingleSource Ltd', 'concentration', 'Only vendor for critical component', 4, 5, ['Dual-source qualification'], true);
    expect(risk.riskId).toMatch(/^vrisk-/);
    expect(risk.riskScore).toBe(20); // 4×5

    const critical = vendorRiskAnalyzer.getCriticalRisks(15);
    expect(critical.some(r => r.vendorId === 'ven-002')).toBe(true);

    const concentration = vendorRiskAnalyzer.getConcentrationRisks();
    expect(concentration.length).toBeGreaterThan(0);
  });

  it('tracks contract compliance and renewal recommendations', () => {
    const compliance = vendorContractComplianceTracker.track('ven-001', 'CloudProvider Inc', 'CON-2024-001', '2026-Q1', 20, 19, 1, 5000, 0, ['Minor delivery delay']);
    expect(compliance.recordId).toMatch(/^vcc-/);
    expect(compliance.complianceRatePct).toBe(95);
    expect(compliance.renewalRecommendation).toBe(false); // breached > 0

    const lowCompliance = vendorContractComplianceTracker.getLowComplianceVendors(98);
    expect(lowCompliance.some(c => c.vendorId === 'ven-001')).toBe(true);
  });
});
