/**
 * Phase 257: Regulatory Intelligence & Compliance Automation
 * Regulatory change tracking, compliance obligation mapping, control testing, regulatory risk scoring
 */

import { logger } from './logger';

interface RegulatoryChange {
  changeId: string;
  regulationName: string;
  jurisdiction: string;
  changeType: 'new_regulation' | 'amendment' | 'guidance' | 'enforcement_action' | 'repeal';
  summary: string;
  effectiveDate: number;
  complianceDeadline: number;
  affectedBusinessAreas: string[];
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  status: 'monitoring' | 'assessing' | 'implementing' | 'compliant' | 'deferred';
  publishedAt: number;
}

interface ComplianceObligation {
  obligationId: string;
  regulationId: string;
  title: string;
  description: string;
  obligationType: 'reporting' | 'disclosure' | 'operational' | 'technical' | 'governance';
  frequency: 'one_time' | 'daily' | 'monthly' | 'quarterly' | 'annual';
  owner: string;
  dueDate: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  evidenceRequired: string[];
  createdAt: number;
}

interface ControlTestResult {
  testId: string;
  controlId: string;
  controlName: string;
  testType: 'design' | 'operating_effectiveness';
  tester: string;
  sampleSize: number;
  exceptionsFound: number;
  exceptionRatePct: number;
  result: 'effective' | 'partially_effective' | 'ineffective';
  remediationRequired: boolean;
  testedAt: number;
}

interface RegulatoryRiskScore {
  riskId: string;
  period: string;
  jurisdictionCount: number;
  pendingObligations: number;
  overdueObligations: number;
  ineffectiveControls: number;
  openEnforcementRisks: number;
  overallRiskScore: number;    // 0-100 (higher = more risk)
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  calculatedAt: number;
}

class RegulatoryChangeTracker {
  private changes: Map<string, RegulatoryChange> = new Map();
  private counter = 0;

  track(regulationName: string, jurisdiction: string, changeType: RegulatoryChange['changeType'], summary: string, effectiveDate: number, deadline: number, affectedAreas: string[], impactLevel: RegulatoryChange['impactLevel']): RegulatoryChange {
    const changeId = `regchange-${Date.now()}-${++this.counter}`;
    const change: RegulatoryChange = {
      changeId, regulationName, jurisdiction, changeType, summary, effectiveDate,
      complianceDeadline: deadline, affectedBusinessAreas: affectedAreas,
      impactLevel, status: 'monitoring', publishedAt: Date.now()
    };
    this.changes.set(changeId, change);
    logger.debug('Regulatory change tracked', { changeId, regulationName, impactLevel });
    return change;
  }

  updateStatus(changeId: string, status: RegulatoryChange['status']): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;
    change.status = status;
    return true;
  }

  getUpcomingDeadlines(days = 90): RegulatoryChange[] {
    const horizon = Date.now() + days * 86400 * 1000;
    return Array.from(this.changes.values())
      .filter(c => c.complianceDeadline <= horizon && c.status !== 'compliant')
      .sort((a, b) => a.complianceDeadline - b.complianceDeadline);
  }

  getByImpact(level: RegulatoryChange['impactLevel']): RegulatoryChange[] {
    return Array.from(this.changes.values()).filter(c => c.impactLevel === level);
  }

  getAllChanges(): RegulatoryChange[] {
    return Array.from(this.changes.values());
  }
}

class ComplianceObligationManager {
  private obligations: Map<string, ComplianceObligation> = new Map();
  private counter = 0;

  create(regulationId: string, title: string, description: string, obligationType: ComplianceObligation['obligationType'], frequency: ComplianceObligation['frequency'], owner: string, dueDate: number, evidenceRequired: string[]): ComplianceObligation {
    const obligationId = `compObl-${Date.now()}-${++this.counter}`;
    const obligation: ComplianceObligation = {
      obligationId, regulationId, title, description, obligationType,
      frequency, owner, dueDate, status: 'pending', evidenceRequired, createdAt: Date.now()
    };
    this.obligations.set(obligationId, obligation);
    return obligation;
  }

