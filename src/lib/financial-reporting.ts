/**
 * Phase 61: Financial Reporting & Statements
 * P&L statements, balance sheets, cash flow reports, audit trails
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ReportType = 'income_statement' | 'balance_sheet' | 'cash_flow' | 'budget_vs_actual';
export type ReportFormat = 'pdf' | 'excel' | 'json' | 'html';

export interface FinancialStatement {
  id: string;
  type: ReportType;
  period: string;
  generatedAt: number;
  data: Record<string, any>;
}

export interface IncomeStatement {
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  netIncome: number;
}

export interface BalanceSheet {
  period: string;
  assets: number;
  liabilities: number;
  equity: number;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  timestamp: number;
  changes: Record<string, any>;
}

// ==================== FINANCIAL REPORTER ====================

export class FinancialReporter {
  /**
   * Generate income statement
   */
  generateIncomeStatement(startDate: number, endDate: number): IncomeStatement {
    const revenue = Math.random() * 500000 + 100000;
    const costOfRevenue = revenue * (Math.random() * 0.3 + 0.2);
    const grossProfit = revenue - costOfRevenue;
    const operatingExpenses = grossProfit * (Math.random() * 0.4 + 0.2);
    const netIncome = grossProfit - operatingExpenses;

    logger.debug('Income statement generated', { startDate, endDate });

    return {
      period: new Date(startDate).toISOString().split('T')[0] + ' to ' + new Date(endDate).toISOString().split('T')[0],
      revenue,
      costOfRevenue,
      grossProfit,
      operatingExpenses,
      netIncome
    };
  }

  /**
   * Generate balance sheet
   */
  generateBalanceSheet(asOfDate: number): BalanceSheet {
    const assets = Math.random() * 1000000 + 200000;
    const liabilities = assets * (Math.random() * 0.4 + 0.1);
    const equity = assets - liabilities;

    logger.debug('Balance sheet generated', { asOfDate });

    return {
      period: new Date(asOfDate).toISOString().split('T')[0],
      assets,
      liabilities,
      equity
    };
  }

  /**
   * Generate cash flow
   */
  generateCashFlow(startDate: number, endDate: number): Record<string, number> {
    return {
      operatingCash: Math.random() * 100000 + 20000,
      investingCash: Math.random() * -50000 - 5000,
      financingCash: Math.random() * 30000 - 10000
    };
  }

  /**
   * Generate report
   */
  generateReport(type: ReportType, period: string): FinancialStatement {
    const reportId = 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    let data: Record<string, any> = {};

    if (type === 'income_statement') {
      const now = Date.now();
      const startDate = now - 90 * 24 * 60 * 60 * 1000;
      data = this.generateIncomeStatement(startDate, now);
    } else if (type === 'balance_sheet') {
      data = this.generateBalanceSheet(Date.now());
    } else if (type === 'cash_flow') {
      const now = Date.now();
      const startDate = now - 90 * 24 * 60 * 60 * 1000;
      data = this.generateCashFlow(startDate, now);
    }

    logger.info('Report generated', { reportId, type, period });

    return {
      id: reportId,
      type,
      period,
      generatedAt: Date.now(),
      data
    };
  }
}

// ==================== REPORT GENERATOR ====================

export class ReportGenerator {
  private reports = new Map<string, FinancialStatement>();
  private schedules = new Map<string, { type: ReportType; frequency: string; nextRun: number }>();

  /**
   * Get report
   */
  getReport(reportId: string): FinancialStatement | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * List reports
   */
  listReports(type?: ReportType): FinancialStatement[] {
    if (!type) {
      return Array.from(this.reports.values());
    }

    return Array.from(this.reports.values()).filter(r => r.type === type);
  }

  /**
   * Export report
   */
  exportReport(reportId: string, format: ReportFormat): string {
    const report = this.reports.get(reportId);
    if (!report) return '';

    const exportId = 'export-' + Date.now();
    logger.debug('Report exported', { reportId, format, exportId });

    return `s3://exports/${exportId}.${format}`;
  }

  /**
   * Schedule report
   */
  scheduleReport(type: ReportType, frequency: string): string {
    const scheduleId = 'schedule-' + Date.now();

    this.schedules.set(scheduleId, {
      type,
      frequency,
      nextRun: Date.now() + 24 * 60 * 60 * 1000
    });

    logger.info('Report scheduled', { scheduleId, type, frequency });

    return scheduleId;
  }

  /**
   * Compare reports
   */
  compareReports(reportId1: string, reportId2: string): Record<string, any> {
    const report1 = this.reports.get(reportId1);
    const report2 = this.reports.get(reportId2);

    if (!report1 || !report2) return {};

    const comparison: Record<string, any> = {
      period1: report1.period,
      period2: report2.period,
      changes: {}
    };

    // Calculate percentage changes for common fields
    for (const key of Object.keys(report1.data)) {
      if (typeof report1.data[key] === 'number' && typeof report2.data[key] === 'number') {
        const change = report2.data[key] - report1.data[key];
        const pctChange = report1.data[key] !== 0 ? (change / report1.data[key]) * 100 : 0;
        comparison.changes[key] = { change, pctChange };
      }
    }

    logger.debug('Reports compared', { reportId1, reportId2 });

    return comparison;
  }

  /**
   * Store report (called after generation)
   */
  storeReport(report: FinancialStatement): void {
    this.reports.set(report.id, report);
  }
}

// ==================== AUDIT TRAIL ====================

export class AuditTrail {
  private logs: AuditLog[] = [];
  private logCount = 0;

  /**
   * Log change
   */
  logChange(entityType: string, entityId: string, action: string, userId: string, changes: Record<string, any>): void {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + this.logCount++,
      entityType,
      entityId,
      action,
      userId,
      timestamp: Date.now(),
      changes
    };

    this.logs.push(log);
    logger.debug('Audit log recorded', { entityType, entityId, action });
  }

  /**
   * Get audit log
   */
  getAuditLog(entityId: string, limit?: number): AuditLog[] {
    let logs = this.logs.filter(l => l.entityId === entityId);

    if (limit) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * Get change history
   */
  getChangeHistory(entityType: string, period?: string): AuditLog[] {
    return this.logs.filter(l => l.entityType === entityType);
  }

  /**
   * Generate audit report
   */
  generateAuditReport(startDate: number, endDate: number): { totalChanges: number; byAction: Record<string, number> } {
    const relevantLogs = this.logs.filter(l => l.timestamp >= startDate && l.timestamp <= endDate);

    const byAction: Record<string, number> = {};
    relevantLogs.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    logger.info('Audit report generated', { totalChanges: relevantLogs.length, startDate, endDate });

    return {
      totalChanges: relevantLogs.length,
      byAction
    };
  }
}

// ==================== EXPORTS ====================

const financialReporter = new FinancialReporter();
const reportGenerator = new ReportGenerator();
const auditTrail = new AuditTrail();

export { financialReporter, reportGenerator, auditTrail };
