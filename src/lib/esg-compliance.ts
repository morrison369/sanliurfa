/**
 * Phase 214: ESG Compliance
 * ESG scoring, supplier assessment, report generation, framework tracking
 */

import { logger } from './logger';

interface ESGScore {
  scoreId: string;
  entityId: string;
  entityType: 'company' | 'supplier' | 'facility';
  environmental: number;  // 0-100
  social: number;
  governance: number;
  overallESG: number;
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  assessedAt: number;
  validUntil: number;
}

interface SupplierESGAssessment {
  assessmentId: string;
  supplierId: string;
  laborPracticesScore: number;
  environmentalScore: number;
  humanRightsScore: number;
  anticorruptionScore: number;
  overallScore: number;
  redFlags: string[];
  certifications: string[];
  status: 'compliant' | 'improvement_required' | 'non_compliant' | 'pending';
  assessedAt: number;
}

interface ESGReport {
  reportId: string;
  period: string;
  framework: 'GRI' | 'SASB' | 'TCFD' | 'CDP' | 'UN_SDG';
  metrics: Record<string, number | string>;
  narratives: Record<string, string>;
  targetsMet: string[];
  targetsMissed: string[];
  publishedAt?: number;
  status: 'draft' | 'review' | 'published';
  createdAt: number;
}

interface ComplianceFrameworkRequirement {
  requirementId: string;
  framework: string;
  category: string;
  description: string;
  mandatory: boolean;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  evidence: string[];
  dueDate: number;
  lastAssessedAt?: number;
}

class ESGScoreManager {
  private scores: Map<string, ESGScore> = new Map();
  private counter = 0;

  assess(entityId: string, entityType: ESGScore['entityType'], environmental: number, social: number, governance: number): ESGScore {
    const overallESG = environmental * 0.35 + social * 0.35 + governance * 0.3;
    const rating: ESGScore['rating'] =
      overallESG >= 90 ? 'AAA' : overallESG >= 80 ? 'AA' : overallESG >= 70 ? 'A' :
        overallESG >= 60 ? 'BBB' : overallESG >= 50 ? 'BB' : overallESG >= 40 ? 'B' : 'CCC';

    const scoreId = `esg-${Date.now()}-${++this.counter}`;
    const score: ESGScore = {
      scoreId, entityId, entityType, environmental, social, governance,
      overallESG, rating, assessedAt: Date.now(),
      validUntil: Date.now() + 365 * 86400000
    };
    this.scores.set(entityId, score);
    logger.debug('ESG score assessed', { entityId, overallESG: overallESG.toFixed(1), rating });
    return score;
  }

  getScore(entityId: string): ESGScore | undefined {
    return this.scores.get(entityId);
  }

  getPortfolioAvg(): { environmental: number; social: number; governance: number; overall: number } {
    const all = Array.from(this.scores.values());
    if (!all.length) return { environmental: 0, social: 0, governance: 0, overall: 0 };
    return {
      environmental: all.reduce((s, e) => s + e.environmental, 0) / all.length,
      social: all.reduce((s, e) => s + e.social, 0) / all.length,
      governance: all.reduce((s, e) => s + e.governance, 0) / all.length,
      overall: all.reduce((s, e) => s + e.overallESG, 0) / all.length
    };
  }

  getLowRatedEntities(minRating: ESGScore['rating'] = 'BB'): ESGScore[] {
    const ratingOrder = ['CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA'];
    const minIdx = ratingOrder.indexOf(minRating);
    return Array.from(this.scores.values())
      .filter(s => ratingOrder.indexOf(s.rating) < minIdx);
  }
}

class SupplierESGAssessor {
  private assessments: Map<string, SupplierESGAssessment> = new Map();
  private counter = 0;

  assess(supplierId: string, labor: number, environmental: number, humanRights: number, anticorruption: number, certifications: string[] = []): SupplierESGAssessment {
    const overallScore = labor * 0.3 + environmental * 0.3 + humanRights * 0.25 + anticorruption * 0.15;
    const redFlags: string[] = [];
    if (labor < 50) redFlags.push('poor_labor_practices');
    if (humanRights < 50) redFlags.push('human_rights_concerns');
    if (anticorruption < 50) redFlags.push('corruption_risk');
    if (environmental < 40) redFlags.push('environmental_violations');

    const status: SupplierESGAssessment['status'] =
      redFlags.length > 0 ? (overallScore < 50 ? 'non_compliant' : 'improvement_required') : 'compliant';

    const assessmentId = `esga-${Date.now()}-${++this.counter}`;
    const assessment: SupplierESGAssessment = {
      assessmentId, supplierId, laborPracticesScore: labor, environmentalScore: environmental,
      humanRightsScore: humanRights, anticorruptionScore: anticorruption,
      overallScore, redFlags, certifications, status, assessedAt: Date.now()
    };
    this.assessments.set(supplierId, assessment);
    logger.debug('Supplier ESG assessed', { supplierId, overallScore: overallScore.toFixed(1), status });
    return assessment;
  }

