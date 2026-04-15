/**
 * Tests: Phase 233-238 — Advanced Financial Intelligence & Treasury Management
 */

import { describe, it, expect } from 'vitest';
import {
  cashPositionManager, liquidityManager, fundingOperationsManager, treasuryRiskAnalyzer,
  creditRiskScorer, marketRiskMeasurer, concentrationRiskAnalyzer, riskAdjustedReturnCalculator,
  portfolioManager, performanceAttributor, assetAllocationManager, rebalancingEngine,
  taxPositionManager, transferPricingAnalyzer, taxProvisionCalculator, taxRiskTracker,
  auditEngagementPlanner, auditFindingManager, controlTestingEngine, auditAnalyticsEngine,
  budgetManager, rollingForecastManager, varianceAnalyzer, financialScenarioModeler
} from '../index';

// Phase 233: Treasury Management
describe('Phase 233 — Treasury Management', () => {
  it('records cash position and calculates available balance', () => {
    const pos = cashPositionManager.record('acc-001', 'USD', 5000000, 200000, 500000);
    expect(pos.availableBalance).toBe(4800000);
    expect(cashPositionManager.getTotalBalance('USD')).toBeGreaterThanOrEqual(5000000);
  });

  it('forecasts liquidity and determines status', () => {
    const forecast = liquidityManager.forecast('2026-Q1', 5000000, 3000000, 4000000, 8000000, 3000000);
    expect(forecast.closingBalance).toBe(4000000);
    expect(forecast.liquidityRatio).toBeCloseTo(2.67, 1);
    expect(forecast.status).toBe('adequate');
  });

  it('creates and executes funding operation', () => {
    const maturity = Date.now() + 365 * 86400 * 1000;
    const op = fundingOperationsManager.create('short_term_borrowing', 1000000, 'USD', 4.5, maturity, 'Bank A');
    expect(op.status).toBe('proposed');
    fundingOperationsManager.approve(op.operationId);
    fundingOperationsManager.execute(op.operationId);
    const updated = op;
    expect(updated.status).toBe('executed');
    expect(fundingOperationsManager.getTotalDebt()).toBeGreaterThan(0);
  });

  it('records treasury risk and calculates hedge ratio', () => {
    const metric = treasuryRiskAnalyzer.record('fx', 5000000, 3500000, 250000, '2026-Q1');
    expect(metric.hedgeRatioPct).toBe(70);
    expect(metric.netExposure).toBe(1500000);
    expect(treasuryRiskAnalyzer.getTotalVaR95()).toBeGreaterThan(0);
  });
});

// Phase 234: Financial Risk Analytics
describe('Phase 234 — Financial Risk Analytics', () => {
  it('assesses credit risk and assigns rating grade', () => {
    const profile = creditRiskScorer.assess('cp-001', 'Acme Corp', 85, 0.02, 0.45, 2000000);
    expect(profile.riskGrade).toBe('AA');
    expect(profile.expectedLoss).toBeCloseTo(18000, 0);
    const highRisk = creditRiskScorer.getHighRisk('BB');
    expect(highRisk.every(p => ['BB', 'B', 'CCC', 'D'].includes(p.riskGrade))).toBe(true);
  });

  it('measures market risk with VaR and Sharpe ratio', () => {
    const measure = marketRiskMeasurer.measure('port-1', 'equities', 50000, 75000, 60000, 1.2, 1.8, 15, '2026-Q1');
    expect(measure.var95Daily).toBe(50000);
    expect(measure.sharpeRatio).toBe(1.8);
    expect(marketRiskMeasurer.getAvgSharpe()).toBeGreaterThan(0);
  });

  it('analyzes concentration risk and detects limit breaches', () => {
    const result = concentrationRiskAnalyzer.analyze('counterparty', [400, 200, 150, 100, 50, 100], 30, '2026-Q1');
    expect(result.topHoldingPct).toBeCloseTo(40, 0);
    expect(result.breachesLimit).toBe(true);
    expect(concentrationRiskAnalyzer.getBreachingLimits().length).toBeGreaterThan(0);
  });

  it('calculates RAROC and ranks top performers', () => {
    const rar = riskAdjustedReturnCalculator.calculate('port-1', 500000, 3000000, 50000, '2026-Q1');
    expect(rar.raroc).toBeCloseTo(15, 0);  // (500k-50k)/3M * 100
    const top = riskAdjustedReturnCalculator.getTopPerformers();
    expect(top.length).toBeGreaterThan(0);
  });
});

