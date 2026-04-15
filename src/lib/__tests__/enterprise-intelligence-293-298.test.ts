/**
 * Tests for Phase 293-298: Procurement, Credit, Trade Compliance, Innovation Lab, D&I, Enterprise Architecture
 */

import { describe, it, expect } from 'vitest';

// Phase 293: Procurement Intelligence
import {
  procurementSpendAnalyzer, supplierNegotiationTracker,
  procurementContractManager, procurementSavingsTracker
} from '../procurement-intelligence';

// Phase 294: Customer Credit Intelligence
import {
  creditProfileManager, creditExposureAnalyzer,
  collectionsManager, creditRiskForecaster
} from '../customer-credit-intelligence';

// Phase 295: Trade Compliance Intelligence
import {
  tradeComplianceScreener, exportControlManager,
  customsAnalyticsEngine, tradeRiskMonitor
} from '../trade-compliance-intelligence';

// Phase 296: Innovation Lab Intelligence
import {
  experimentTracker, prototypeManager,
  ideationFunnelAnalyzer, labROICalculator
} from '../innovation-lab-intelligence';

// Phase 297: D&I Intelligence
import {
  representationAnalyzer, payEquityAnalyzer,
  inclusionSentimentTracker, diHiringPipelineTracker
} from '../diversity-inclusion-intelligence';

// Phase 298: Enterprise Architecture Intelligence
import {
  applicationPortfolioManager, technicalDebtTracker,
  architectureComplianceAnalyzer, capabilityMapper
} from '../enterprise-architecture-intelligence';

// ─── Phase 293: Procurement ───────────────────────────────────────────────────

describe('Phase 293: Procurement Intelligence', () => {
  it('records procurement spend and calculates maverick rate', () => {
    const record = procurementSpendAnalyzer.record('2026-Q1', 'IT Services', 'sup-001', 'TechVendor', 25, 500000, 400000, 20000, 480000);
    expect(record.recordId).toMatch(/^procspend-/);
    expect(record.maverickSpend).toBe(100000);
    expect(record.maverickPct).toBe(20);

    const highMaverick = procurementSpendAnalyzer.getHighMaverickCategories(15);
    expect(highMaverick.length).toBeGreaterThan(0);
  });

  it('tracks supplier negotiation and savings achievement', () => {
    const neg = supplierNegotiationTracker.initiate('sup-002', 'CloudPro', 'Cloud Services', 'renewal', 1200000, 12);
    expect(neg.negotiationId).toMatch(/^neg-/);
    expect(neg.status).toBe('planning');

    supplierNegotiationTracker.complete(neg.negotiationId, 9.5, 45, ['Volume discount', 'Extended support']);
    expect(supplierNegotiationTracker.getTotalSavings()).toBe(114000); // 1.2M × 9.5%
    expect(supplierNegotiationTracker.getAvgAchievementVsTarget()).toBeCloseTo(79.17, 1);
  });

  it('manages procurement contracts and monitors performance', () => {
    const contract = procurementContractManager.create('sup-003', 'HardwareCo', 'Hardware', 800000, Date.now() - 86400000, Date.now() + 20 * 86400000, 30, ['99% delivery SLA', 'replacement within 24h'], false);
    expect(contract.contractId).toMatch(/^proccon-/);
    expect(contract.status).toBe('expiring');

    procurementContractManager.updatePerformance(contract.contractId, 60, 88, 62);
    const lowPerf = procurementContractManager.getLowPerformanceContracts(65);
    expect(lowPerf.length).toBeGreaterThan(0);
  });

  it('tracks procurement savings vs target', () => {
    const savings = procurementSavingsTracker.record('2026-Q1', 10000000, 300000, 80000, 50000, 500000);
    expect(savings.recordId).toMatch(/^procsav-/);
    expect(savings.totalSavings).toBe(430000);
    expect(savings.savingsAsSpendPct).toBe(4.3);
    expect(savings.achievementVsTargetPct).toBe(86);
  });
});

// ─── Phase 294: Customer Credit ───────────────────────────────────────────────

