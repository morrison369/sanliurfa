/**
 * Unit Tests — executive-dashboard-intelligence.ts singleton class managers
 *
 * Phase 222 — executive board reporting:
 * - KPIManager (define + update with RAG status: green >= greenThreshold, amber >= amberThreshold, red)
 * - ExecutiveScorecardGenerator (generate from KPIs + overallScore + RAG breakdown)
 * - BoardReportGenerator (financial/customer/people metrics + YoY/EBITDA margin)
 * - TrendAlertEngine (red KPI threshold breach + ±20% rapid change)
 */

import { describe, it, expect } from 'vitest';
import {
  kpiManager,
  executiveScorecardGenerator,
  boardReportGenerator,
  trendAlertEngine,
} from '../executive-dashboard-intelligence';

describe('KPIManager', () => {
  it('define — kpi döner, default ragStatus="red", trend="flat"', () => {
    const k = kpiManager.define('Revenue MTD-1', 'financial', 'CFO', 'monthly', 'USD', 1000000, 90, 70, true);
    expect(k.ragStatus).toBe('red');
    expect(k.trend).toBe('flat');
    expect(k.currentValue).toBe(0);
    expect(k.kpiId).toMatch(/^kpi-\d+-\d+$/);
  });

  it('update — bilinmeyen → false', () => {
    expect(kpiManager.update('non-existent', 100)).toBe(false);
  });

  it('update — attainmentPct = (current / target) * 100', () => {
    const k = kpiManager.define('Attain-2', 'financial', 'CFO', 'monthly', 'USD', 1000, 90, 70, false);
    kpiManager.update(k.kpiId, 800);
    const updated = kpiManager.getKPI(k.kpiId);
    expect(updated?.attainmentPct).toBe(80); // 800/1000*100
  });

  it('update — ragStatus green: attainment >= greenThreshold', () => {
    const k = kpiManager.define('Green-3', 'operational', 'COO', 'weekly', '%', 100, 90, 70, false);
    kpiManager.update(k.kpiId, 95);
    expect(kpiManager.getKPI(k.kpiId)?.ragStatus).toBe('green');
  });

  it('update — ragStatus amber: attainment >= amberThreshold < greenThreshold', () => {
    const k = kpiManager.define('Amber-4', 'operational', 'COO', 'weekly', '%', 100, 90, 70, false);
    kpiManager.update(k.kpiId, 80);
    expect(kpiManager.getKPI(k.kpiId)?.ragStatus).toBe('amber');
  });

  it('update — ragStatus red: attainment < amberThreshold', () => {
    const k = kpiManager.define('Red-5', 'operational', 'COO', 'weekly', '%', 100, 90, 70, false);
    kpiManager.update(k.kpiId, 50);
    expect(kpiManager.getKPI(k.kpiId)?.ragStatus).toBe('red');
  });

  it('update — trend "up" current > previous', () => {
    const k = kpiManager.define('Trend-Up-6', 'financial', 'CFO', 'monthly', 'USD', 1000, 90, 70, false);
    kpiManager.update(k.kpiId, 500);
    kpiManager.update(k.kpiId, 600);
    expect(kpiManager.getKPI(k.kpiId)?.trend).toBe('up');
  });

  it('update — trend "down" current < previous', () => {
    const k = kpiManager.define('Trend-Down-7', 'financial', 'CFO', 'monthly', 'USD', 1000, 90, 70, false);
    kpiManager.update(k.kpiId, 600);
    kpiManager.update(k.kpiId, 500);
    expect(kpiManager.getKPI(k.kpiId)?.trend).toBe('down');
  });

  it('update — trend "flat" current = previous', () => {
    const k = kpiManager.define('Trend-Flat-8', 'financial', 'CFO', 'monthly', 'USD', 1000, 90, 70, false);
    kpiManager.update(k.kpiId, 500);
    kpiManager.update(k.kpiId, 500);
    expect(kpiManager.getKPI(k.kpiId)?.trend).toBe('flat');
  });

  it('update — changeVsPreviousPct correct sign', () => {
    const k = kpiManager.define('Change-9', 'financial', 'CFO', 'monthly', 'USD', 1000, 90, 70, false);
    kpiManager.update(k.kpiId, 500);
    kpiManager.update(k.kpiId, 600);
    expect(kpiManager.getKPI(k.kpiId)?.changeVsPreviousPct).toBe(20); // (600-500)/500*100
  });

  it('update — target=0 → attainmentPct 0 (NaN guard)', () => {
    const k = kpiManager.define('Zero-Target', 'operational', 'COO', 'monthly', 'X', 0, 90, 70, false);
    kpiManager.update(k.kpiId, 100);
    expect(kpiManager.getKPI(k.kpiId)?.attainmentPct).toBe(0);
  });

  it('getRedKPIs — red status filter', () => {
    const red = kpiManager.getRedKPIs();
    expect(red.every((k) => k.ragStatus === 'red')).toBe(true);
  });

  it('getKPIsByCategory — category filter', () => {
    kpiManager.define('Cat-Cust-10', 'customer', 'CEO', 'monthly', '#', 1000, 90, 70, false);
    const customer = kpiManager.getKPIsByCategory('customer');
    expect(customer.every((k) => k.category === 'customer')).toBe(true);
  });

  it('getAll — tüm kpi liste', () => {
    const all = kpiManager.getAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });
});