// Phase 235: Investment Portfolio Analytics
describe('Phase 235 — Investment Portfolio Analytics', () => {
  it('adds holdings and calculates portfolio value with weights', () => {
    portfolioManager.addHolding('port-A', 'AAPL', 'Apple Inc', 'equities', 100, 15000, 18000);
    portfolioManager.addHolding('port-A', 'TSLA', 'Tesla Inc', 'equities', 50, 8000, 10000);
    expect(portfolioManager.getTotalValue('port-A')).toBe(28000);
    expect(portfolioManager.getTotalUnrealizedGain('port-A')).toBe(5000);
    const holdings = portfolioManager.getHoldings('port-A');
    expect(holdings[0].weightPct + holdings[1].weightPct).toBeCloseTo(100, 0);
  });

  it('attributes performance to allocation and selection effects', () => {
    const attr = performanceAttributor.attribute('port-A', '2026-Q1', 12, 8, 2, 3);
    expect(attr.activeReturn).toBe(4);
    expect(attr.interactionEffect).toBeCloseTo(-1, 0);  // 4 - 2 - 3 = -1
    const outperformers = performanceAttributor.getOutperformingPortfolios();
    expect(outperformers.length).toBeGreaterThan(0);
  });

  it('plans asset allocation and detects rebalancing need', () => {
    const plan = assetAllocationManager.plan('port-A',
      { equities: 60, bonds: 30, cash: 10 },
      { equities: 70, bonds: 25, cash: 5 }, 5
    );
    expect(plan.rebalancingNeeded).toBe(true);
    expect(plan.driftAmounts['equities']).toBe(10);
    expect(assetAllocationManager.getPortfoliosNeedingRebalance().length).toBeGreaterThan(0);
  });

  it('generates rebalancing orders for drifted allocations', () => {
    const plan = assetAllocationManager.getPlan('port-A')!;
    const orders = rebalancingEngine.generateOrders('port-A', plan.driftAmounts, 28000);
    expect(orders.length).toBeGreaterThan(0);
    const sellOrder = orders.find(o => o.direction === 'sell');
    expect(sellOrder).toBeDefined();
  });
});

// Phase 236: Tax Intelligence
describe('Phase 236 — Tax Intelligence', () => {
  it('records tax position and calculates effective tax rate', () => {
    const pos = taxPositionManager.record('US', 'corporate_income', 10000000, 21, 500000, '2026', Date.now() + 90 * 86400 * 1000);
    expect(pos.taxLiability).toBeCloseTo(2600000, 0);  // 10M*0.21 + 500k
    expect(pos.effectiveTaxRate).toBeCloseTo(26, 0);
  });

  it('analyzes transfer pricing and detects out-of-range transactions', () => {
    const record = transferPricingAnalyzer.analyze('tx-001', 'sub-EU', 'services', 1500000, 1000000, 1400000, 'TNMM', '2026');
    expect(record.isWithinRange).toBe(false);
    expect(record.adjustmentRequired).toBe(100000);
    expect(transferPricingAnalyzer.getOutOfRangeTransactions().length).toBeGreaterThan(0);
  });

  it('calculates tax provision with effective tax rate', () => {
    const provision = taxProvisionCalculator.calculate('2026', 1500000, 200000, 10000000, 1400000, 300000);
    expect(provision.totalTaxExpense).toBe(1700000);
    expect(provision.effectiveTaxRate).toBe(17);
  });

  it('identifies tax risk and classifies by expected loss', () => {
    const risk = taxRiskTracker.identify('Germany', 'VAT reclaim dispute', 2000000, 0.6);
    expect(risk.expectedLoss).toBe(1200000);
    expect(risk.riskLevel).toBe('critical');
    expect(taxRiskTracker.getTotalExposure()).toBeGreaterThan(0);
  });
});

