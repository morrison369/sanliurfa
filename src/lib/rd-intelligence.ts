/**
 * Phase 280: Research & Development Intelligence
 * R&D pipeline, innovation metrics, technology readiness, research ROI
 */

import { logger } from './logger';

interface RDProjectRecord {
  projectId: string;
  projectName: string;
  projectType: 'basic_research' | 'applied_research' | 'development' | 'innovation' | 'pilot';
  technologyArea: string;
  stage: 'ideation' | 'research' | 'prototype' | 'validation' | 'scaling' | 'completed' | 'cancelled';
  trlLevel: number;               // Technology Readiness Level 1-9
  budget: number;
  spentToDate: number;
  budgetUtilizationPct: number;
  teamSize: number;
  startDate: number;
  expectedCompletionDate: number;
  actualCompletionDate?: number;
  expectedROI: number;
  successProbabilityPct: number;
  patentsPending: number;
  publicationsCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: number;
}

interface InnovationMetricsRecord {
  recordId: string;
  period: string;
  ideasSubmitted: number;
  ideasEvaluated: number;
  ideasApproved: number;
  ideasImplemented: number;
  conversionRatePct: number;       // implemented / submitted × 100
  avgTimeToImplementDays: number;
  innovationRevenue: number;        // revenue from innovations this period
  innovationInvestment: number;
  innovationROIPct: number;
  employeeInnovationScore: number;  // 0-100 participation rate
  calculatedAt: number;
}

interface TechnologyReadinessRecord {
  assessmentId: string;
  projectId: string;
  trlLevel: number;                 // 1-9
  trlDescription: string;
  assessmentDate: number;
  assessorName: string;
  evidenceItems: string[];
  gaps: string[];
  nextMilestone: string;
  estimatedWeeksToNextTRL: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ResearchROIRecord {
  recordId: string;
  period: string;
  totalRDSpend: number;
  rdAsRevenuePct: number;
  patentsGenerated: number;
  productsLaunched: number;
  revenueFromNewProducts: number;
  costsAvoided: number;
  totalReturn: number;
  roiPct: number;
  avgTimeToMarketDays: number;
  successRatePct: number;          // projects reaching target stage
  calculatedAt: number;
}

class RDProjectManager {
  private projects: Map<string, RDProjectRecord> = new Map();
  private counter = 0;

  create(name: string, type: RDProjectRecord['projectType'], techArea: string, budget: number, teamSize: number, expectedCompletionDate: number, expectedROI: number): RDProjectRecord {
    const projectId = `rdproj-${Date.now()}-${++this.counter}`;
    const project: RDProjectRecord = {
      projectId, projectName: name, projectType: type, technologyArea: techArea,
      stage: 'ideation', trlLevel: 1, budget, spentToDate: 0, budgetUtilizationPct: 0,
      teamSize, startDate: Date.now(), expectedCompletionDate, expectedROI,
      successProbabilityPct: 50, patentsPending: 0, publicationsCount: 0,
      status: 'active', createdAt: Date.now()
    };
    this.projects.set(projectId, project);
    logger.debug('R&D project created', { projectId, name, type });
    return project;
  }

  advance(projectId: string, newStage: RDProjectRecord['stage'], trlLevel: number, spentToDate: number, successProb: number): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    project.stage = newStage;
    project.trlLevel = Math.max(1, Math.min(9, trlLevel));
    project.spentToDate = spentToDate;
    project.budgetUtilizationPct = project.budget > 0 ? (spentToDate / project.budget) * 100 : 0;
    project.successProbabilityPct = successProb;
    if (newStage === 'completed') project.actualCompletionDate = Date.now();
    return true;
  }

  getTotalRDSpend(): number {
    return Array.from(this.projects.values()).reduce((s, p) => s + p.spentToDate, 0);
  }

  getByStage(stage: RDProjectRecord['stage']): RDProjectRecord[] {
    return Array.from(this.projects.values()).filter(p => p.stage === stage);
  }

  getHighRiskProjects(threshold = 30): RDProjectRecord[] {
    return Array.from(this.projects.values())
      .filter(p => p.status === 'active' && p.successProbabilityPct <= threshold)
      .sort((a, b) => a.successProbabilityPct - b.successProbabilityPct);
  }

  getPipelineValue(): number {
    return Array.from(this.projects.values())
      .filter(p => p.status === 'active')
      .reduce((s, p) => s + p.expectedROI * (p.successProbabilityPct / 100), 0);
  }
}

class InnovationMetricsTracker {
  private records: InnovationMetricsRecord[] = [];
  private counter = 0;

  record(period: string, submitted: number, evaluated: number, approved: number, implemented: number, avgImplDays: number, innovRevenue: number, innovInvestment: number, participationPct: number): InnovationMetricsRecord {
    const conversionRate = submitted > 0 ? (implemented / submitted) * 100 : 0;
    const roi = innovInvestment > 0 ? ((innovRevenue - innovInvestment) / innovInvestment) * 100 : 0;