describe('ExecutiveScorecardGenerator', () => {
  it('generate — overallScore = (green * 100 + amber * 60) / total', () => {
    const kpis: any[] = [
      { ragStatus: 'green', category: 'financial', attainmentPct: 100, kpiId: 'k1' },
      { ragStatus: 'green', category: 'financial', attainmentPct: 100, kpiId: 'k2' },
      { ragStatus: 'amber', category: 'operational', attainmentPct: 80, kpiId: 'k3' },
      { ragStatus: 'red', category: 'operational', attainmentPct: 40, kpiId: 'k4' },
    ];
    const s = executiveScorecardGenerator.generate('2026-Q1', 'CEO', kpis, ['win1'], ['risk1'], ['opp1']);
    // (2*100 + 1*60 + 1*0) / 4 = 260/4 = 65
    expect(s.overallPerformanceScore).toBe(65);
    expect(s.greenKPIs).toBe(2);
    expect(s.amberKPIs).toBe(1);
    expect(s.redKPIs).toBe(1);
  });

  it('generate — boş kpis → overallScore 0', () => {
    const s = executiveScorecardGenerator.generate('2026-Q1-empty', 'CEO', [], [], [], []);
    expect(s.overallPerformanceScore).toBe(0);
    expect(s.totalKPIs).toBe(0);
  });

  it('generate — narrative içerir green/total + red sayısı', () => {
    const kpis: any[] = [
      { ragStatus: 'green', category: 'financial', attainmentPct: 100, kpiId: 'k1' },
      { ragStatus: 'red', category: 'operational', attainmentPct: 30, kpiId: 'k2' },
    ];
    const s = executiveScorecardGenerator.generate('2026-narrative', 'CEO', kpis, [], [], []);
    expect(s.narrativeSummary).toContain('1/2');
    expect(s.narrativeSummary).toContain('1 KPIs require');
  });

  it('generate — kpiSummaryByCategory aggregate', () => {
    const kpis: any[] = [
      { ragStatus: 'green', category: 'financial', attainmentPct: 100, kpiId: 'k1' },
      { ragStatus: 'amber', category: 'financial', attainmentPct: 80, kpiId: 'k2' },
    ];
    const s = executiveScorecardGenerator.generate('2026-cat', 'CEO', kpis, [], [], []);
    expect(s.kpiSummaryByCategory.financial).toBeDefined();
    expect(s.kpiSummaryByCategory.financial.avg).toBe(90); // (100+80)/2
  });

  it('getLatest — audience filter', () => {
    const kpis: any[] = [{ ragStatus: 'green', category: 'financial', attainmentPct: 100, kpiId: 'kx' }];
    const s1 = executiveScorecardGenerator.generate('2026-aud-1', 'BOARD', kpis, [], [], []);
    executiveScorecardGenerator.generate('2026-aud-2', 'CEO', kpis, [], [], []);
    expect(executiveScorecardGenerator.getLatest('BOARD')?.scorecardId).toBe(s1.scorecardId);
  });

  it('getLatest — audience yok → tümünden son', () => {
    const latest = executiveScorecardGenerator.getLatest();
    expect(latest).toBeDefined();
  });

  it('getPerformanceTrend — overallScore array', () => {
    const trend = executiveScorecardGenerator.getPerformanceTrend();
    expect(Array.isArray(trend)).toBe(true);
  });
});