describe('Phase 294: Customer Credit Intelligence', () => {
  it('evaluates customer credit profile and assigns risk grade', () => {
    const profile = creditProfileManager.evaluate('cust-001', 'Acme Corp', 92, 35, 85, 500000, 200000);
    expect(profile.profileId).toMatch(/^credit-/);
    expect(profile.riskGrade).toBe('AAA');
    expect(profile.utilizationRatePct).toBe(40);
    expect(profile.riskCategory).toBe('low');
  });

  it('identifies high-risk and over-limit customers', () => {
    creditProfileManager.evaluate('cust-002', 'RiskyInc', 30, 90, 20, 100000, 120000);
    const highRisk = creditProfileManager.getHighRiskCustomers();
    expect(highRisk.length).toBeGreaterThan(0);

    const overLimit = creditProfileManager.getOverLimitCustomers();
    expect(overLimit.some(p => p.customerId === 'cust-002')).toBe(true);
  });

  it('analyzes portfolio credit exposure with ECL', () => {
    const profiles = ['cust-001', 'cust-002'].map(id => creditProfileManager.getProfile(id)!).filter(Boolean);
    const exposure = creditExposureAnalyzer.analyze('2026-Q1', profiles, 50000);
    expect(exposure.recordId).toMatch(/^credexp-/);
    expect(exposure.expectedCreditLosses).toBeGreaterThan(0);
    expect(exposure.overdueRatePct).toBeGreaterThan(0);
  });

  it('manages collections aging buckets', () => {
    const invoice = collectionsManager.register('cust-002', 'inv-001', 50000, Date.now() - 45 * 86400000);
    expect(invoice.recordId).toMatch(/^collect-/);
    expect(invoice.agingBucket).toBe('31-60');

    collectionsManager.recordPayment('inv-001', 30000);
    expect(collectionsManager.getTotalOverdue()).toBeGreaterThan(0);

    const buckets = collectionsManager.getAgingBuckets();
    expect(buckets['31-60']).toBeGreaterThan(0);
  });
});

// ─── Phase 295: Trade Compliance ─────────────────────────────────────────────

describe('Phase 295: Trade Compliance Intelligence', () => {
  it('screens transactions and clears clean entities', () => {
    const check = tradeComplianceScreener.screen('txn-001', 'sanctions_screening', 'Legitimate Corp', 'customer', ['OFAC', 'EU Sanctions', 'UN List']);
    expect(check.checkId).toMatch(/^tcheck-/);
    expect(check.result).toBe('clear');
    expect(check.reviewRequired).toBe(false);
  });

  it('classifies export-controlled products', () => {
    const product = exportControlManager.classify('prod-001', 'Advanced Radar Module', 'EAR99', '8526.10.00', ['DE', 'FR', 'UK'], ['RU', 'KP', 'IR'], true, true, 2000000);
    expect(product.productId).toBe('prod-001');
    expect(product.licenseRequired).toBe(true);

    const highRisk = exportControlManager.getHighRiskProducts();
    expect(highRisk.length).toBeGreaterThan(0);
    expect(exportControlManager.getTotalExportValue()).toBeGreaterThan(0);
  });

  it('processes customs filing and calculates duty rate', () => {
    const customs = customsAnalyticsEngine.file('ship-001', 'import', 'CN', 'TR', '8471.30.00', 100000, 4500, 'GlobalBrokers');
    expect(customs.customsId).toMatch(/^customs-/);
    expect(customs.effectiveDutyRatePct).toBe(4.5);

    customsAnalyticsEngine.clear('ship-001', 18, false, 0);
    expect(customsAnalyticsEngine.getAvgClearanceTime()).toBe(18);
    expect(customsAnalyticsEngine.getTotalDuties()).toBe(4500);
  });

  it('assesses overall trade risk score', () => {
    const risk = tradeRiskMonitor.assess('2026-Q1', 5000, 2, 0, 1, 0, 50000, 200000, ['RU', 'KP']);
    expect(risk.recordId).toMatch(/^traderisk-/);
    expect(risk.overallRiskScore).toBeGreaterThan(0);
    expect(risk.topRiskCountries).toContain('RU');
  });
});

