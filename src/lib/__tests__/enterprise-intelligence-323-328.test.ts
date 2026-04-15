/**
 * Tests for Phase 323-328: Sales Compensation, Customer Journey, Digital Asset,
 * Workforce Capacity, Operational Risk, Product Launch Intelligence
 */

import { describe, it, expect } from 'vitest';
import {
  compensationPlanManager, attainmentTracker, incentiveEventManager, compensationAnalyticsEngine
} from '../sales-compensation-intelligence';
import {
  journeyTracker, frictionDetector, pathAnalyzer, journeyOptimizer
} from '../customer-journey-intelligence';
import {
  digitalAssetManager, assetPerformanceAnalyzer, brandConsistencyChecker, assetLifecycleManager
} from '../digital-asset-intelligence';
import {
  workforceCapacityManager, skillsMatrixManager, headcountForecaster, workloadBalancer
} from '../workforce-capacity-intelligence';
import {
  riskRegister, controlEffectivenessTracker, lossEventTracker, riskAppetiteManager
} from '../operational-risk-intelligence';
import {
  launchManager, launchReadinessAssessor, launchMetricsTracker, adoptionCurveAnalyzer
} from '../product-launch-intelligence';

// ─── Phase 323: Sales Compensation ────────────────────────────────────────────

describe('Phase 323: Sales Compensation Intelligence', () => {
  it('creates compensation plan with accelerator and calculates earnings', () => {
    const plan = compensationPlanManager.create('Q1 AE Plan', 'accelerator', 'Account Executive', 250000, 8, 100, 1.5, 'quarterly');
    expect(plan.planId).toMatch(/^compplan-/);
    expect(plan.acceleratorMultiplier).toBe(1.5);
    expect(plan.isActive).toBe(true);

    const attainment = attainmentTracker.calculate('rep-001', 'Alice Smith', plan, '2025-Q1', 300000, 0, 12);
    expect(attainment.attainmentId).toMatch(/^attain-/);
    expect(attainment.attainmentPct).toBeCloseTo(120, 0);
    expect(attainment.attainmentCategory).toBe('exceeds');
    expect(attainment.acceleratorEarningsUSD).toBeGreaterThan(0);
  });

  it('logs incentive event and tracks pending approvals', () => {
    const event = incentiveEventManager.log('rep-002', 'Bob Jones', 'deal_closed', 50000, 4000, 1.0, 'New enterprise deal', 'deal-001');
    expect(event.eventId).toMatch(/^inevent-/);
    expect(event.approvalStatus).toBe('pending');
    incentiveEventManager.approve(event.eventId, 'manager-001');
    const pending = incentiveEventManager.getPendingApprovals();
    expect(pending.find(e => e.eventId === event.eventId)).toBeUndefined();
  });

  it('ranks team by attainment and identifies over-quota reps', () => {
    const plan = compensationPlanManager.create('SMB Plan', 'flat_rate', 'SDR', 100000, 5, 100, 1.0, 'quarterly');
    attainmentTracker.calculate('rep-003', 'Carol White', plan, '2025-Q2', 110000, 0, 8);
    attainmentTracker.calculate('rep-004', 'Dan Black', plan, '2025-Q2', 75000, 0, 6);
    const ranked = attainmentTracker.rankTeam('2025-Q2');
    expect(ranked[0].attainmentPct).toBeGreaterThanOrEqual(ranked[ranked.length - 1].attainmentPct);
    const overQuota = attainmentTracker.getOverQuota('2025-Q2');
    expect(overQuota.length).toBeGreaterThan(0);
  });

  it('calculates compensation analytics with earnings distribution', () => {
    const plan = compensationPlanManager.create('Analytics Plan', 'tiered_commission', 'AE', 200000, 7, 90, 1.3, 'quarterly');
    const a1 = attainmentTracker.calculate('rep-010', 'Eve Green', plan, '2025-Q3', 220000, 0, 10);
    const a2 = attainmentTracker.calculate('rep-011', 'Frank Blue', plan, '2025-Q3', 130000, 2000, 6);
    const analytics = compensationAnalyticsEngine.analyze('2025-Q3', [a1, a2]);
    expect(analytics.analyticsId).toMatch(/^companalytics-/);
    expect(analytics.teamSize).toBe(2);
    expect(analytics.payoutToRevenueRatioPct).toBeGreaterThanOrEqual(0);
  });
});

// ─── Phase 324: Customer Journey ──────────────────────────────────────────────

