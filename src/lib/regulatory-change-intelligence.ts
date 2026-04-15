/**
 * Phase 337: Regulatory Change Intelligence
 * Regulatory monitoring, impact assessment, compliance gap tracking, change readiness
 */

import { logger } from './logger';

interface RegulatoryChangeRecord {
  changeId: string;
  regulationName: string;
  regulatoryBody: string;
  jurisdiction: string;
  changeType: 'new_regulation' | 'amendment' | 'enforcement_action' | 'guidance' | 'repeal';
  category: 'data_privacy' | 'financial' | 'environmental' | 'labor' | 'security' | 'consumer' | 'antitrust' | 'healthcare';
  status: 'proposed' | 'final_rule' | 'effective' | 'under_review' | 'repealed';
  effectiveDate: number;
  complianceDeadline: number;
  penaltyForNonCompliance: string;
  maxFineUSD?: number;
  affectedBusinessAreas: string[];
  summary: string;
  fullTextUrl?: string;
  detectedAt: number;
  lastUpdated: number;
}

interface ImpactAssessmentRecord {
  assessmentId: string;
  changeId: string;
  regulationName: string;
  overallImpact: 'critical' | 'high' | 'medium' | 'low';
  operationalImpact: number;      // 0-100
  financialImpact: number;        // 0-100
  technicalImpact: number;        // 0-100
  reputationalImpact: number;     // 0-100
  estimatedComplianceCostUSD: number;
  estimatedPenaltyRiskUSD: number;
  affectedSystemsCount: number;
  affectedProcessesCount: number;
  requiredChanges: string[];
  readinessGapPct: number;        // how far from compliant
  assessedBy: string;
  assessedAt: number;
}

interface ComplianceGapRecord {
  gapId: string;
  changeId: string;
  regulationName: string;
  requirement: string;
  currentState: string;
  targetState: string;
  gapSeverity: 'critical' | 'major' | 'minor';
  remediationAction: string;
  remediationOwner: string;
  estimatedEffortDays: number;
  estimatedCostUSD: number;
  deadline: number;
  status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk';
  evidenceRequired: string[];
  createdAt: number;
  updatedAt: number;
}

interface ChangeReadinessRecord {
  readinessId: string;
  changeId: string;
  regulationName: string;
  overallReadinessPct: number;
  policyReadinessPct: number;
  processReadinessPct: number;
  systemReadinessPct: number;
  trainingReadinessPct: number;
  documentationReadinessPct: number;
  openGapsCount: number;
  criticalGapsCount: number;
  daysUntilDeadline: number;
  isOnTrack: boolean;
  riskLevel: 'compliant' | 'on_track' | 'at_risk' | 'critical';
  lastAssessedAt: number;
}

class RegulatoryChangeMonitor {
  private changes: Map<string, RegulatoryChangeRecord> = new Map();
  private counter = 0;

  track(name: string, body: string, jurisdiction: string, type: RegulatoryChangeRecord['changeType'], category: RegulatoryChangeRecord['category'], status: RegulatoryChangeRecord['status'], effectiveDate: number, deadline: number, penalty: string, areas: string[], summary: string, maxFineUSD?: number): RegulatoryChangeRecord {
    const changeId = `regchg-${Date.now()}-${++this.counter}`;
    const record: RegulatoryChangeRecord = {
      changeId, regulationName: name, regulatoryBody: body, jurisdiction,
      changeType: type, category, status, effectiveDate, complianceDeadline: deadline,
      penaltyForNonCompliance: penalty, maxFineUSD, affectedBusinessAreas: areas,
      summary, detectedAt: Date.now(), lastUpdated: Date.now()
    };
    this.changes.set(changeId, record);
    logger.debug('Regulatory change tracked', { changeId, name, category, status });
    return record;
  }

  updateStatus(changeId: string, status: RegulatoryChangeRecord['status']): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;
    change.status = status;
    change.lastUpdated = Date.now();
    return true;
  }

  getUpcoming(daysAhead = 90): RegulatoryChangeRecord[] {
    const future = Date.now() + daysAhead * 86400000;
    return Array.from(this.changes.values())
      .filter(c => c.complianceDeadline <= future && c.status !== 'repealed')
      .sort((a, b) => a.complianceDeadline - b.complianceDeadline);
  }

  getByCategory(category: RegulatoryChangeRecord['category']): RegulatoryChangeRecord[] {
    return Array.from(this.changes.values()).filter(c => c.category === category);
  }

  getAll(): RegulatoryChangeRecord[] {
    return Array.from(this.changes.values());
  }

  getChange(id: string): RegulatoryChangeRecord | undefined {
    return this.changes.get(id);
  }
}

class ImpactAssessor {
  private assessments: ImpactAssessmentRecord[] = [];
  private counter = 0;

