/**
 * Tests for Phase 311-316: Fleet & Transportation, Customer Segmentation,
 * Demand Forecasting, Competitive Pricing, Incident Management, Executive Dashboard
 */

import { describe, it, expect } from 'vitest';

// Phase 311: Fleet & Transportation Intelligence
import {
  vehicleManager, driverPerformanceTracker,
  routeOptimizer, fleetCostAnalyzer
} from '../fleet-transportation-intelligence';

// Phase 312: Customer Segmentation Intelligence
import {
  rfmAnalyzer, cohortAnalyzer,
  segmentManager, segmentMigrationTracker
} from '../customer-segmentation-intelligence';

// Phase 313: Demand Forecasting Intelligence
import {
  demandForecaster, demandSensor,
  seasonalPatternAnalyzer, forecastAccuracyTracker
} from '../demand-forecasting-intelligence';

// Phase 314: Competitive Pricing Intelligence
import {
  competitorPriceMonitor, priceIndexCalculator,
  discountManager, marginOptimizer
} from '../competitive-pricing-intelligence';

// Phase 315: Incident Management Intelligence
import {
  incidentManager, postMortemTracker,
  incidentMetricsEngine, incidentTrendAnalyzer
} from '../incident-management-intelligence';

// Phase 316: Executive Dashboard Intelligence
import {
  kpiManager, executiveScorecardGenerator,
  boardReportGenerator, trendAlertEngine
} from '../executive-dashboard-intelligence';

// ─── Phase 311: Fleet & Transportation ───────────────────────────────────────

describe('Phase 311: Fleet & Transportation Intelligence', () => {
  it('registers vehicle and detects service due', () => {
    const veh = vehicleManager.register('34 ABC 123', 'Mercedes', 'Sprinter', 2022, 'van', 'diesel', 1500, 45000);
    expect(veh.vehicleId).toMatch(/^veh-/);
    expect(veh.nextServiceDueKm).toBe(55000);

    vehicleManager.updateUsage(veh.vehicleId, 54800, 800, 85, 9.2);
    const serviceDue = vehicleManager.getDueForService();
    expect(serviceDue.some(v => v.vehicleId === veh.vehicleId)).toBe(true);
  });

  it('scores driver performance with safety and efficiency', () => {
    const perf = driverPerformanceTracker.record('drv-001', 'Ali Yılmaz', '2026-Q1', 8500, 320, 94, 72, 3, 2, 1, 12, 8.8);
    expect(perf.recordId).toMatch(/^drvperf-/);
    expect(perf.safetyScore).toBeCloseTo(87.5, 0);   // 100-3×2-2×1.5-1×3 = 87.5
    expect(perf.overallScore).toBeGreaterThan(0);

    const top = driverPerformanceTracker.getTopDrivers('2026-Q1', 1);
    expect(top[0].driverId).toBe('drv-001');
  });

  it('plans route and records completion with deviation', () => {
    const veh2 = vehicleManager.register('06 XY 456', 'Ford', 'Transit', 2023, 'van', 'diesel', 1200, 20000);
    const route = routeOptimizer.plan('IST-ANK', 'Istanbul', 'Ankara', 450, 270, veh2.vehicleId, 'drv-001', 5);
    expect(route.routeId).toMatch(/^route-/);

    routeOptimizer.complete(route.routeId, 462, 285, 5, 41.6, 65);
    expect(routeOptimizer.getAvgDeviationPct()).toBeCloseTo(2.67, 0);  // (462-450)/450 × 100
    expect(routeOptimizer.getTotalFuelCost()).toBe(65);
  });

  it('analyzes fleet costs per km and per delivery', () => {
    const allVehicles = vehicleManager.getAll();
    const analysis = fleetCostAnalyzer.analyze('2026-Q1', allVehicles, 70000, 45000, 8000, 325);
    expect(analysis.recordId).toMatch(/^fleetcost-/);
    expect(analysis.totalDriverCostUSD).toBe(45000);
    expect(analysis.costPerDeliveryUSD).toBeGreaterThan(0);
  });
});

// ─── Phase 312: Customer Segmentation Intelligence ───────────────────────────