    const recordId = `innov-${Date.now()}-${++this.counter}`;
    const record: InnovationMetricsRecord = {
      recordId, period, ideasSubmitted: submitted, ideasEvaluated: evaluated,
      ideasApproved: approved, ideasImplemented: implemented, conversionRatePct: conversionRate,
      avgTimeToImplementDays: avgImplDays, innovationRevenue: innovRevenue,
      innovationInvestment: innovInvestment, innovationROIPct: roi,
      employeeInnovationScore: Math.min(100, participationPct), calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): InnovationMetricsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getConversionTrend(): number[] {
    return this.records.map(r => r.conversionRatePct);
  }

  getTotalInnovationROI(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + r.innovationROIPct, 0) / this.records.length;
  }
}

class TechnologyReadinessAssessor {
  private assessments: Map<string, TechnologyReadinessRecord[]> = new Map();
  private counter = 0;

  private trlDescriptions: Record<number, string> = {
    1: 'Basic principles observed', 2: 'Technology concept formulated',
    3: 'Experimental proof of concept', 4: 'Technology validated in lab',
    5: 'Technology validated in relevant environment', 6: 'Technology demonstrated in relevant environment',
    7: 'System prototype demonstrated in operational environment',
    8: 'System complete and qualified', 9: 'Actual system proven in operational environment'
  };

  assess(projectId: string, trlLevel: number, assessorName: string, evidenceItems: string[], gaps: string[], nextMilestone: string, weeksToNext: number): TechnologyReadinessRecord {
    const riskLevel: TechnologyReadinessRecord['riskLevel'] =
      trlLevel <= 3 ? 'high' : trlLevel <= 6 ? 'medium' : 'low';

    const assessmentId = `trl-${Date.now()}-${++this.counter}`;
    const record: TechnologyReadinessRecord = {
      assessmentId, projectId, trlLevel: Math.max(1, Math.min(9, trlLevel)),
      trlDescription: this.trlDescriptions[trlLevel] || 'Unknown TRL',
      assessmentDate: Date.now(), assessorName, evidenceItems, gaps,
      nextMilestone, estimatedWeeksToNextTRL: weeksToNext, riskLevel
    };
    const existing = this.assessments.get(projectId) || [];
    existing.push(record);
    this.assessments.set(projectId, existing);
    return record;
  }

  getLatest(projectId: string): TechnologyReadinessRecord | undefined {
    const history = this.assessments.get(projectId) || [];
    return history[history.length - 1];
  }

  getHighRiskAssessments(): TechnologyReadinessRecord[] {
    return Array.from(this.assessments.values())
      .map(h => h[h.length - 1])
      .filter((r): r is TechnologyReadinessRecord => !!r && r.riskLevel === 'high');
  }

  getAvgTRL(): number {
    const latest = Array.from(this.assessments.values())
      .map(h => h[h.length - 1])
      .filter((r): r is TechnologyReadinessRecord => !!r);
    if (!latest.length) return 0;
    return latest.reduce((s, r) => s + r.trlLevel, 0) / latest.length;
  }
}

class ResearchROICalculator {
  private records: ResearchROIRecord[] = [];
  private counter = 0;

  calculate(period: string, totalRDSpend: number, revenue: number, patents: number, productsLaunched: number, newProductRevenue: number, costsAvoided: number, avgTimeToMarket: number, successRate: number): ResearchROIRecord {
    const totalReturn = newProductRevenue + costsAvoided;
    const roi = totalRDSpend > 0 ? ((totalReturn - totalRDSpend) / totalRDSpend) * 100 : 0;

    const recordId = `rdROI-${Date.now()}-${++this.counter}`;
    const record: ResearchROIRecord = {
      recordId, period, totalRDSpend, rdAsRevenuePct: revenue > 0 ? (totalRDSpend / revenue) * 100 : 0,
      patentsGenerated: patents, productsLaunched, revenueFromNewProducts: newProductRevenue,
      costsAvoided, totalReturn, roiPct: roi, avgTimeToMarketDays: avgTimeToMarket,
      successRatePct: successRate, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('R&D ROI calculated', { period, roi, totalRDSpend });
    return record;
  }

  getLatest(): ResearchROIRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getAvgROI(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + r.roiPct, 0) / this.records.length;
  }

  getROITrend(): number[] {
    return this.records.map(r => r.roiPct);
  }
}

export const rdProjectManager = new RDProjectManager();
export const innovationMetricsTracker = new InnovationMetricsTracker();
export const technologyReadinessAssessor = new TechnologyReadinessAssessor();
export const researchROICalculator = new ResearchROICalculator();

export { RDProjectRecord, InnovationMetricsRecord, TechnologyReadinessRecord, ResearchROIRecord };