// Phase 237: Audit Intelligence
describe('Phase 237 — Audit Intelligence', () => {
  it('plans audit engagement and tracks status', () => {
    const start = Date.now();
    const end = start + 60 * 86400 * 1000;
    const eng = auditEngagementPlanner.plan('Revenue Recognition', 'financial', 'Q4 revenue', 'high', start, end, 'auditor@co.com');
    expect(eng.status).toBe('planned');
    auditEngagementPlanner.updateStatus(eng.engagementId, 'fieldwork');
    expect(auditEngagementPlanner.getActive().some(e => e.engagementId === eng.engagementId)).toBe(true);
  });

  it('records audit finding with severity and due date', () => {
    const eng = auditEngagementPlanner.getByRiskRating('high')[0];
    const finding = auditFindingManager.record(eng.engagementId, 'Missing approval controls', 'POs approved without dual approval', 'high', 'control_deficiency', 'Inadequate segregation of duties', 'Implement dual approval workflow', 30);
    expect(finding.severity).toBe('high');
    expect(finding.status).toBe('open');
    expect(auditFindingManager.getCriticalOpen().length).toBeGreaterThan(0);
  });

  it('tests control and assesses effectiveness', () => {
    const eng = auditEngagementPlanner.getByRiskRating('high')[0];
    const result = controlTestingEngine.test('ctrl-001', eng.engagementId, 'Sample 40 transactions for approval', 40, 0);
    expect(result.result).toBe('effective');
    const ineffective = controlTestingEngine.test('ctrl-002', eng.engagementId, 'Sample 40 for segregation', 40, 8);
    expect(ineffective.result).toBe('ineffective');
    expect(controlTestingEngine.getOverallEffectivenessRate()).toBe(50);
  });

  it('generates audit analytics insight with anomaly count', () => {
    const eng = auditEngagementPlanner.getByRiskRating('high')[0];
    const insight = auditAnalyticsEngine.generate(eng.engagementId, 'Journal entries', 12, 'Round-dollar entries on weekends', 'Possible unauthorized entries');
    expect(insight.followUpRequired).toBe(true);
    expect(insight.anomaliesDetected).toBe(12);
    expect(auditAnalyticsEngine.getTotalAnomalies()).toBeGreaterThanOrEqual(12);
  });
});

// Phase 238: Financial Forecasting & Budgeting
describe('Phase 238 — Financial Forecasting & Budgeting', () => {
  it('creates budget and records actuals with variance', () => {
    const budget = budgetManager.create('Q1 Ops Budget', '2026-Q1', 'engineering', [
      { category: 'salaries', budgetedAmount: 500000 },
      { category: 'tools', budgetedAmount: 50000 }
    ]);
    budgetManager.recordActual(budget.budgetId, 'salaries', 520000);
    budgetManager.recordActual(budget.budgetId, 'tools', 45000);
    const updated = budgetManager.getBudget(budget.budgetId)!;
    expect(updated.totalActual).toBe(565000);
    expect(updated.totalVariance).toBeLessThan(0);  // over budget
    expect(budgetManager.getOverBudget().length).toBeGreaterThan(0);
  });

  it('updates rolling forecast and detects margin trend', () => {
    rollingForecastManager.update('2026-Q1', 3, 10000000, 7000000, 2500000, 0.85);
    rollingForecastManager.update('2026-Q2', 3, 11000000, 7500000, 2900000, 0.8);
    const latest = rollingForecastManager.getLatest()!;
    expect(latest.ebitdaMarginPct).toBeCloseTo(31.8, 0);
    expect(rollingForecastManager.getForecastTrend()).toMatch(/improving|stable|declining/);
  });

  it('analyzes variance and flags unfavorable items', () => {
    const budget = budgetManager.getOverBudget()[0];
    varianceAnalyzer.analyze(budget.budgetId, '2026-Q1', 'salaries', 500000, 520000, 'New hires Q1');
    const unfavorable = varianceAnalyzer.getUnfavorable(5);
    expect(unfavorable.length).toBeGreaterThan(0);
    expect(unfavorable[0].type).toBe('unfavorable');
  });

  it('models financial scenarios with weighted revenue projection', () => {
    financialScenarioModeler.model('Base Case', 'base', 40000000, 10, 28000000, 8, ['stable_market'], 0.6);
    financialScenarioModeler.model('Downside', 'downside', 40000000, -5, 28000000, 5, ['recession'], 0.25);
    const weighted = financialScenarioModeler.getWeightedRevenue();
    expect(weighted).toBeGreaterThan(0);
    expect(financialScenarioModeler.getDownsideScenarios().length).toBeGreaterThan(0);
  });
});