describe('Phase 324: Customer Journey Intelligence', () => {
  it('records touchpoints and builds journey path', () => {
    journeyTracker.recordTouchpoint('cust-j01', 'sess-001', 'organic_search', 'awareness', 'page_view', 45, 'desktop', 'neutral', '/home');
    journeyTracker.recordTouchpoint('cust-j01', 'sess-002', 'email', 'intent', 'cta_click', 15, 'desktop', 'positive', '/pricing');
    journeyTracker.recordTouchpoint('cust-j01', 'sess-003', 'direct', 'purchase', 'checkout', 120, 'desktop', 'positive', '/checkout', true);
    const journey = journeyTracker.getCustomerJourney('cust-j01')!;
    expect(journey.isConverted).toBe(true);
    expect(journey.touchpointCount).toBe(3);
    expect(journey.pathPattern).toContain('organic_search');
  });

  it('detects friction points with priority scoring', () => {
    const friction = frictionDetector.detect('checkout', 'form_abandonment', 45, 180, 500, 75000, 'Simplify checkout form to 3 fields', '/checkout');
    expect(friction.frictionId).toMatch(/^friction-/);
    expect(friction.priorityScore).toBeGreaterThan(0);
    expect(frictionDetector.getTotalRevenueLoss()).toBeGreaterThan(0);
  });

  it('analyzes path patterns and identifies best converting paths', () => {
    journeyTracker.recordTouchpoint('cust-j02', 'sess-010', 'paid_search', 'awareness', 'page_view', 30, 'mobile');
    journeyTracker.recordTouchpoint('cust-j02', 'sess-011', 'email', 'purchase', 'checkout', 60, 'mobile', 'positive', '/checkout', true);
    const allJourneys = journeyTracker.getAllJourneys();
    const patterns = pathAnalyzer.analyze(allJourneys);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].count).toBeGreaterThan(0);
  });

  it('optimizes journey and generates actionable recommendations', () => {
    const journeys = journeyTracker.getAllJourneys();
    const frictions = frictionDetector['frictions'];
    const optimization = journeyOptimizer.optimize('enterprise', journeys, frictions, 2500);
    expect(optimization.optimizationId).toMatch(/^jopt-/);
    expect(optimization.currentConversionRatePct).toBeGreaterThanOrEqual(0);
    expect(optimization.projectedConversionRatePct).toBeGreaterThanOrEqual(optimization.currentConversionRatePct);
  });
});

// ─── Phase 325: Digital Asset ─────────────────────────────────────────────────

describe('Phase 325: Digital Asset Intelligence', () => {
  it('registers asset and tracks usage', () => {
    const asset = digitalAssetManager.register('Homepage Hero Banner', 'image', 'AcmeBrand', 'designer-01', 2.4, 'PNG', ['hero', 'homepage']);
    digitalAssetManager.activate(asset.assetId, 92);
    digitalAssetManager.trackUsage(asset.assetId, 5, 3);
    const updated = digitalAssetManager.getAsset(asset.assetId)!;
    expect(updated.status).toBe('active');
    expect(updated.downloadCount).toBe(5);
    expect(updated.brandAlignmentScore).toBe(92);
  });

  it('analyzes asset performance and calculates ROI', () => {
    const asset = digitalAssetManager.register('Product Video', 'video', 'AcmeBrand', 'creator-01', 125, 'MP4');
    const perf = assetPerformanceAnalyzer.analyze(asset.assetId, 'Product Video', '2025-Q1', 50000, 3000, 120, 24000, 2000, [{ channel: 'social', impressions: 30000, conversions: 80 }], 45000, 0.7);
    expect(perf.performanceId).toMatch(/^assetperf-/);
    expect(perf.roi).toBe(12);
    expect(perf.ctr).toBeGreaterThan(0);
  });

  it('checks brand consistency and flags major violations', () => {
    const asset = digitalAssetManager.register('Off-brand Flyer', 'document', 'AcmeBrand', 'intern-01', 0.5, 'PDF');
    const check = brandConsistencyChecker.check(asset.assetId, 'Off-brand Flyer', 40, 30, false, 35, ['Wrong primary color', 'Incorrect font', 'Logo stretched'], 'brand-team-001');
    expect(check.checkId).toMatch(/^brandcheck-/);
    expect(check.severity).toBe('major_violation');
    expect(brandConsistencyChecker.getMajorViolations().length).toBeGreaterThan(0);
  });

  it('manages asset lifecycle phases', () => {
    const asset = digitalAssetManager.register('Q4 Campaign', 'template', 'AcmeBrand', 'designer-02', 1.2, 'AI');
    assetLifecycleManager.setPhase(asset.assetId, 'Q4 Campaign', 'active');
    assetLifecycleManager.setPhase(asset.assetId, 'Q4 Campaign', 'refresh_needed', Date.now() - 1000);
    const refreshNeeded = assetLifecycleManager.getRefreshNeeded();
    expect(refreshNeeded.find(r => r.assetId === asset.assetId)).toBeTruthy();
  });
});

