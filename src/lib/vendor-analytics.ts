/**
 * Phase 50: Vendor Analytics & Dashboard
 * Performance metrics, analytics dashboard, KPI tracking, reports
 */

import { randomUUID } from 'node:crypto';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface VendorMetrics {
  vendorId: string;
  period: string;
  bookings: number;
  revenue: number;
  avgRating: number;
  returnRate: number;
}

export interface KPI {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  comparison: number;
}

export interface Report {
  vendorId: string;
  type: string;
  data: Record<string, any>;
  generatedAt: number;
}

// ==================== VENDOR ANALYTICS ====================

export class VendorAnalytics {
  private metrics = new Map<string, Map<string, number>>();
  private metricsByPeriod = new Map<string, VendorMetrics>();

  /**
   * Record metric for vendor
   */
  recordMetric(vendorId: string, metric: string, value: number): void {
    if (!this.metrics.has(vendorId)) {
      this.metrics.set(vendorId, new Map());
    }

    this.metrics.get(vendorId)!.set(metric, value);
    logger.debug('Vendor metric recorded', { vendorId, metric, value });
  }

  /**
   * Get metrics for period
   */
  getMetrics(vendorId: string, period: string): VendorMetrics | null {
    const key = vendorId + '_' + period;
    return this.metricsByPeriod.get(key) || null;
  }

  /**
   * Store period metrics
   */
  storeMetrics(metrics: VendorMetrics): void {
    const key = metrics.vendorId + '_' + metrics.period;
    this.metricsByPeriod.set(key, metrics);
    logger.debug('Period metrics stored', { vendorId: metrics.vendorId, period: metrics.period });
  }

  /**
   * Compare vendors on metric
   */
  compareVendors(vendorIds: string[], metric: string): Record<string, number> {
    const comparison: Record<string, number> = {};

    for (const vendorId of vendorIds) {
      const vendorMetrics = this.metrics.get(vendorId);
      if (vendorMetrics) {
        comparison[vendorId] = vendorMetrics.get(metric) || 0;
      }
    }

    return comparison;
  }

  /**
   * Get top performers
   */
  getTopPerformers(metric: string, limit: number = 10): { vendorId: string; value: number }[] {
    const performers: { vendorId: string; value: number }[] = [];

    for (const [vendorId, metrics] of this.metrics) {
      const value = metrics.get(metric);
      if (value !== undefined) {
        performers.push({ vendorId, value });
      }
    }

    return performers.sort((a, b) => b.value - a.value).slice(0, limit);
  }
}

// ==================== KPI MANAGER ====================

export class KPIManager {
  private kpis = new Map<string, (vendorId: string) => number>();
  private targets = new Map<string, Map<string, number>>();
  private healthChecks = new Map<string, string[]>();

  /**
   * Define KPI with calculator function
   */
  defineKPI(name: string, calculator: (vendorId: string) => number): void {
    this.kpis.set(name, calculator);
    logger.debug('KPI defined', { name });
  }

  /**
   * Get KPIs for vendor
   */
  getKPIs(vendorId: string): KPI[] {
    const kpiList: KPI[] = [];

    for (const [name, calculator] of this.kpis) {
      const value = calculator(vendorId);
      const target = this.targets.get(vendorId)?.get(name) || 100;

      const comparison = target > 0 ? (value / target) * 100 : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (comparison > 110) {
        trend = 'up';
      } else if (comparison < 90) {
        trend = 'down';
      }

      kpiList.push({
        name,
        value,
        target,
        trend,
        comparison: Math.round(comparison)
      });
    }

    return kpiList;
  }

  /**
   * Set target for KPI
   */
  setTarget(vendorId: string, kpiName: string, target: number): void {
    if (!this.targets.has(vendorId)) {
      this.targets.set(vendorId, new Map());
    }

    this.targets.get(vendorId)!.set(kpiName, target);
    logger.debug('KPI target set', { vendorId, kpiName, target });
  }

  /**
   * Check vendor health
   */
  checkHealth(vendorId: string): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const kpis = this.getKPIs(vendorId);

    for (const kpi of kpis) {
      if (kpi.trend === 'down' || kpi.comparison < 80) {
        issues.push(`${kpi.name} is ${kpi.comparison}% of target`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// ==================== REPORT GENERATOR ====================

export class ReportGenerator {
  private reports = new Map<string, Report>();
  private reportSchedules = new Map<string, { type: string; frequency: string; lastGenerated: number }>();

  /**
   * Generate report
   */
  generateReport(vendorId: string, type: 'sales' | 'performance' | 'financial'): Report {
    const reportId = `report-${randomUUID()}`;

    const report: Report = {
      vendorId,
      type,
      data: this.generateReportData(type),
      generatedAt: Date.now()
    };

    this.reports.set(reportId, report);
    logger.debug('Report generated', { reportId, vendorId, type });

    return report;
  }

  /**
   * Schedule recurring report
   */
  scheduleReport(vendorId: string, type: string, frequency: string): string {
    const scheduleId = `schedule-${randomUUID()}`;

    this.reportSchedules.set(scheduleId, {
      type,
      frequency,
      lastGenerated: Date.now()
    });

    logger.debug('Report scheduled', { scheduleId, vendorId, type, frequency });

    return scheduleId;
  }

  /**
   * Get reports for vendor
   */
  getReports(vendorId: string, limit: number = 50): Report[] {
    const vendorReports: Report[] = [];

    for (const report of this.reports.values()) {
      if (report.vendorId === vendorId) {
        vendorReports.push(report);
      }
    }

    return vendorReports.sort((a, b) => b.generatedAt - a.generatedAt).slice(0, limit);
  }

  /**
   * Export report
   */
  exportReport(reportId: string, format: 'pdf' | 'csv' | 'json'): string {
    const report = this.reports.get(reportId);
    if (!report) {
      return '';
    }

    const exportUrl = `/exports/${reportId}.${format}`;
    logger.debug('Report exported', { reportId, format });

    return exportUrl;
  }

  /**
   * Generate report data based on type
   */
  private generateReportData(type: string): Record<string, any> {
    switch (type) {
      case 'sales':
        return {
          totalRevenue: 50000,
          totalOrders: 250,
          avgOrderValue: 200,
          topProducts: ['Product A', 'Product B', 'Product C']
        };

      case 'performance':
        return {
          rating: 4.5,
          reviews: 125,
          returnRate: 2.5,
          responseTime: '1.2h'
        };

      case 'financial':
        return {
          totalEarnings: 50000,
          totalCommission: 5000,
          netEarnings: 45000,
          payoutsProcessed: 5
        };

      default:
        return {};
    }
  }
}

// ==================== EXPORTS ====================

export const vendorAnalytics = new VendorAnalytics();
export const kpiManager = new KPIManager();
export const reportGenerator = new ReportGenerator();