// ─── Phase 296: Innovation Lab ────────────────────────────────────────────────

describe('Phase 296: Innovation Lab Intelligence', () => {
  it('creates experiment and records result', () => {
    const exp = experimentTracker.create('AI Customer Triage', 'AI can reduce support tickets by 30%', 'technology', 'AI Lab', 100000, Date.now() + 90 * 86400000, ['30% ticket reduction', 'CSAT maintained'], 'tickets_per_day', 200, 140);
    expect(exp.experimentId).toMatch(/^exp-/);
    expect(exp.status).toBe('planning');

    experimentTracker.recordResult(exp.experimentId, 145, 'success', ['AI effective for tier-1 tickets'], ['Scale to all regions']);
    expect(experimentTracker.getSuccessRate()).toBe(100);
  });

  it('builds prototype and checks MVP readiness', () => {
    const exp = experimentTracker.create('Self-service Portal', 'Portal reduces call volume', 'ux', 'UX Lab', 50000, Date.now() + 60 * 86400000, ['20% call reduction'], 'calls_per_day', 500, 400);
    const proto = prototypeManager.build(exp.experimentId, 'Portal v1', '1.0', 'high', 14, 50, 78, 75, 4);
    expect(proto.prototypeId).toMatch(/^proto-/);
    expect(proto.advancedToMVP).toBe(true);

    const mvpReady = prototypeManager.getMVPReadyPrototypes();
    expect(mvpReady.length).toBeGreaterThan(0);
  });

  it('analyzes ideation funnel conversion', () => {
    const funnel = ideationFunnelAnalyzer.analyze('2026-Q1', 200, 180, 40, 25, 18, 8, 4, 120);
    expect(funnel.recordId).toMatch(/^funnel-/);
    expect(funnel.funnelConversionPct).toBe(2);
    expect(funnel.productionDeployed).toBe(4);
  });

  it('calculates lab ROI', () => {
    const roi = labROICalculator.calculate('2026-Q1', 500000, 25, 12, 1200000, 300000, 180);
    expect(roi.recordId).toMatch(/^labroi-/);
    expect(roi.successRatePct).toBe(48);
    expect(roi.roiPct).toBe(200); // (1.5M - 500k) / 500k × 100
    expect(roi.avgExperimentCost).toBe(20000);
  });
});

// ─── Phase 297: D&I Intelligence ─────────────────────────────────────────────

describe('Phase 297: Workforce Diversity & Inclusion Intelligence', () => {
  it('records representation and identifies benchmark gaps', () => {
    const rec = representationAnalyzer.record('2026-Q1', 'gender', 'c_suite', 'Women', 3, 15, 40, 15);
    expect(rec.recordId).toMatch(/^divrep-/);
    expect(rec.representationPct).toBe(20);
    expect(rec.gapToBenchmark).toBe(-20); // 20 - 40

    const gaps = representationAnalyzer.getGaps('gender');
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].gapToBenchmark).toBeLessThan(-5);
  });

  it('analyzes pay equity and identifies significant gaps', () => {
    const equity = payEquityAnalyzer.analyze('2026-Q1', 'women_vs_men_engineering', 'gender', -18, -5.2, 450, true, ['Role-band salary review', 'Promotion rate analysis'], 250000);
    expect(equity.recordId).toMatch(/^payequity-/);
    expect(equity.status).toBe('remediating');
    expect(equity.statSignificant).toBe(true);

    const gaps = payEquityAnalyzer.getActiveGaps();
    expect(gaps.length).toBeGreaterThan(0);
    expect(payEquityAnalyzer.getTotalRemediationBudget()).toBe(250000);
  });

  it('surveys inclusion sentiment and identifies weak dimension', () => {
    const survey = inclusionSentimentTracker.survey('2026-Q1', 72, 76, 68, 82, 62, 70, ['Career advancement barriers', 'Manager bias'], 70);
    expect(survey.recordId).toMatch(/^inclsent-/);
    expect(survey.overallInclusionScore).toBeCloseTo(71.6, 1);

    const weakest = inclusionSentimentTracker.getWeakestDimension();
    expect(weakest).toBe('psychological_safety');
  });

  it('tracks diverse hiring pipeline metrics', () => {
    const pipeline = diHiringPipelineTracker.track('2026-Q1', 2000, 900, 300, 80, 55, { linkedin: 400, referrals: 200, job_boards: 300 });
    expect(pipeline.recordId).toMatch(/^dihire-/);
    expect(pipeline.diverseApplicationRatePct).toBe(45);
    expect(pipeline.diverseHireRatePct).toBe(2.75);

    const topChannels = diHiringPipelineTracker.getTopSourcingChannels(3);
    expect(topChannels[0].channel).toBe('linkedin');
  });
});