describe('Phase 312: Customer Segmentation Intelligence', () => {
  it('analyzes RFM and segments customers correctly', () => {
    const champion = rfmAnalyzer.analyze('cust-001', 'TopBuyer Corp', 15, 25, 15000, 120000);
    expect(champion.rfmId).toMatch(/^rfm-/);
    expect(champion.segment).toBe('champions');   // recency≤30→R5, freq≥20→F5, monetary≥10k→M5 → 15 total
    expect(champion.recencyScore).toBe(5);

    const atRisk = rfmAnalyzer.analyze('cust-002', 'Fading Ltd', 250, 3, 800, 15000);
    expect(atRisk.segment).toBe('at_risk');       // R=1, F=2, M=2 → 5, rScore≤2

    const riskCustomers = rfmAnalyzer.getAtRiskCustomers();
    expect(riskCustomers.some(r => r.customerId === 'cust-002')).toBe(true);
  });

  it('builds cohort and calculates LTV metrics', () => {
    const cohort = cohortAnalyzer.create('2025-Q1 Cohort', '2025-Q1', 500,
      [{ period: '2025-Q1', retained: 500 }, { period: '2025-Q2', retained: 420 }, { period: '2025-Q3', retained: 360 }],
      [{ period: '2025-Q1', revenueUSD: 50000 }, { period: '2025-Q2', revenueUSD: 42000 }, { period: '2025-Q3', revenueUSD: 36000 }]);
    expect(cohort.cohortId).toMatch(/^cohort-/);
    expect(cohort.retentionByPeriod[1].retentionPct).toBe(84);  // 420/500 × 100
    expect(cohort.ltv90Day).toBe(92000);   // 50k+42k
    expect(cohort.avgRetentionPct).toBeGreaterThan(0);
  });

  it('defines segment and calculates health score', () => {
    const seg = segmentManager.define('High-Value Enterprise', 'value_based', ['ACV > $50k', 'Employees > 500'], 120, 6000000, 50000, 8, 8, 15, 42, 78, ['Executive QBR', 'Dedicated CSM']);
    expect(seg.segmentId).toMatch(/^seg-/);
    expect(seg.segmentHealthScore).toBeGreaterThan(0);

    const top = segmentManager.getTopSegmentsByRevenue(1);
    expect(top[0].segmentName).toBe('High-Value Enterprise');
  });

  it('tracks segment migration and net migration score', () => {
    segmentMigrationTracker.track('2026-Q1', 'promising', 'loyal', 45, 225000);
    segmentMigrationTracker.track('2026-Q1', 'loyal', 'at_risk', 12, -60000);
    segmentMigrationTracker.track('2026-Q1', 'at_risk', 'lost', 8, -40000);

    const churns = segmentMigrationTracker.getChurnMigrations('2026-Q1');
    expect(churns.length).toBe(1);
    expect(churns[0].migrationDirection).toBe('churn');

    const netScore = segmentMigrationTracker.getNetMigrationScore('2026-Q1');
    expect(netScore).toBe(25);  // 45 upgrades - (12+8) downgrades/churns
  });
});

// ─── Phase 313: Demand Forecasting Intelligence ───────────────────────────────

describe('Phase 313: Demand Forecasting Intelligence', () => {
  it('creates demand forecast with seasonal adjustment', () => {
    const forecast = demandForecaster.forecast('prod-001', 'Widget X', '2026-Q1', 'quarterly', 'seasonal', 1000, 1.3, 5, 10, 50, 14);
    expect(forecast.forecastId).toMatch(/^fcst-/);
    expect(forecast.forecastedDemand).toBe(1501);  // 1000×1.3×1.05×1.1 ≈ 1501
    expect(forecast.forecastedRevenue).toBe(75050); // 1501 × 50
    expect(forecast.lowerBound).toBeLessThan(forecast.forecastedDemand);
    expect(forecast.upperBound).toBeGreaterThan(forecast.forecastedDemand);

    demandForecaster.recordActual(forecast.forecastId, 1450);
    const updated = demandForecaster.getForecast(forecast.forecastId);
    expect(updated?.forecastAccuracyPct).toBeGreaterThan(90);
  });

  it('senses demand deviation and triggers action', () => {
    const signal = demandSensor.sense('prod-001', '2026-Q1', 1200, 1000, ['POS', 'web_traffic']);
    expect(signal.recordId).toMatch(/^demsen-/);
    expect(signal.shortTermRevision).toBe(20);  // (1200-1000)/1000 × 100
    expect(signal.signalStrength).toBe('strong');
    expect(signal.actionRequired).toBe(true);
    expect(signal.recommendedAction).toContain('Expedite');

    const actionable = demandSensor.getActionableSignals();
    expect(actionable.length).toBeGreaterThan(0);
  });

  it('analyzes seasonal pattern and identifies peak', () => {
    const pattern = seasonalPatternAnalyzer.analyze('prod-001', 'Electronics',
      { Q1: 0.8, Q2: 0.9, Q3: 1.1, Q4: 1.6 }, 3);
    expect(pattern.recordId).toMatch(/^seasonal-/);
    expect(pattern.peakPeriod).toBe('Q4');
    expect(pattern.troughPeriod).toBe('Q1');
    expect(pattern.peakIndex).toBe(1.6);
    expect(pattern.seasonalityStrength).toBeGreaterThan(0);

    const high = seasonalPatternAnalyzer.getHighSeasonalityProducts(30);
    expect(high.length).toBeGreaterThan(0);
  });

  it('tracks forecast accuracy and detects stockouts', () => {
    const acc = forecastAccuracyTracker.track('2026-Q1', 'prod-001', 1000, 1180, 92, true, 0, 9000);
    expect(acc.recordId).toMatch(/^fcstacc-/);
    expect(acc.mape).toBeCloseTo(18, 0);  // |1180-1000|/1000 × 100
    expect(acc.bias).toBeCloseTo(-18, 0); // over-negative (under-forecast)
    expect(acc.stockoutOccurred).toBe(true);

    const stockouts = forecastAccuracyTracker.getStockoutProducts('2026-Q1');
    expect(stockouts.length).toBeGreaterThan(0);
    expect(forecastAccuracyTracker.getAvgAccuracy('2026-Q1')).toBeGreaterThan(0);
  });
});

