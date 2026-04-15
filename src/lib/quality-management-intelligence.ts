/**
 * Phase 279: Quality Management Intelligence
 * Defect tracking, root cause analysis, quality costs, supplier quality, continuous improvement
 */

import { logger } from './logger';

interface DefectRecord {
  defectId: string;
  productId: string;
  productName: string;
  defectType: 'design' | 'manufacturing' | 'material' | 'process' | 'software' | 'documentation';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  detectionPhase: 'design' | 'incoming_inspection' | 'in_process' | 'final_inspection' | 'customer';
  rootCause?: string;
  quantity: number;
  costOfDefect: number;
  reworkable: boolean;
  status: 'open' | 'in_analysis' | 'resolved' | 'accepted_risk';
  reportedAt: number;
  resolvedAt?: number;
}

interface QualityCostRecord {
  costId: string;
  period: string;
  preventionCost: number;      // training, process design, audits
  appraisalCost: number;       // inspection, testing, calibration
  internalFailureCost: number; // scrap, rework, downtime
  externalFailureCost: number; // warranty, returns, liability
  totalCOQ: number;            // Cost of Quality
  coqAsRevenuePct: number;     // COQ as % of revenue
  revenueBase: number;
  calculatedAt: number;
}

interface SupplierQualityRecord {
  recordId: string;
  supplierId: string;
  supplierName: string;
  period: string;
  incomingLotsInspected: number;
  lotsAccepted: number;
  lotsRejected: number;
  defectivePartsPerMillion: number;   // DPPM
  onTimeDeliveryRatePct: number;
  correctiveActionsOpen: number;
  qualityRatingScore: number;         // 0-100
  certificationStatus: 'certified' | 'probation' | 'disqualified';
  calculatedAt: number;
}

interface ContinuousImprovementRecord {
  projectId: string;
  projectName: string;
  methodology: 'kaizen' | 'six_sigma' | 'lean' | '5s' | 'dmaic' | 'pdca';
  problemStatement: string;
  targetMetric: string;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  improvementPct: number;
  costSavings: number;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  startDate: number;
  completedDate?: number;
  createdAt: number;
}

class DefectTrackingSystem {
  private defects: Map<string, DefectRecord[]> = new Map();
  private counter = 0;

  report(productId: string, productName: string, type: DefectRecord['defectType'], severity: DefectRecord['severity'], phase: DefectRecord['detectionPhase'], quantity: number, costPerDefect: number, reworkable: boolean): DefectRecord {
    const defectId = `defect-${Date.now()}-${++this.counter}`;
    const record: DefectRecord = {
      defectId, productId, productName, defectType: type, severity, detectionPhase: phase,
      quantity, costOfDefect: quantity * costPerDefect, reworkable,
      status: 'open', reportedAt: Date.now()
    };
    const existing = this.defects.get(productId) || [];
    existing.push(record);
    this.defects.set(productId, existing);
    logger.debug('Defect reported', { defectId, productId, severity, quantity });
    return record;
  }

  resolve(defectId: string, productId: string, rootCause: string): boolean {
    const defects = this.defects.get(productId) || [];
    const defect = defects.find(d => d.defectId === defectId);
    if (!defect) return false;
    defect.rootCause = rootCause;
    defect.status = 'resolved';
    defect.resolvedAt = Date.now();
    return true;
  }

  getDefectRate(productId: string): number {
    const defects = this.defects.get(productId) || [];
    return defects.filter(d => d.status !== 'accepted_risk').reduce((s, d) => s + d.quantity, 0);
  }

  getCriticalOpen(): DefectRecord[] {
    return Array.from(this.defects.values())
      .flat()
      .filter(d => d.severity === 'critical' && d.status === 'open')
      .sort((a, b) => a.reportedAt - b.reportedAt);
  }

  getEscapedDefects(): DefectRecord[] {
    return Array.from(this.defects.values())
      .flat()
      .filter(d => d.detectionPhase === 'customer');
  }

  getTotalCostOfDefects(): number {
    return Array.from(this.defects.values()).flat().reduce((s, d) => s + d.costOfDefect, 0);
  }
}

class QualityCostAnalyzer {
  private records: QualityCostRecord[] = [];
  private counter = 0;

  analyze(period: string, prevention: number, appraisal: number, internalFailure: number, externalFailure: number, revenueBase: number): QualityCostRecord {
    const totalCOQ = prevention + appraisal + internalFailure + externalFailure;
    const coqId = `coq-${Date.now()}-${++this.counter}`;
    const record: QualityCostRecord = {
      costId: coqId, period, preventionCost: prevention, appraisalCost: appraisal,
      internalFailureCost: internalFailure, externalFailureCost: externalFailure,
      totalCOQ, coqAsRevenuePct: revenueBase > 0 ? (totalCOQ / revenueBase) * 100 : 0,
      revenueBase, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): QualityCostRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getOptimalRatio(): { preventionRatio: number; appraisalRatio: number; failureRatio: number } | null {
    const latest = this.getLatest();
    if (!latest || latest.totalCOQ === 0) return null;
    return {
      preventionRatio: (latest.preventionCost / latest.totalCOQ) * 100,
      appraisalRatio: (latest.appraisalCost / latest.totalCOQ) * 100,
      failureRatio: ((latest.internalFailureCost + latest.externalFailureCost) / latest.totalCOQ) * 100
    };
  }
}

class SupplierQualityManager {
  private records: Map<string, SupplierQualityRecord[]> = new Map();
  private counter = 0;