describe('BoardReportGenerator', () => {
  it('generate — revenueVsTargetPct = revenue / target * 100', () => {
    const r = boardReportGenerator.generate(
      '2026-Q1', 8000000, 10000000, 6000000, 1000000, 5000000,
      1000, 110, 5, 60, 100, 90,
      8, 10, ['risk1'], ['decision1'],
    );
    expect(r.revenueVsTargetPct).toBe(80); // 8M/10M*100
    expect(r.revenueYoyGrowthPct).toBeCloseTo(33.3, 1); // (8-6)/6*100
    expect(r.ebitdaMarginPct).toBe(12.5); // 1M/8M*100
    expect(r.headcountVsLastPeriod).toBe(10); // 100-90
  });

  it('generate — revenueTarget=0 → revenueVsTargetPct 0 (NaN guard)', () => {
    const r = boardReportGenerator.generate(
      'zero-target', 100, 0, 100, 10, 50,
      10, 100, 1, 50, 5, 5, 1, 1, [], [],
    );
    expect(r.revenueVsTargetPct).toBe(0);
  });

  it('generate — previousRevenue=0 → YoY growth 0', () => {
    const r = boardReportGenerator.generate(
      'first-year', 100, 100, 0, 10, 50,
      10, 100, 1, 50, 5, 5, 1, 1, [], [],
    );
    expect(r.revenueYoyGrowthPct).toBe(0);
  });

  it('generate — burnRate optional (verildi → kayıtta yer alır)', () => {
    const r = boardReportGenerator.generate(
      'with-burn', 100, 100, 100, 10, 50, 10, 100, 1, 50, 5, 5, 1, 1, [], [], 12,
    );
    expect((r as any).burnRateMonths).toBe(12);
  });

  it('getLatest — son rapor', () => {
    const r = boardReportGenerator.generate('latest-rep', 100, 100, 100, 10, 50, 10, 100, 1, 50, 5, 5, 1, 1, [], []);
    expect(boardReportGenerator.getLatest()?.reportId).toBe(r.reportId);
  });

  it('getRevenueTrend — array', () => {
    const trend = boardReportGenerator.getRevenueTrend();
    expect(Array.isArray(trend)).toBe(true);
  });
});

describe('TrendAlertEngine', () => {
  it('evaluate — red KPI → threshold_breach alert', () => {
    const kpis: any[] = [
      { kpiId: 'kred-1', kpiName: 'Revenue', ragStatus: 'red', attainmentPct: 50,
        amberThreshold: 70, targetValue: 1000, currentValue: 500, previousValue: 500,
        owner: 'CFO', changeVsPreviousPct: 0 },
    ];
    const alerts = trendAlertEngine.evaluate(kpis);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].alertType).toBe('threshold_breach');
  });

  it('evaluate — attainment < amberThreshold * 0.7 → severity="critical"', () => {
    const kpis: any[] = [
      { kpiId: 'kcrit-1', kpiName: 'Revenue', ragStatus: 'red', attainmentPct: 30,
        amberThreshold: 70, targetValue: 1000, currentValue: 300, previousValue: 300,
        owner: 'CFO', changeVsPreviousPct: 0 },
    ];
    const alerts = trendAlertEngine.evaluate(kpis);
    const breach = alerts.find((a) => a.alertType === 'threshold_breach');
    // 30 < 70*0.7=49 → critical
    expect(breach?.severity).toBe('critical');
  });

  it('evaluate — red ama hafif → severity="warning"', () => {
    const kpis: any[] = [
      { kpiId: 'kwarn-1', kpiName: 'Revenue', ragStatus: 'red', attainmentPct: 60,
        amberThreshold: 70, targetValue: 1000, currentValue: 600, previousValue: 600,
        owner: 'CFO', changeVsPreviousPct: 0 },
    ];
    const alerts = trendAlertEngine.evaluate(kpis);
    const breach = alerts.find((a) => a.alertType === 'threshold_breach');
    // 60 >= 70*0.7=49 → warning değil critical
    expect(breach?.severity).toBe('warning');
  });

  it('evaluate — |changeVsPreviousPct| >= 20 → rapid_change alert', () => {
    const kpis: any[] = [
      { kpiId: 'krap-1', kpiName: 'NPS', ragStatus: 'green', attainmentPct: 100,
        amberThreshold: 70, targetValue: 50, currentValue: 60, previousValue: 50,
        owner: 'COO', changeVsPreviousPct: 25 },
    ];
    const alerts = trendAlertEngine.evaluate(kpis);
    expect(alerts.some((a) => a.alertType === 'rapid_change')).toBe(true);
  });

  it('evaluate — change < 20% → rapid_change alert YOK', () => {
    const kpis: any[] = [
      { kpiId: 'kslow-1', kpiName: 'NPS', ragStatus: 'green', attainmentPct: 100,
        amberThreshold: 70, targetValue: 50, currentValue: 55, previousValue: 50,
        owner: 'COO', changeVsPreviousPct: 10 },
    ];
    const alerts = trendAlertEngine.evaluate(kpis);
    expect(alerts.some((a) => a.alertType === 'rapid_change')).toBe(false);
  });

  it('evaluate — green KPI + change<20% → boş array', () => {
    const kpis: any[] = [
      { kpiId: 'knone-1', kpiName: 'NPS', ragStatus: 'green', attainmentPct: 100,
        amberThreshold: 70, targetValue: 50, currentValue: 50, previousValue: 50,
        owner: 'COO', changeVsPreviousPct: 0 },
    ];
    expect(trendAlertEngine.evaluate(kpis)).toEqual([]);
  });

  it('getCriticalAlerts — severity=critical + acknowledged=false filter', () => {
    const alerts = trendAlertEngine.getCriticalAlerts();
    expect(alerts.every((a) => a.severity === 'critical' && !a.acknowledged)).toBe(true);
  });
});
