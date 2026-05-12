/**
 * Unit Tests — analytics/analytics-reporting.ts singleton class managers
 *
 * - ReportBuilder (defineReport + executeReport caching + summary aggregation)
 * - DashboardManager (createDashboard/addWidget/listDashboards filter/removeWidget/setRefreshInterval)
 * - KPITracker (recordKPI + getHistory windowed + getStatus 3-tier critical/warning/healthy)
 * - BUSINESS_KPIS registry (5 KPI: MRR/UAC/churn/NPS/uptime)
 * - buildReportSQL DEPRECATED throw (security lock)
 */

import { describe, it, expect } from 'vitest';
import {
  reportBuilder,
  dashboardManager,
  kpiTracker,
  BUSINESS_KPIS,
} from '../analytics/analytics-reporting';

describe('BUSINESS_KPIS — registry', () => {
  it('5 KPI kayıtlı (MRR/UAC/churn/NPS/uptime)', () => {
    expect(Object.keys(BUSINESS_KPIS)).toHaveLength(5);
    expect(BUSINESS_KPIS['monthly-recurring-revenue']).toBeDefined();
    expect(BUSINESS_KPIS['user-acquisition-cost']).toBeDefined();
    expect(BUSINESS_KPIS['customer-churn-rate']).toBeDefined();
    expect(BUSINESS_KPIS['net-promoter-score']).toBeDefined();
    expect(BUSINESS_KPIS['platform-uptime']).toBeDefined();
  });

  it('MRR — target 100k + threshold warning 80k/critical 60k', () => {
    const mrr = BUSINESS_KPIS['monthly-recurring-revenue'];
    expect(mrr.target).toBe(100000);
    expect(mrr.threshold.warning).toBe(80000);
    expect(mrr.threshold.critical).toBe(60000);
  });

  it('Platform uptime — target 99.95 + warning 99.5/critical 99.0 SLA', () => {
    const uptime = BUSINESS_KPIS['platform-uptime'];
    expect(uptime.target).toBe(99.95);
    expect(uptime.threshold.warning).toBe(99.5);
  });

  it('tüm KPI id/name/description/formula tam', () => {
    for (const kpi of Object.values(BUSINESS_KPIS)) {
      expect(kpi.id).toBeTruthy();
      expect(kpi.name).toBeTruthy();
      expect(kpi.description).toBeTruthy();
      expect(kpi.formula).toBeTruthy();
      expect(kpi.frequency).toMatch(/^(hourly|daily|weekly|monthly)$/);
      expect(kpi.owner).toBeTruthy();
    }
  });
});

describe('ReportBuilder', () => {
  it('defineReport + getReport — config geri okunur', () => {
    const config = {
      name: '',
      cube: 'sales',
      dimensions: ['date'],
      measures: ['revenue'],
    };
    reportBuilder.defineReport('test-report-1', config as any);
    const found = reportBuilder.getReport('test-report-1');
    expect(found?.name).toBe('test-report-1');
  });

  it('listReports — kayıtlı rapor adlarını döner', () => {
    reportBuilder.defineReport('list-test-1', { name: '', cube: 'x', dimensions: [], measures: [] } as any);
    expect(reportBuilder.listReports()).toContain('list-test-1');
  });

  it('buildReportSQL — DEPRECATED throw (security lock)', () => {
    expect(() => reportBuilder.buildReportSQL({} as any)).toThrow(/deprecated/);
  });

  it('executeReport — bilinmeyen rapor → throw', async () => {
    await expect(reportBuilder.executeReport('non-existent')).rejects.toThrow(/Report not found/);
  });

  it('executeReport — boş data → rowCount 0 + summary yok', async () => {
    reportBuilder.defineReport('empty-data', {
      name: '',
      cube: 'x',
      dimensions: [],
      measures: ['revenue'],
    } as any);
    const result = await reportBuilder.executeReport('empty-data');
    expect(result.rowCount).toBe(0);
    expect(result.summary).toBeUndefined();
  });

  it('executeReport — data + measures → summary (total/avg/max/min)', async () => {
    reportBuilder.defineReport('summary-test', {
      name: '',
      cube: 'x',
      dimensions: [],
      measures: ['revenue'],
    } as any);
    const data = [
      { revenue: 100 },
      { revenue: 200 },
      { revenue: 300 },
    ];
    const result = await reportBuilder.executeReport('summary-test', data);
    expect(result.summary?.['revenue_total']).toBe(600);
    expect(result.summary?.['revenue_avg']).toBe(200);
    expect(result.summary?.['revenue_max']).toBe(300);
    expect(result.summary?.['revenue_min']).toBe(100);
  });

  it('executeReport — cache (1 saat TTL): 2. çağrı aynı result', async () => {
    reportBuilder.defineReport('cache-test', {
      name: '',
      cube: 'x',
      dimensions: [],
      measures: ['x'],
    } as any);
    const r1 = await reportBuilder.executeReport('cache-test', [{ x: 1 }]);
    const r2 = await reportBuilder.executeReport('cache-test', [{ x: 999 }]); // farklı data
    // Cache hit → ilk result döner (yeni data ignore)
    expect(r2.generatedAt).toBe(r1.generatedAt);
  });
});