// ─── Phase 298: Enterprise Architecture ──────────────────────────────────────

describe('Phase 298: Enterprise Architecture Intelligence', () => {
  it('registers application and assesses health', () => {
    const app = applicationPortfolioManager.register('ERP System', 'legacy', 'Finance', 'IT Ops', 'SAP ECC', 'on_premise', 500, 'mission_critical', 400000);
    expect(app.applicationId).toMatch(/^app-/);
    expect(app.retirementRecommendation).toBe(true); // legacy type

    applicationPortfolioManager.updateHealth(app.applicationId, 35, 80);
    const updated = applicationPortfolioManager.getApplication(app.applicationId);
    expect(updated?.technicalHealthScore).toBe(35);
    expect(updated?.retirementRecommendation).toBe(false); // bizValue is high (80)
  });

  it('tracks technical debt and identifies critical items', () => {
    const app = applicationPortfolioManager.register('Billing API', 'core', 'Finance', 'Dev Team', 'Java 8', 'on_premise', 200, 'high', 150000);
    const debt = technicalDebtTracker.register(app.applicationId, 'security', 'critical', 'Outdated TLS 1.0 still enabled', 5, 30000, 'PCI DSS non-compliance risk', 'Regulatory fine if not resolved');
    expect(debt.debtId).toMatch(/^debt-/);
    expect(debt.severity).toBe('critical');

    const criticalDebts = technicalDebtTracker.getCriticalDebts();
    expect(criticalDebts.length).toBeGreaterThan(0);
    expect(technicalDebtTracker.getTotalDebtCost()).toBeGreaterThan(0);
  });

  it('audits architecture compliance and maturity', () => {
    const audit = architectureComplianceAnalyzer.audit('2026-Q1', 50, 38, 88, 72, 65, 40, 78, 60);
    expect(audit.recordId).toMatch(/^archcomp-/);
    expect(audit.complianceRatePct).toBe(76);
    expect(audit.overallMaturityScore).toBeCloseTo(70.5, 1); // 88×0.25+72×0.2+65×0.2+40×0.15+78×0.15+60×0.05

    const trend = architectureComplianceAnalyzer.getMaturityTrend();
    expect(trend.length).toBeGreaterThan(0);
  });

  it('maps business capabilities and identifies gaps', () => {
    const cap1 = capabilityMapper.map('Customer Data Management', 'CRM', 2, 4, ['app-001', 'app-002'], 500000, 'high', ['CDP implementation', 'Data governance']);
    const cap2 = capabilityMapper.map('Order Fulfillment', 'Supply Chain', 3, 4, ['app-003'], 300000, 'medium', ['OMS upgrade']);
    expect(cap1.capabilityId).toMatch(/^cap-/);
    expect(cap1.gapToTarget).toBe(2);

    const gaps = capabilityMapper.getCapabilityGaps(1);
    expect(gaps.length).toBe(2);
    expect(gaps[0].gapToTarget).toBeGreaterThanOrEqual(gaps[1].gapToTarget);

    const highImportanceLow = capabilityMapper.getHighImportanceLowMaturity();
    expect(highImportanceLow.length).toBeGreaterThan(0); // Customer Data Mgmt: high importance, maturity=2
  });
});
