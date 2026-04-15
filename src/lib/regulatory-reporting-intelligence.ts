/**
 * Phase 301: Regulatory Reporting Intelligence
 * Filing management, deadline tracking, compliance reporting, regulatory change monitoring
 */

import { logger } from './logger';

interface RegulatoryFilingRecord {
  filingId: string;
  filingName: string;
  regulatoryBody: string;
  jurisdiction: string;
  filingType: 'annual' | 'quarterly' | 'monthly' | 'ad_hoc' | 'incident' | 'periodic';
  category: 'financial' | 'tax' | 'environmental' | 'labor' | 'safety' | 'data_privacy' | 'securities' | 'customs';
  dueDate: number;
  submittedDate?: number;
  status: 'pending' | 'in_preparation' | 'submitted' | 'accepted' | 'rejected' | 'overdue';
  assignedTeam: string;
  penaltyForLateFiling: number;
  filingFeeUSD: number;
  documentsRequired: string[];
  notes: string;
  isRecurring: boolean;
  nextRecurrenceDate?: number;
  createdAt: number;
}

interface RegulatoryChangeRecord {
  changeId: string;
  regulatoryBody: string;
  jurisdiction: string;
  changeSummary: string;
  effectiveDate: number;
  impactLevel: 'high' | 'medium' | 'low';
  affectedBusinessAreas: string[];
  complianceDeadline: number;
  estimatedComplianceCostUSD: number;
  actionsRequired: string[];
  status: 'identified' | 'assessing' | 'implementing' | 'compliant';
  identifiedAt: number;
}

interface ComplianceReportRecord {
  reportId: string;
  period: string;
  totalFilings: number;
  onTimeFilings: number;
  lateFilings: number;
  pendingFilings: number;
  onTimeRatePct: number;
  totalPenaltiesUSD: number;
  totalFilingFeesUSD: number;
  complianceScoreByCategory: Record<string, number>;
  overallComplianceScore: number;
  regulatoryChangesMonitored: number;
  calculatedAt: number;
}

interface FilingDeadlineAlert {
  alertId: string;
  filingId: string;
  filingName: string;
  dueDate: number;
  daysUntilDue: number;
  alertLevel: 'critical' | 'warning' | 'info';
  penaltyIfLate: number;
  assignedTeam: string;
  generatedAt: number;
}

class RegulatoryFilingManager {
  private filings: Map<string, RegulatoryFilingRecord> = new Map();
  private counter = 0;

  register(name: string, body: string, jurisdiction: string, type: RegulatoryFilingRecord['filingType'], category: RegulatoryFilingRecord['category'], dueDate: number, team: string, penalty: number, fee: number, docs: string[], isRecurring: boolean): RegulatoryFilingRecord {
    const filingId = `filing-${Date.now()}-${++this.counter}`;
    const now = Date.now();
    const status: RegulatoryFilingRecord['status'] = dueDate < now ? 'overdue' : 'pending';

    const record: RegulatoryFilingRecord = {
      filingId, filingName: name, regulatoryBody: body, jurisdiction, filingType: type,
      category, dueDate, status, assignedTeam: team, penaltyForLateFiling: penalty,
      filingFeeUSD: fee, documentsRequired: docs, notes: '', isRecurring,
      createdAt: now
    };
    this.filings.set(filingId, record);
    logger.debug('Regulatory filing registered', { filingId, name, dueDate, status });
    return record;
  }

  submit(filingId: string): boolean {
    const filing = this.filings.get(filingId);
    if (!filing) return false;
    filing.submittedDate = Date.now();
    filing.status = 'submitted';
    return true;
  }

  accept(filingId: string): boolean {
    const filing = this.filings.get(filingId);
    if (!filing) return false;
    filing.status = 'accepted';
    return true;
  }