  complete(obligationId: string): boolean {
    const obl = this.obligations.get(obligationId);
    if (!obl) return false;
    obl.status = 'completed';
    return true;
  }

  checkOverdue(): number {
    let count = 0;
    for (const obl of this.obligations.values()) {
      if (obl.status === 'pending' || obl.status === 'in_progress') {
        if (Date.now() > obl.dueDate) { obl.status = 'overdue'; count++; }
      }
    }
    return count;
  }

  getByOwner(owner: string): ComplianceObligation[] {
    return Array.from(this.obligations.values()).filter(o => o.owner === owner);
  }

  getOverdue(): ComplianceObligation[] {
    return Array.from(this.obligations.values()).filter(o => o.status === 'overdue');
  }
}

class ControlTestingEngine {
  private results: ControlTestResult[] = [];
  private counter = 0;

  test(controlId: string, controlName: string, testType: ControlTestResult['testType'], tester: string, sampleSize: number, exceptionsFound: number): ControlTestResult {
    const exceptionRatePct = sampleSize > 0 ? (exceptionsFound / sampleSize) * 100 : 0;
    const result: ControlTestResult['result'] =
      exceptionRatePct === 0 ? 'effective' :
      exceptionRatePct <= 5 ? 'partially_effective' : 'ineffective';

    const testId = `ctrltest-${Date.now()}-${++this.counter}`;
    const testResult: ControlTestResult = {
      testId, controlId, controlName, testType, tester, sampleSize, exceptionsFound,
      exceptionRatePct, result, remediationRequired: result === 'ineffective', testedAt: Date.now()
    };
    this.results.push(testResult);
    return testResult;
  }

  getIneffective(): ControlTestResult[] {
    return this.results.filter(r => r.result === 'ineffective');
  }

  getPassRate(): number {
    if (!this.results.length) return 0;
    return (this.results.filter(r => r.result === 'effective').length / this.results.length) * 100;
  }

  getLatestForControl(controlId: string): ControlTestResult | undefined {
    return this.results.filter(r => r.controlId === controlId).pop();
  }
}

class RegulatoryRiskScorer {
  private scores: RegulatoryRiskScore[] = [];
  private counter = 0;

  score(period: string, jurisdictionCount: number, pendingObligations: number, overdueObligations: number, ineffectiveControls: number, openEnforcementRisks: number): RegulatoryRiskScore {
    const riskScore =
      overdueObligations * 10 +
      ineffectiveControls * 8 +
      openEnforcementRisks * 15 +
      pendingObligations * 2 +
      jurisdictionCount * 1;
    const normalized = Math.max(0, Math.min(100, riskScore));
    const riskLevel: RegulatoryRiskScore['riskLevel'] =
      normalized >= 70 ? 'critical' : normalized >= 50 ? 'high' : normalized >= 25 ? 'medium' : 'low';

    const riskId = `regrisk-${Date.now()}-${++this.counter}`;
    const record: RegulatoryRiskScore = {
      riskId, period, jurisdictionCount, pendingObligations, overdueObligations,
      ineffectiveControls, openEnforcementRisks, overallRiskScore: normalized, riskLevel, calculatedAt: Date.now()
    };
    this.scores.push(record);
    return record;
  }

  getLatest(): RegulatoryRiskScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getTrend(): 'worsening' | 'stable' | 'improving' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallRiskScore - this.scores[this.scores.length - 2].overallRiskScore;
    return diff > 5 ? 'worsening' : diff < -5 ? 'improving' : 'stable';
  }
}

export const regulatoryChangeTracker = new RegulatoryChangeTracker();
export const complianceObligationManager = new ComplianceObligationManager();
export const controlTestingEngine = new ControlTestingEngine();
export const regulatoryRiskScorer = new RegulatoryRiskScorer();

export { RegulatoryChange, ComplianceObligation, ControlTestResult, RegulatoryRiskScore };
