/**
 * Phase 237: Audit Intelligence
 * Audit planning, finding management, control testing, audit analytics
 */

import { logger } from './logger';

interface AuditEngagement {
  engagementId: string;
  name: string;
  type: 'internal' | 'external' | 'regulatory' | 'it' | 'operational' | 'financial';
  scope: string;
  riskRating: 'high' | 'medium' | 'low';
  plannedStartDate: number;
  plannedEndDate: number;
  actualStartDate?: number;
  actualEndDate?: number;
  status: 'planned' | 'fieldwork' | 'reporting' | 'completed' | 'cancelled';
  leadAuditor: string;
  createdAt: number;
}

interface AuditFinding {
  findingId: string;
  engagementId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  controlDeficiency: 'material_weakness' | 'significant_deficiency' | 'control_deficiency' | 'observation';
  rootCause: string;
  recommendation: string;
  managementResponse: string;
  dueDate: number;
  status: 'open' | 'in_progress' | 'remediated' | 'accepted' | 'overdue';
  createdAt: number;
}

interface ControlTestResult {
  testId: string;
  controlId: string;
  engagementId: string;
  testProcedure: string;
  sampleSize: number;
  exceptionsFound: number;
  exceptionRate: number;
  result: 'effective' | 'effective_with_exceptions' | 'ineffective';
  findings: string[];
  testedAt: number;
}

interface AuditAnalyticInsight {
  insightId: string;
  engagementId: string;
  dataAnalyzed: string;
  anomaliesDetected: number;
  patternDescription: string;
  riskImplication: string;
  followUpRequired: boolean;
  generatedAt: number;
}

class AuditEngagementPlanner {
  private engagements: Map<string, AuditEngagement> = new Map();
  private counter = 0;

  plan(name: string, type: AuditEngagement['type'], scope: string, riskRating: AuditEngagement['riskRating'], startDate: number, endDate: number, leadAuditor: string): AuditEngagement {
    const engagementId = `audit-${Date.now()}-${++this.counter}`;
    const engagement: AuditEngagement = {
      engagementId, name, type, scope, riskRating,
      plannedStartDate: startDate, plannedEndDate: endDate,
      status: 'planned', leadAuditor, createdAt: Date.now()
    };
    this.engagements.set(engagementId, engagement);
    logger.debug('Audit engagement planned', { engagementId, name, type, riskRating });
    return engagement;
  }

  updateStatus(engagementId: string, status: AuditEngagement['status']): boolean {
    const eng = this.engagements.get(engagementId);
    if (!eng) return false;
    eng.status = status;
    if (status === 'fieldwork' && !eng.actualStartDate) eng.actualStartDate = Date.now();
    if (status === 'completed') eng.actualEndDate = Date.now();
    return true;
  }

  getActive(): AuditEngagement[] {
    return Array.from(this.engagements.values()).filter(e => e.status === 'fieldwork' || e.status === 'reporting');
  }

  getByRiskRating(riskRating: AuditEngagement['riskRating']): AuditEngagement[] {
    return Array.from(this.engagements.values()).filter(e => e.riskRating === riskRating);
  }

  getEngagement(engagementId: string): AuditEngagement | undefined {
    return this.engagements.get(engagementId);
  }
}

class AuditFindingManager {
  private findings: Map<string, AuditFinding[]> = new Map();
  private counter = 0;

  record(engagementId: string, title: string, description: string, severity: AuditFinding['severity'], deficiency: AuditFinding['controlDeficiency'], rootCause: string, recommendation: string, daysToRemediate = 90): AuditFinding {
    const findingId = `finding-${Date.now()}-${++this.counter}`;
    const finding: AuditFinding = {
      findingId, engagementId, title, description, severity,
      controlDeficiency: deficiency, rootCause, recommendation,
      managementResponse: '', dueDate: Date.now() + daysToRemediate * 86400 * 1000,
      status: 'open', createdAt: Date.now()
    };
    const existing = this.findings.get(engagementId) || [];
    existing.push(finding);
    this.findings.set(engagementId, existing);
    return finding;
  }

  updateStatus(findingId: string, status: AuditFinding['status'], response = ''): boolean {
    for (const findings of this.findings.values()) {
      const f = findings.find(f => f.findingId === findingId);
      if (f) { f.status = status; if (response) f.managementResponse = response; return true; }
    }
    return false;
  }

  getOverdue(): AuditFinding[] {
    const now = Date.now();
    return Array.from(this.findings.values()).flat()
      .filter(f => f.status === 'open' && f.dueDate < now)
      .map(f => ({ ...f, status: 'overdue' as AuditFinding['status'] }));
  }

  getCriticalOpen(): AuditFinding[] {
    return Array.from(this.findings.values()).flat()
      .filter(f => (f.severity === 'critical' || f.severity === 'high') && f.status === 'open');
  }
}

class ControlTestingEngine {
  private results: ControlTestResult[] = [];
  private counter = 0;

  test(controlId: string, engagementId: string, procedure: string, sampleSize: number, exceptionsFound: number, findings: string[] = []): ControlTestResult {
    const exceptionRate = sampleSize > 0 ? (exceptionsFound / sampleSize) * 100 : 0;
    const result: ControlTestResult['result'] =
      exceptionRate === 0 ? 'effective' :
      exceptionRate <= 5 ? 'effective_with_exceptions' : 'ineffective';
    const testId = `ctrltest-${Date.now()}-${++this.counter}`;
    const testResult: ControlTestResult = {
      testId, controlId, engagementId, testProcedure: procedure,
      sampleSize, exceptionsFound, exceptionRate, result, findings, testedAt: Date.now()
    };
    this.results.push(testResult);
    return testResult;
  }

  getIneffectiveControls(): ControlTestResult[] {
    return this.results.filter(r => r.result === 'ineffective');
  }

  getControlTestHistory(controlId: string): ControlTestResult[] {
    return this.results.filter(r => r.controlId === controlId);
  }

  getOverallEffectivenessRate(): number {
    if (!this.results.length) return 100;
    return (this.results.filter(r => r.result === 'effective').length / this.results.length) * 100;
  }
}

class AuditAnalyticsEngine {
  private insights: AuditAnalyticInsight[] = [];
  private counter = 0;

  generate(engagementId: string, dataAnalyzed: string, anomaliesDetected: number, patternDescription: string, riskImplication: string): AuditAnalyticInsight {
    const insightId = `auditinsight-${Date.now()}-${++this.counter}`;
    const insight: AuditAnalyticInsight = {
      insightId, engagementId, dataAnalyzed, anomaliesDetected,
      patternDescription, riskImplication,
      followUpRequired: anomaliesDetected > 0, generatedAt: Date.now()
    };
    this.insights.push(insight);
    logger.debug('Audit analytic insight generated', { engagementId, anomaliesDetected, followUpRequired: insight.followUpRequired });
    return insight;
  }

  getRequiringFollowUp(): AuditAnalyticInsight[] {
    return this.insights.filter(i => i.followUpRequired);
  }

  getByEngagement(engagementId: string): AuditAnalyticInsight[] {
    return this.insights.filter(i => i.engagementId === engagementId);
  }

  getTotalAnomalies(): number {
    return this.insights.reduce((s, i) => s + i.anomaliesDetected, 0);
  }
}

export const auditEngagementPlanner = new AuditEngagementPlanner();
export const auditFindingManager = new AuditFindingManager();
export const controlTestingEngine = new ControlTestingEngine();
export const auditAnalyticsEngine = new AuditAnalyticsEngine();

export {AuditEngagement, AuditFinding, ControlTestResult, AuditAnalyticInsight};