  getOverdueFilings(): RegulatoryFilingRecord[] {
    const now = Date.now();
    return Array.from(this.filings.values())
      .filter(f => f.status !== 'accepted' && f.status !== 'submitted' && f.dueDate < now)
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  getUpcomingFilings(daysAhead = 30): RegulatoryFilingRecord[] {
    const cutoff = Date.now() + daysAhead * 86400000;
    return Array.from(this.filings.values())
      .filter(f => f.status === 'pending' && f.dueDate <= cutoff && f.dueDate >= Date.now())
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  getTotalPotentialPenalties(): number {
    return Array.from(this.filings.values())
      .filter(f => f.status === 'overdue')
      .reduce((s, f) => s + f.penaltyForLateFiling, 0);
  }

  getFiling(id: string): RegulatoryFilingRecord | undefined {
    return this.filings.get(id);
  }

  getAll(): RegulatoryFilingRecord[] {
    return Array.from(this.filings.values());
  }
}

class RegulatoryChangeMonitor {
  private changes: RegulatoryChangeRecord[] = [];
  private counter = 0;

  track(body: string, jurisdiction: string, summary: string, effectiveDate: number, impact: RegulatoryChangeRecord['impactLevel'], areas: string[], complianceDeadline: number, cost: number, actions: string[]): RegulatoryChangeRecord {
    const changeId = `regchange-${Date.now()}-${++this.counter}`;
    const record: RegulatoryChangeRecord = {
      changeId, regulatoryBody: body, jurisdiction, changeSummary: summary,
      effectiveDate, impactLevel: impact, affectedBusinessAreas: areas,
      complianceDeadline, estimatedComplianceCostUSD: cost,
      actionsRequired: actions, status: 'identified', identifiedAt: Date.now()
    };
    this.changes.push(record);
    logger.debug('Regulatory change tracked', { changeId, impact, jurisdiction });
    return record;
  }

  updateStatus(changeId: string, status: RegulatoryChangeRecord['status']): boolean {
    const change = this.changes.find(c => c.changeId === changeId);
    if (!change) return false;
    change.status = status;
    return true;
  }

  getHighImpactChanges(): RegulatoryChangeRecord[] {
    return this.changes.filter(c => c.impactLevel === 'high' && c.status !== 'compliant');
  }

  getTotalComplianceCost(): number {
    return this.changes.filter(c => c.status !== 'compliant').reduce((s, c) => s + c.estimatedComplianceCostUSD, 0);
  }
}

class ComplianceReportGenerator {
  private reports: ComplianceReportRecord[] = [];
  private counter = 0;

  generate(period: string, filings: RegulatoryFilingRecord[]): ComplianceReportRecord {
    const total = filings.length;
    const onTime = filings.filter(f => f.status === 'accepted' || f.status === 'submitted').length;
    const late = filings.filter(f => f.status === 'overdue').length;
    const pending = filings.filter(f => f.status === 'pending' || f.status === 'in_preparation').length;
    const penalties = filings.filter(f => f.status === 'overdue').reduce((s, f) => s + f.penaltyForLateFiling, 0);
    const fees = filings.reduce((s, f) => s + f.filingFeeUSD, 0);

    const byCategory: Record<string, { total: number; compliant: number }> = {};
    filings.forEach(f => {
      if (!byCategory[f.category]) byCategory[f.category] = { total: 0, compliant: 0 };
      byCategory[f.category].total++;
      if (f.status === 'accepted' || f.status === 'submitted') byCategory[f.category].compliant++;
    });
    const complianceByCategory: Record<string, number> = {};
    Object.entries(byCategory).forEach(([cat, val]) => {
      complianceByCategory[cat] = val.total > 0 ? Math.round((val.compliant / val.total) * 100) : 0;
    });

    const overallScore = total > 0 ? Math.round((onTime / total) * 100) : 100;
    const reportId = `comprep-${Date.now()}-${++this.counter}`;
    const report: ComplianceReportRecord = {
      reportId, period, totalFilings: total, onTimeFilings: onTime, lateFilings: late,
      pendingFilings: pending, onTimeRatePct: overallScore,
      totalPenaltiesUSD: penalties, totalFilingFeesUSD: fees,
      complianceScoreByCategory: complianceByCategory,
      overallComplianceScore: overallScore, regulatoryChangesMonitored: 0,
      calculatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): ComplianceReportRecord | undefined {
    return this.reports[this.reports.length - 1];
  }

  getComplianceTrend(): number[] {
    return this.reports.map(r => r.overallComplianceScore);
  }
}

class FilingDeadlineAlertEngine {
  private alerts: FilingDeadlineAlert[] = [];
  private counter = 0;

  generateAlerts(filings: RegulatoryFilingRecord[]): FilingDeadlineAlert[] {
    const now = Date.now();
    const newAlerts: FilingDeadlineAlert[] = [];

    filings.forEach(f => {
      if (f.status === 'accepted') return;
      const daysUntil = Math.ceil((f.dueDate - now) / 86400000);
      if (daysUntil > 30) return;

      const alertLevel: FilingDeadlineAlert['alertLevel'] =
        daysUntil <= 3 ? 'critical' : daysUntil <= 14 ? 'warning' : 'info';
      const alertId = `alert-${Date.now()}-${++this.counter}`;
      const alert: FilingDeadlineAlert = {
        alertId, filingId: f.filingId, filingName: f.filingName,
        dueDate: f.dueDate, daysUntilDue: daysUntil, alertLevel,
        penaltyIfLate: f.penaltyForLateFiling, assignedTeam: f.assignedTeam,
        generatedAt: now
      };
      this.alerts.push(alert);
      newAlerts.push(alert);
    });
    return newAlerts;
  }

  getCriticalAlerts(): FilingDeadlineAlert[] {
    return this.alerts.filter(a => a.alertLevel === 'critical').sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  getAlertsByTeam(team: string): FilingDeadlineAlert[] {
    return this.alerts.filter(a => a.assignedTeam === team);
  }
}

export const regulatoryFilingManager = new RegulatoryFilingManager();
export const regulatoryChangeMonitor = new RegulatoryChangeMonitor();
export const complianceReportGenerator = new ComplianceReportGenerator();
export const filingDeadlineAlertEngine = new FilingDeadlineAlertEngine();

export { RegulatoryFilingRecord, RegulatoryChangeRecord, ComplianceReportRecord, FilingDeadlineAlert };