  assess(changeId: string, regulationName: string, operational: number, financial: number, technical: number, reputational: number, complianceCost: number, penaltyRisk: number, systemsAffected: number, processesAffected: number, requiredChanges: string[], readinessGapPct: number, assessedBy: string): ImpactAssessmentRecord {
    const assessmentId = `impact-${Date.now()}-${++this.counter}`;
    const avgImpact = (operational + financial + technical + reputational) / 4;
    const overall: ImpactAssessmentRecord['overallImpact'] =
      avgImpact >= 75 ? 'critical' : avgImpact >= 50 ? 'high' : avgImpact >= 25 ? 'medium' : 'low';

    const record: ImpactAssessmentRecord = {
      assessmentId, changeId, regulationName, overallImpact: overall,
      operationalImpact: operational, financialImpact: financial,
      technicalImpact: technical, reputationalImpact: reputational,
      estimatedComplianceCostUSD: complianceCost, estimatedPenaltyRiskUSD: penaltyRisk,
      affectedSystemsCount: systemsAffected, affectedProcessesCount: processesAffected,
      requiredChanges, readinessGapPct, assessedBy, assessedAt: Date.now()
    };
    this.assessments.push(record);
    logger.debug('Impact assessed', { assessmentId, regulationName, overall, readinessGapPct });
    return record;
  }

  getCriticalImpacts(): ImpactAssessmentRecord[] {
    return this.assessments.filter(a => a.overallImpact === 'critical');
  }

  getTotalComplianceCost(): number {
    return this.assessments.reduce((s, a) => s + a.estimatedComplianceCostUSD, 0);
  }
}

class ComplianceGapManager {
  private gaps: ComplianceGapRecord[] = [];
  private counter = 0;

  log(changeId: string, regulationName: string, requirement: string, currentState: string, targetState: string, severity: ComplianceGapRecord['gapSeverity'], action: string, owner: string, effortDays: number, cost: number, deadline: number, evidence: string[]): ComplianceGapRecord {
    const gapId = `compgap-${Date.now()}-${++this.counter}`;
    const record: ComplianceGapRecord = {
      gapId, changeId, regulationName, requirement, currentState, targetState,
      gapSeverity: severity, remediationAction: action, remediationOwner: owner,
      estimatedEffortDays: effortDays, estimatedCostUSD: cost, deadline,
      status: 'open', evidenceRequired: evidence, createdAt: Date.now(), updatedAt: Date.now()
    };
    this.gaps.push(record);
    return record;
  }

  updateStatus(gapId: string, status: ComplianceGapRecord['status']): boolean {
    const gap = this.gaps.find(g => g.gapId === gapId);
    if (!gap) return false;
    gap.status = status;
    gap.updatedAt = Date.now();
    return true;
  }

  getCriticalOpen(): ComplianceGapRecord[] {
    return this.gaps.filter(g => g.gapSeverity === 'critical' && g.status === 'open');
  }

  getByRegulation(changeId: string): ComplianceGapRecord[] {
    return this.gaps.filter(g => g.changeId === changeId);
  }

  getTotalRemediationCost(): number {
    return this.gaps.filter(g => g.status !== 'remediated').reduce((s, g) => s + g.estimatedCostUSD, 0);
  }
}

class ChangeReadinessAssessor {
  private readinessRecords: ChangeReadinessRecord[] = [];
  private counter = 0;

  assess(changeId: string, regulationName: string, deadline: number, policyPct: number, processPct: number, systemPct: number, trainingPct: number, documentationPct: number, gaps: ComplianceGapRecord[]): ChangeReadinessRecord {
    const readinessId = `chgready-${Date.now()}-${++this.counter}`;
    const overall = Math.round((policyPct + processPct + systemPct + trainingPct + documentationPct) / 5 * 10) / 10;
    const openGaps = gaps.filter(g => g.changeId === changeId && g.status === 'open').length;
    const criticalGaps = gaps.filter(g => g.changeId === changeId && g.status === 'open' && g.gapSeverity === 'critical').length;
    const daysUntilDeadline = Math.max(0, Math.floor((deadline - Date.now()) / 86400000));
    const isOnTrack = overall >= 70 && criticalGaps === 0;
    const riskLevel: ChangeReadinessRecord['riskLevel'] =
      overall >= 95 ? 'compliant' : overall >= 70 && criticalGaps === 0 ? 'on_track' : overall >= 50 ? 'at_risk' : 'critical';

    const record: ChangeReadinessRecord = {
      readinessId, changeId, regulationName, overallReadinessPct: overall,
      policyReadinessPct: policyPct, processReadinessPct: processPct,
      systemReadinessPct: systemPct, trainingReadinessPct: trainingPct,
      documentationReadinessPct: documentationPct, openGapsCount: openGaps,
      criticalGapsCount: criticalGaps, daysUntilDeadline, isOnTrack, riskLevel,
      lastAssessedAt: Date.now()
    };
    this.readinessRecords.push(record);
    logger.debug('Change readiness assessed', { readinessId, regulationName, overall, riskLevel });
    return record;
  }

  getCriticalReadiness(): ChangeReadinessRecord[] {
    return this.readinessRecords.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'at_risk');
  }

  getAll(): ChangeReadinessRecord[] {
    return [...this.readinessRecords];
  }
}

export const regulatoryChangeMonitor = new RegulatoryChangeMonitor();
export const impactAssessor = new ImpactAssessor();
export const complianceGapManager = new ComplianceGapManager();
export const changeReadinessAssessor = new ChangeReadinessAssessor();

export { RegulatoryChangeRecord, ImpactAssessmentRecord, ComplianceGapRecord, ChangeReadinessRecord };