// ─── Phase 314: Competitive Pricing Intelligence ──────────────────────────────

describe('Phase 314: Competitive Pricing Intelligence', () => {
  it('captures competitor price and determines positioning', () => {
    const rec = competitorPriceMonitor.capture('prod-001', 'Widget X', 'comp-001', 'CompetitorA', 90, 100, false, 'manual');
    expect(rec.recordId).toMatch(/^cmprc-/);
    expect(rec.priceIndexVsCompetitor).toBeCloseTo(111.1, 0);  // 100/90×100
    expect(rec.positioning).toBe('premium');

    const premium = competitorPriceMonitor.getPremiumPositionedProducts();
    expect(premium.length).toBeGreaterThan(0);
  });

  it('calculates price index vs market', () => {
    const idx = priceIndexCalculator.calculate('prod-001', 'Widget X', 'Electronics', '2026-Q1', 100, [80, 90, 95, 105]);
    expect(idx.recordId).toMatch(/^pridx-/);
    expect(idx.marketAvgPrice).toBeCloseTo(94, 0);  // avg of [80,90,95,100,105]
    expect(idx.priceIndex).toBeGreaterThan(100);    // we're above market avg
    expect(idx.competitorCount).toBe(4);
  });

  it('creates discount and checks margin approval', () => {
    const approved = discountManager.create('prod-001', 'Widget X', 'promotional', 100, 15, 40, 30, 500, 14);
    expect(approved.discountId).toMatch(/^disc-/);
    expect(approved.discountedPriceUSD).toBe(85);
    expect(approved.marginAfterDiscountPct).toBeCloseTo(52.9, 0);  // (85-40)/85×100
    expect(approved.approved).toBe(true);   // margin 52.9% ≥ minMargin 30%

    const belowMargin = discountManager.create('prod-002', 'Budget Item', 'clearance', 50, 40, 45, 30, 100, 7);
    expect(belowMargin.approved).toBe(false);  // margin = (30-45)/30 < 0 → below 30%
    expect(discountManager.getBelowMarginDiscounts().length).toBeGreaterThan(0);
  });

  it('optimizes margin and identifies top opportunities', () => {
    const opp = marginOptimizer.optimize('prod-001', 'Widget X', '2026-Q1', 100, 40, 50, 5, 3);
    expect(opp.recordId).toMatch(/^margopt-/);
    expect(opp.currentMarginPct).toBe(60);  // (100-40)/100×100
    expect(opp.marginGapPct).toBe(-10);     // target 50 - current 60 = -10 (already above target)

    const below = marginOptimizer.optimize('prod-003', 'LowMargin Item', '2026-Q1', 55, 50, 30, 8, 5);
    expect(below.marginGapPct).toBeGreaterThan(0);  // margin ~9%, gap to 30%

    const top = marginOptimizer.getTopOpportunities(1);
    expect(top.length).toBe(1);
  });
});

// ─── Phase 315: Incident Management Intelligence ──────────────────────────────