// ─── Phase 326: Workforce Capacity ────────────────────────────────────────────

describe('Phase 326: Workforce Capacity Intelligence', () => {
  it('records workforce capacity and determines status', () => {
    const capacity = workforceCapacityManager.record('dept-eng', 'Engineering', '2025-Q1', 50, 8000, 9200, 3, 5, 12);
    expect(capacity.capacityId).toMatch(/^wfcap-/);
    expect(capacity.utilizationPct).toBeGreaterThan(100);
    expect(capacity.capacityStatus).toBe('critical');
  });

  it('assesses skills matrix and identifies gaps', () => {
    const skills = [
      { skill: 'TypeScript', proficiencyLevel: 4 as const, certified: false, lastAssessedAt: Date.now() },
      { skill: 'React', proficiencyLevel: 3 as const, certified: false, lastAssessedAt: Date.now() }
    ];
    const matrix = skillsMatrixManager.assess('emp-001', 'John Doe', 'Engineering', skills, ['TypeScript', 'React', 'PostgreSQL', 'Docker']);
    expect(matrix.matrixId).toMatch(/^skillmat-/);
    expect(matrix.skillGaps).toContain('PostgreSQL');
    expect(matrix.skillGaps).toContain('Docker');
    expect(matrix.overallMatchPct).toBe(50);
  });

  it('forecasts headcount gap and estimates hiring cost', () => {
    const forecast = headcountForecaster.forecast('dept-product', 'Product', '2025-H2', 12, 18, 6, 2, 45, 25000, ['Product Management', 'Data Analysis'], 'high');
    expect(forecast.forecastId).toMatch(/^hcforecast-/);
    expect(forecast.gap).toBe(6);
    expect(forecast.estimatedHiringCostUSD).toBe(150000);
  });

  it('analyzes workload balance and recommends rebalancing', () => {
    const workloads = [
      { memberId: 'e1', memberName: 'Alice', workItems: 45 },
      { memberId: 'e2', memberName: 'Bob', workItems: 12 },
      { memberId: 'e3', memberName: 'Carol', workItems: 30 }
    ];
    const balance = workloadBalancer.analyze('team-dev', 'Dev Team', '2025-Q1', workloads);
    expect(balance.balanceId).toMatch(/^wlbal-/);
    expect(balance.overloadedCount).toBeGreaterThan(0);
    expect(balance.balanceScore).toBeLessThan(100);
  });
});

// ─── Phase 327: Operational Risk ──────────────────────────────────────────────

describe('Phase 327: Operational Risk Intelligence', () => {
  it('registers risk and calculates inherent and residual scores', () => {
    const risk = riskRegister.register('Data Breach via Third Party', 'systems', 'CISO', 'IT Security', 'Vendor with access to sensitive data', 3, 5, ['Vendor security assessments', 'Data encryption', 'Access controls']);
    expect(risk.riskId).toMatch(/^risk-/);
    expect(risk.inherentRiskScore).toBe(15);
    expect(risk.residualRiskScore).toBe(Math.ceil(15 * 0.7));
    expect(risk.riskRating).toBe('high');
  });

  it('records control test results and tracks effectiveness', () => {
    const risk = riskRegister.register('Fraud', 'financial', 'CFO', 'Finance', 'Internal fraud risk', 2, 4, ['Segregation of duties']);
    const control = controlEffectivenessTracker.register('Segregation of Duties', 'preventive', [risk.riskId], 'CFO', 'monthly', true, 60);
    controlEffectivenessTracker.recordTest(control.controlId, 'effective', 'partially_effective', 'partial', ['Manual override risk in urgent cases']);
    const updated = controlEffectivenessTracker.getAll().find(c => c.controlId === control.controlId)!;
    expect(updated.overallEffectivenessScore).toBe(80); // (100+60)/2
    expect(updated.lastTestResult).toBe('partial');
  });

  it('records loss event and calculates net loss', () => {
    const lossEvent = lossEventTracker.record('Unauthorized wire transfer', 'financial', 250000, 50000, 100000, 'Inadequate approval controls', ['Time pressure', 'Override of controls'], ['Implement dual approval for transfers > $10k']);
    expect(lossEvent.lossId).toMatch(/^loss-/);
    expect(lossEvent.totalLossUSD).toBe(300000);
    expect(lossEvent.netLossUSD).toBe(200000);
    expect(lossEvent.severity).toBe('major');
  });

  it('defines risk appetite and detects breaches', () => {
    const appetite = riskAppetiteManager.define('financial', 10, 'low', 'We will not accept high financial risk without board approval', 'Board of Directors');
    riskAppetiteManager.updateExposure('financial', 14);  // above threshold of 10
    const updated = riskAppetiteManager.getAll().find(a => a.appetiteId === appetite.appetiteId)!;
    expect(updated.isBreached).toBe(true);
    expect(updated.breachCount).toBe(1);
    expect(riskAppetiteManager.getBreaches().length).toBeGreaterThan(0);
  });
});

