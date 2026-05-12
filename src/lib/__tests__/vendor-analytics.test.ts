/**
 * Unit Tests — vendor/vendor-analytics.ts singleton class managers
 *
 * - VendorAnalytics (recordMetric + storeMetrics + compareVendors + getTopPerformers)
 * - KPIManager (defineKPI + getKPIs + setTarget + checkHealth: trend up/down/stable)
 * - ReportGenerator (generateReport + scheduleReport + getReports)
 */

import { describe, it, expect } from 'vitest';
import {
  vendorAnalytics,
  kpiManager,
  reportGenerator,
} from '../vendor/vendor-analytics';

describe('VendorAnalytics', () => {
  it('recordMetric — exception fırlatmaz', () => {
    expect(() => vendorAnalytics.recordMetric('v-1', 'sales', 1000)).not.toThrow();
  });

  it('compareVendors — vendor için metric değer', () => {
    vendorAnalytics.recordMetric('cmp-v1', 'orders', 100);
    vendorAnalytics.recordMetric('cmp-v2', 'orders', 200);
    const cmp = vendorAnalytics.compareVendors(['cmp-v1', 'cmp-v2'], 'orders');
    expect(cmp['cmp-v1']).toBe(100);
    expect(cmp['cmp-v2']).toBe(200);
  });

  it('compareVendors — bilinmeyen vendor → object\'te yok', () => {
    const cmp = vendorAnalytics.compareVendors(['non-existent'], 'sales');
    expect(cmp['non-existent']).toBeUndefined();
  });

  it('compareVendors — bilinmeyen metric → 0', () => {
    vendorAnalytics.recordMetric('cmp-no-metric', 'a', 50);
    const cmp = vendorAnalytics.compareVendors(['cmp-no-metric'], 'non-existent-metric');
    expect(cmp['cmp-no-metric']).toBe(0);
  });

  it('getTopPerformers — value desc + limit', () => {
    vendorAnalytics.recordMetric('top-1', 'rev', 1000);
    vendorAnalytics.recordMetric('top-2', 'rev', 500);
    vendorAnalytics.recordMetric('top-3', 'rev', 2000);
    const top = vendorAnalytics.getTopPerformers('rev', 5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].value).toBeGreaterThanOrEqual(top[i].value);
    }
  });

  it('storeMetrics + getMetrics — period key', () => {
    vendorAnalytics.storeMetrics({ vendorId: 'sm-v', period: '2026-Q1', revenue: 10000 } as any);
    expect(vendorAnalytics.getMetrics('sm-v', '2026-Q1')?.revenue).toBe(10000);
  });

  it('getMetrics — bilinmeyen → null', () => {
    expect(vendorAnalytics.getMetrics('non-existent', 'p')).toBeNull();
  });
});

describe('KPIManager', () => {
  it('defineKPI + getKPIs — calculator çağırılır', () => {
    kpiManager.defineKPI('test-kpi', () => 50);
    const kpis = kpiManager.getKPIs('v-kpi');
    expect(kpis.some((k) => k.name === 'test-kpi')).toBe(true);
  });

  it('getKPIs — comparison = (value/target)*100; default target 100', () => {
    kpiManager.defineKPI('kpi-comp', () => 80);
    const kpis = kpiManager.getKPIs('v-comp');
    const k = kpis.find((x) => x.name === 'kpi-comp');
    expect(k?.value).toBe(80);
    expect(k?.target).toBe(100);
    expect(k?.comparison).toBe(80);
  });

  it('getKPIs — trend "up" comparison > 110', () => {
    kpiManager.defineKPI('kpi-up', () => 150); // 150% of target 100
    const kpis = kpiManager.getKPIs('v-up');
    expect(kpis.find((k) => k.name === 'kpi-up')?.trend).toBe('up');
  });

  it('getKPIs — trend "down" comparison < 90', () => {
    kpiManager.defineKPI('kpi-down', () => 50);
    const kpis = kpiManager.getKPIs('v-down');
    expect(kpis.find((k) => k.name === 'kpi-down')?.trend).toBe('down');
  });

  it('getKPIs — trend "stable" 90-110', () => {
    kpiManager.defineKPI('kpi-stable', () => 100);
    const kpis = kpiManager.getKPIs('v-stable');
    expect(kpis.find((k) => k.name === 'kpi-stable')?.trend).toBe('stable');
  });

  it('setTarget — target güncellenir', () => {
    kpiManager.defineKPI('kpi-target', () => 90);
    kpiManager.setTarget('v-set', 'kpi-target', 50);
    const kpis = kpiManager.getKPIs('v-set');
    const k = kpis.find((x) => x.name === 'kpi-target');
    expect(k?.target).toBe(50);
    expect(k?.comparison).toBe(180); // 90/50*100
  });

  it('checkHealth — comparison < 80% → unhealthy + issues', () => {
    kpiManager.defineKPI('kpi-health-bad', () => 50); // 50/100 = 50% < 80%
    const result = kpiManager.checkHealth('v-bad');
    expect(result.healthy).toBe(false);
    expect(result.issues.some((i) => i.includes('kpi-health-bad'))).toBe(true);
  });
});

describe('ReportGenerator', () => {
  it('generateReport — id `report-<ts>-<hex>` prefix', () => {
    const report = reportGenerator.generateReport('v-rep', 'sales');
    expect(report.vendorId).toBe('v-rep');
    expect(report.type).toBe('sales');
    expect(report.generatedAt).toBeGreaterThan(0);
  });

  it('generateReport — 3 type (sales/performance/financial)', () => {
    expect(reportGenerator.generateReport('v', 'sales').type).toBe('sales');
    expect(reportGenerator.generateReport('v', 'performance').type).toBe('performance');
    expect(reportGenerator.generateReport('v', 'financial').type).toBe('financial');
  });

  it('scheduleReport — id `schedule-` prefix', () => {
    const id = reportGenerator.scheduleReport('v-sched', 'sales', 'weekly');
    expect(id).toMatch(/^schedule-\d+-[0-9a-f]+$/);
  });

  it('getReports — vendor filter + limit', () => {
    const VID = `v-getrep-${Date.now()}`;
    reportGenerator.generateReport(VID, 'sales');
    reportGenerator.generateReport(VID, 'performance');
    const reports = reportGenerator.getReports(VID, 50);
    expect(reports.length).toBeGreaterThanOrEqual(2);
    expect(reports.every((r) => r.vendorId === VID)).toBe(true);
  });

  it('getReports — generatedAt desc sıralı', () => {
    const VID = `v-sort-${Date.now()}`;
    reportGenerator.generateReport(VID, 'sales');
    reportGenerator.generateReport(VID, 'sales');
    const reports = reportGenerator.getReports(VID);
    for (let i = 1; i < reports.length; i++) {
      expect(reports[i - 1].generatedAt).toBeGreaterThanOrEqual(reports[i].generatedAt);
    }
  });

  it('getReports — bilinmeyen vendor → boş array', () => {
    expect(reportGenerator.getReports('non-existent-vendor')).toEqual([]);
  });
});