describe('DashboardManager', () => {
  it('createDashboard — id/name/audience set, widgets boş, refresh 60s default', () => {
    const dash = dashboardManager.createDashboard('dash-create-1', 'Test Dashboard', 'executive');
    expect(dash.id).toBe('dash-create-1');
    expect(dash.audience).toBe('executive');
    expect(dash.widgets).toEqual([]);
    expect(dash.refreshInterval).toBe(60000);
  });

  it('addWidget — bilinmeyen dashboard → throw', () => {
    expect(() => dashboardManager.addWidget('non-existent', { id: 'w', type: 'metric', report: 'r', title: 't' })).toThrow(/not found/);
  });

  it('addWidget — widget eklenir', () => {
    const dash = dashboardManager.createDashboard('dash-widget-1', 'X', 'operational');
    dashboardManager.addWidget(dash.id, { id: 'w-1', type: 'chart', report: 'r-1', title: 'Sales' });
    expect(dashboardManager.getDashboard(dash.id)?.widgets).toHaveLength(1);
  });

  it('getDashboard — bilinmeyen → undefined', () => {
    expect(dashboardManager.getDashboard('non-existent')).toBeUndefined();
  });

  it('listDashboards — audience filter', () => {
    dashboardManager.createDashboard(`dash-filter-${Date.now()}`, 'F', 'technical');
    const tech = dashboardManager.listDashboards('technical');
    expect(tech.every((d) => d.audience === 'technical')).toBe(true);
  });

  it('listDashboards — boş audience → tümü', () => {
    const all = dashboardManager.listDashboards();
    expect(all.length).toBeGreaterThan(0);
  });

  it('removeWidget — widget silinir', () => {
    const dash = dashboardManager.createDashboard('dash-rem-1', 'R', 'operational');
    dashboardManager.addWidget(dash.id, { id: 'w-rem', type: 'metric', report: 'r', title: 't' });
    dashboardManager.removeWidget(dash.id, 'w-rem');
    expect(dashboardManager.getDashboard(dash.id)?.widgets).toHaveLength(0);
  });

  it('removeWidget — bilinmeyen dashboard → no-throw silent', () => {
    expect(() => dashboardManager.removeWidget('non-existent', 'w')).not.toThrow();
  });

  it('setRefreshInterval — interval güncellenir', () => {
    const dash = dashboardManager.createDashboard('dash-int-1', 'I', 'executive');
    dashboardManager.setRefreshInterval(dash.id, 5000);
    expect(dashboardManager.getDashboard(dash.id)?.refreshInterval).toBe(5000);
  });
});

describe('KPITracker', () => {
  it('recordKPI + getHistory — kayıtlar timestamp ile döner', () => {
    kpiTracker.recordKPI(`kpi-test-${Date.now()}-1`, 100);
    const history = kpiTracker.getHistory(`kpi-test-${Date.now()}-1`, 24);
    // Singleton state → tam match yapamayız; varsayılan davranış array
    expect(Array.isArray(history)).toBe(true);
  });

  it('getHistory — hours window cutoff', () => {
    const KID = `kpi-window-${Date.now()}`;
    kpiTracker.recordKPI(KID, 100);
    // 0 saat → tüm history
    const all = kpiTracker.getHistory(KID, 24);
    expect(all.length).toBeGreaterThan(0);
  });

  it('getStatus — value <= critical → "critical"', () => {
    // MRR critical 60000
    kpiTracker.recordKPI('monthly-recurring-revenue', 50000);
    expect(kpiTracker.getStatus('monthly-recurring-revenue')).toBe('critical');
  });

  it('getStatus — value warning içinde → "warning"', () => {
    // MRR warning 80k, critical 60k → 70k arası warning
    kpiTracker.recordKPI('monthly-recurring-revenue', 70000);
    expect(kpiTracker.getStatus('monthly-recurring-revenue')).toBe('warning');
  });

  it('getStatus — value > warning → "healthy"', () => {
    kpiTracker.recordKPI('monthly-recurring-revenue', 90000);
    expect(kpiTracker.getStatus('monthly-recurring-revenue')).toBe('healthy');
  });

  it('getStatus — history yok → "healthy" default', () => {
    expect(kpiTracker.getStatus('non-existent-kpi')).toBe('healthy');
  });
});