  getAssessment(supplierId: string): SupplierESGAssessment | undefined {
    return this.assessments.get(supplierId);
  }

  getNonCompliantSuppliers(): SupplierESGAssessment[] {
    return Array.from(this.assessments.values())
      .filter(a => a.status === 'non_compliant' || a.status === 'improvement_required');
  }

  getWithCertification(cert: string): SupplierESGAssessment[] {
    return Array.from(this.assessments.values()).filter(a => a.certifications.includes(cert));
  }
}

class ESGReportGenerator {
  private reports: Map<string, ESGReport> = new Map();
  private counter = 0;

  create(period: string, framework: ESGReport['framework'], metrics: Record<string, number | string>, narratives: Record<string, string> = {}): ESGReport {
    const reportId = `esgr-${Date.now()}-${++this.counter}`;
    const report: ESGReport = {
      reportId, period, framework, metrics, narratives,
      targetsMet: [], targetsMissed: [], status: 'draft', createdAt: Date.now()
    };
    this.reports.set(reportId, report);
    logger.debug('ESG report created', { reportId, period, framework });
    return report;
  }

  recordTargets(reportId: string, met: string[], missed: string[]): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;
    report.targetsMet = met;
    report.targetsMissed = missed;
    return true;
  }

  publish(reportId: string): boolean {
    const report = this.reports.get(reportId);
    if (report && report.status === 'review') {
      report.status = 'published';
      report.publishedAt = Date.now();
      return true;
    }
    return false;
  }

  getReport(reportId: string): ESGReport | undefined {
    return this.reports.get(reportId);
  }

  getByFramework(framework: ESGReport['framework']): ESGReport[] {
    return Array.from(this.reports.values()).filter(r => r.framework === framework);
  }
}

class ComplianceFrameworkTracker {
  private requirements: Map<string, ComplianceFrameworkRequirement> = new Map();
  private counter = 0;

  addRequirement(framework: string, category: string, description: string, mandatory: boolean, dueDays: number): ComplianceFrameworkRequirement {
    const requirementId = `req-fw-${Date.now()}-${++this.counter}`;
    const requirement: ComplianceFrameworkRequirement = {
      requirementId, framework, category, description, mandatory,
      status: 'not_assessed', evidence: [],
      dueDate: Date.now() + dueDays * 86400000
    };
    this.requirements.set(requirementId, requirement);
    return requirement;
  }

  updateStatus(requirementId: string, status: ComplianceFrameworkRequirement['status'], evidence: string[] = []): boolean {
    const req = this.requirements.get(requirementId);
    if (!req) return false;
    req.status = status;
    req.evidence.push(...evidence);
    req.lastAssessedAt = Date.now();
    return true;
  }

  getComplianceRate(framework: string): number {
    const reqs = Array.from(this.requirements.values()).filter(r => r.framework === framework);
    if (!reqs.length) return 0;
    const compliant = reqs.filter(r => r.status === 'compliant').length;
    return (compliant / reqs.length) * 100;
  }

  getOverdueRequirements(): ComplianceFrameworkRequirement[] {
    return Array.from(this.requirements.values())
      .filter(r => r.dueDate < Date.now() && r.status !== 'compliant' && r.mandatory);
  }

  getGapCount(framework: string): number {
    return Array.from(this.requirements.values())
      .filter(r => r.framework === framework && (r.status === 'non_compliant' || r.status === 'partial')).length;
  }
}

export const esgScoreManager = new ESGScoreManager();
export const supplierESGAssessor = new SupplierESGAssessor();
export const esgReportGenerator = new ESGReportGenerator();
export const complianceFrameworkTracker = new ComplianceFrameworkTracker();

export { ESGScore, SupplierESGAssessment, ESGReport, ComplianceFrameworkRequirement };