  evaluate(supplierId: string, supplierName: string, period: string, lotsInspected: number, lotsAccepted: number, totalParts: number, defectiveParts: number, onTimeDeliveryPct: number, openCAs: number): SupplierQualityRecord {
    const lotsRejected = lotsInspected - lotsAccepted;
    const dppm = totalParts > 0 ? (defectiveParts / totalParts) * 1000000 : 0;
    const acceptanceRate = lotsInspected > 0 ? (lotsAccepted / lotsInspected) * 100 : 0;
    const qualityScore = Math.max(0,
      acceptanceRate * 0.4 + onTimeDeliveryPct * 0.3 +
      Math.max(0, 100 - dppm / 100) * 0.2 +
      Math.max(0, 100 - openCAs * 10) * 0.1
    );
    const certification: SupplierQualityRecord['certificationStatus'] =
      qualityScore >= 80 ? 'certified' : qualityScore >= 60 ? 'probation' : 'disqualified';

    const recordId = `squality-${Date.now()}-${++this.counter}`;
    const record: SupplierQualityRecord = {
      recordId, supplierId, supplierName, period, incomingLotsInspected: lotsInspected,
      lotsAccepted, lotsRejected, defectivePartsPerMillion: dppm, onTimeDeliveryRatePct: onTimeDeliveryPct,
      correctiveActionsOpen: openCAs, qualityRatingScore: Math.min(100, qualityScore),
      certificationStatus: certification, calculatedAt: Date.now()
    };
    const history = this.records.get(supplierId) || [];
    history.push(record);
    this.records.set(supplierId, history);
    return record;
  }

  getProbationSuppliers(): SupplierQualityRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is SupplierQualityRecord => !!r && r.certificationStatus !== 'certified')
      .sort((a, b) => a.qualityRatingScore - b.qualityRatingScore);
  }

  getLatest(supplierId: string): SupplierQualityRecord | undefined {
    const history = this.records.get(supplierId) || [];
    return history[history.length - 1];
  }
}

class ContinuousImprovementTracker {
  private projects: Map<string, ContinuousImprovementRecord> = new Map();
  private counter = 0;

  create(name: string, methodology: ContinuousImprovementRecord['methodology'], problem: string, targetMetric: string, baseline: number, target: number): ContinuousImprovementRecord {
    const projectId = `ci-${Date.now()}-${++this.counter}`;
    const record: ContinuousImprovementRecord = {
      projectId, projectName: name, methodology, problemStatement: problem, targetMetric,
      baselineValue: baseline, targetValue: target, currentValue: baseline, improvementPct: 0,
      costSavings: 0, status: 'planning', startDate: Date.now(), createdAt: Date.now()
    };
    this.projects.set(projectId, record);
    return record;
  }

  updateProgress(projectId: string, currentValue: number, costSavings: number): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    project.currentValue = currentValue;
    project.costSavings = costSavings;
    const range = project.baselineValue - project.targetValue;
    const achieved = project.baselineValue - currentValue;
    project.improvementPct = range !== 0 ? (achieved / range) * 100 : 0;
    if (project.status === 'planning') project.status = 'in_progress';
    if (Math.abs(currentValue - project.targetValue) < Math.abs(project.baselineValue - project.targetValue) * 0.05) {
      project.status = 'completed';
      project.completedDate = Date.now();
    }
    return true;
  }

  getTotalCostSavings(): number {
    return Array.from(this.projects.values())
      .filter(p => p.status === 'completed')
      .reduce((s, p) => s + p.costSavings, 0);
  }

  getActiveProjects(): ContinuousImprovementRecord[] {
    return Array.from(this.projects.values()).filter(p => p.status === 'in_progress');
  }

  getByMethodology(method: ContinuousImprovementRecord['methodology']): ContinuousImprovementRecord[] {
    return Array.from(this.projects.values()).filter(p => p.methodology === method);
  }
}

export const defectTrackingSystem = new DefectTrackingSystem();
export const qualityCostAnalyzer = new QualityCostAnalyzer();
export const supplierQualityManager = new SupplierQualityManager();
export const continuousImprovementTracker = new ContinuousImprovementTracker();

export { DefectRecord, QualityCostRecord, SupplierQualityRecord, ContinuousImprovementRecord };