// ─── Phase 328: Product Launch ────────────────────────────────────────────────

describe('Phase 328: Product Launch Intelligence', () => {
  it('creates launch and updates go/no-go status based on readiness', () => {
    const launch = launchManager.create('Analytics Pro v2.0', '2.0.0', 'major_release', Date.now() + 30 * 86400000, 'pm-001', 200000, ['enterprise', 'mid_market'], ['us', 'eu']);
    expect(launch.launchId).toMatch(/^launch-/);
    expect(launch.goNoGoStatus).toBe('pending');
    launchManager.updateStatus(launch.launchId, 'preparation', 85);
    const updated = launchManager.getLaunch(launch.launchId)!;
    expect(updated.goNoGoStatus).toBe('conditional_go');
  });

  it('assesses launch readiness with critical path tracking', () => {
    const launch = launchManager.create('Mobile App v3', '3.0.0', 'major_release', Date.now() + 45 * 86400000, 'pm-002', 150000, ['smb'], ['us']);
    const items = [
      { item: 'Technical testing complete', owner: 'eng-lead', status: 'complete' as const, criticalPath: true },
      { item: 'Marketing materials ready', owner: 'marketing', status: 'complete' as const, criticalPath: true },
      { item: 'Legal review', owner: 'legal', status: 'blocked' as const, criticalPath: true }
    ];
    const readiness = launchReadinessAssessor.assess(launch.launchId, 'Mobile App v3', items, ['Legal approval timeline uncertain']);
    expect(readiness.readinessId).toMatch(/^readiness-/);
    expect(readiness.overallReady).toBe(false);
    expect(readiness.blockers).toContain('Legal review');
  });

  it('tracks launch metrics and calculates health score', () => {
    const launch = launchManager.create('Feature X', '1.5.0', 'feature', Date.now() - 30 * 86400000, 'pm-003', 50000, ['all'], ['us']);
    launchManager.updateStatus(launch.launchId, 'post_launch', 95);
    const metrics = launchMetricsTracker.track(launch.launchId, 'Feature X', 'Week-4', 30, 500, 1200, 80, 48000, 50000, 3, 42, 15, 0, 10000);
    expect(metrics.metricsId).toMatch(/^launchmet-/);
    expect(metrics.adoptionRatePct).toBeCloseTo(12, 0);
    expect(metrics.launchHealthScore).toBeGreaterThan(50);
  });

  it('analyzes adoption curve and projects 90-day adoption', () => {
    const launch = launchManager.create('API v4', '4.0.0', 'major_release', Date.now() - 14 * 86400000, 'pm-004', 80000, ['developer'], ['global']);
    const segments = [
      { name: 'innovators', adoptionPct: 2.5, daysToAdopt: 3 },
      { name: 'early_adopters', adoptionPct: 5, daysToAdopt: 10 }
    ];
    const curve = adoptionCurveAnalyzer.analyze(launch.launchId, 'API v4', 8, 60, 14, 0.3, segments);
    expect(curve.curveId).toMatch(/^adopcurve-/);
    expect(curve.adoptionCurvePhase).toBe('growth');
    expect(curve.projectedAdoption90Days).toBeGreaterThan(curve.currentAdoptionPct);
  });
});