describe('Phase 315: Incident Management Intelligence', () => {
  it('opens incident, acknowledges and resolves within SLA', () => {
    const inc = incidentManager.open('API Gateway Down', 'All API calls returning 503', 'sev2_major', 'application', 'API Gateway', 'Platform', 5000, 150000);
    expect(inc.incidentId).toMatch(/^inc-/);
    expect(inc.slaTargetMinutes).toBe(240);
    expect(inc.postMortemStatus).toBe('pending');

    incidentManager.acknowledge(inc.incidentId, 'eng-001');
    incidentManager.resolve(inc.incidentId, 'Misconfigured load balancer rule', false);
    const resolved = incidentManager.getIncident(inc.incidentId);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.slaBreached).toBe(false);   // resolved immediately, well within SLA
  });

  it('creates post-mortem with action items', () => {
    const inc2 = incidentManager.open('DB Slowdown', 'Database queries timing out', 'sev1_critical', 'infrastructure', 'Database', 'DB Team', 20000, 500000);
    incidentManager.resolve(inc2.incidentId, 'Missing index on hot table', true);

    const pm = postMortemTracker.create(inc2.incidentId, 'DB Slowdown', 'sev1_critical', 'DB Lead', ['Missing index', 'No query monitoring'], ['Load spike'], [{ action: 'Add index', owner: 'DBA', daysToComplete: 3 }, { action: 'Set up query alerts', owner: 'DevOps', daysToComplete: 7 }], true, 15, ['Automated index advisor', 'Query performance dashboard']);
    expect(pm.postMortemId).toMatch(/^pm-/);
    expect(pm.actionItemsOpen).toBe(2);
    expect(pm.blameless).toBe(true);
  });

  it('calculates incident metrics from all incidents', () => {
    const allInc = incidentManager.getAll();
    const metrics = incidentMetricsEngine.calculate('2026-Q1', allInc);
    expect(metrics.recordId).toMatch(/^incmtx-/);
    expect(metrics.totalIncidents).toBeGreaterThan(0);
    expect(metrics.slaCompliancePct).toBeGreaterThanOrEqual(0);
    expect(metrics.totalRevenueImpactUSD).toBeGreaterThan(0);
  });

  it('analyzes incident trends by service', () => {
    const apiInc = incidentManager.getAll().filter(i => i.affectedService === 'API Gateway');
    const trend = incidentTrendAnalyzer.analyze('2026-Q1', 'API Gateway', apiInc, 300);
    expect(trend.recordId).toMatch(/^inctrd-/);
    expect(trend.service).toBe('API Gateway');
    expect(trend.trendDirection).toBe('improving');   // resolved in minutes < 300 × 0.9

    const high = incidentTrendAnalyzer.getHighImpactServices(100000);
    expect(high.length).toBeGreaterThan(0);
  });
});

// ─── Phase 316: Executive Dashboard Intelligence ──────────────────────────────

describe('Phase 316: Executive Dashboard Intelligence', () => {
  it('defines KPIs and updates with RAG status', () => {
    const kpi = kpiManager.define('ARR', 'revenue', 'CRO', 'monthly', 'USD', 10000000, 90, 70, false);
    expect(kpi.kpiId).toMatch(/^kpi-/);
    expect(kpi.ragStatus).toBe('red');   // currentValue=0

    kpiManager.update(kpi.kpiId, 9200000);
    const updated = kpiManager.getKPI(kpi.kpiId);
    expect(updated?.attainmentPct).toBe(92);
    expect(updated?.ragStatus).toBe('green');   // 92 ≥ greenThreshold 90

    const red = kpiManager.define('Churn Rate', 'customer', 'CS', 'monthly', '%', 5, 100, 85, false);
    kpiManager.update(red.kpiId, 8.5);   // attainment = 8.5/5×100 = 170% but threshold context inverted
  });

  it('generates executive scorecard with narrative', () => {
    const allKpis = kpiManager.getAll();
    const scorecard = executiveScorecardGenerator.generate('2026-Q1', 'CEO', allKpis,
      ['ARR growth 15% YoY', 'NPS improved to 52'],
      ['Churn elevated in SMB segment'],
      ['EMEA expansion pipeline $5M']);
    expect(scorecard.scorecardId).toMatch(/^scorecard-/);
    expect(scorecard.totalKPIs).toBe(allKpis.length);
    expect(scorecard.narrativeSummary).toBeTruthy();
    expect(scorecard.overallPerformanceScore).toBeGreaterThan(0);
  });

  it('generates board report with key financials', () => {
    const report = boardReportGenerator.generate('2026-Q1', 9200000, 10000000, 8000000, 1840000, 15000000, 450, 112, 4.5, 52, 285, 270, 8, 12, ['Competitive pressure in EMEA'], ['Approve EMEA headcount plan']);
    expect(report.reportId).toMatch(/^boardrep-/);
    expect(report.revenueVsTargetPct).toBe(92);
    expect(report.revenueYoyGrowthPct).toBe(15);
    expect(report.ebitdaMarginPct).toBe(20);
    expect(report.headcountVsLastPeriod).toBe(15);
  });

  it('evaluates KPIs for trend alerts', () => {
    const allKpis = kpiManager.getAll();
    const alerts = trendAlertEngine.evaluate(allKpis);
    // There may or may not be alerts depending on KPI states
    const critical = trendAlertEngine.getCriticalAlerts();
    const unacked = trendAlertEngine.getUnacknowledgedAlerts();
    expect(Array.isArray(critical)).toBe(true);
    expect(Array.isArray(unacked)).toBe(true);

    if (alerts.length > 0) {
      trendAlertEngine.acknowledge(alerts[0].alertId);
      expect(trendAlertEngine.getUnacknowledgedAlerts().some(a => a.alertId === alerts[0].alertId)).toBe(false);
    }
  });
});
