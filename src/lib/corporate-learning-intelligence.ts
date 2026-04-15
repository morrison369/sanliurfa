/**
 * Phase 334: Corporate Learning Intelligence
 * Training effectiveness, L&D ROI, skill development tracking, learning analytics
 */

import { logger } from './logger';

interface TrainingProgramRecord {
  programId: string;
  programName: string;
  category: 'technical' | 'leadership' | 'compliance' | 'soft_skills' | 'product' | 'sales' | 'onboarding';
  deliveryMethod: 'instructor_led' | 'e_learning' | 'blended' | 'on_the_job' | 'mentoring' | 'workshop';
  targetAudience: string;
  durationHours: number;
  enrollments: number;
  completions: number;
  completionRatePct: number;
  avgAssessmentScore: number;      // 0-100
  avgSatisfactionScore: number;    // 0-5
  costPerLearnerUSD: number;
  totalCostUSD: number;
  businessImpact: 'critical' | 'high' | 'medium' | 'low';
  isCompliance: boolean;
  complianceDeadline?: number;
  createdAt: number;
}

interface LearningOutcomeRecord {
  outcomeId: string;
  programId: string;
  programName: string;
  learnerId: string;
  learnerName: string;
  department: string;
  preAssessmentScore: number;
  postAssessmentScore: number;
  knowledgeGain: number;           // post - pre
  skillsApplied: string[];
  behaviorChangeObserved: boolean;
  performanceImprovementPct: number;
  timeToApplyDays: number;
  retentionScore30Day: number;     // 0-100, assessed 30 days after
  completedAt: number;
}

interface LDRoiRecord {
  roiId: string;
  programId: string;
  programName: string;
  period: string;
  totalInvestmentUSD: number;
  directBenefitsUSD: number;       // measurable performance gains
  indirectBenefitsUSD: number;     // reduced turnover, compliance savings
  totalBenefitsUSD: number;
  roiPct: number;                  // (benefits - cost) / cost * 100
  paybackPeriodMonths: number;
  benefitsCostRatio: number;       // benefits / cost
  intangibleBenefits: string[];
  methodologyUsed: 'kirkpatrick' | 'phillips_roi' | 'custom';
  confidenceLevel: 'high' | 'medium' | 'low';
  calculatedAt: number;
}

interface SkillDevelopmentRecord {
  devId: string;
  learnerId: string;
  learnerName: string;
  department: string;
  skillName: string;
  initialLevel: 1 | 2 | 3 | 4 | 5;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  targetLevel: 1 | 2 | 3 | 4 | 5;
  progressPct: number;             // (current - initial) / (target - initial) * 100
  programsCompleted: string[];
  estimatedTimeToTargetDays: number;
  isOnTrack: boolean;
  lastAssessedAt: number;
  updatedAt: number;
}

class TrainingProgramManager {
  private programs: Map<string, TrainingProgramRecord> = new Map();
  private counter = 0;

  create(name: string, category: TrainingProgramRecord['category'], method: TrainingProgramRecord['deliveryMethod'], audience: string, durationHours: number, costPerLearner: number, isCompliance: boolean, businessImpact: TrainingProgramRecord['businessImpact'], complianceDeadline?: number): TrainingProgramRecord {
    const programId = `prog-${Date.now()}-${++this.counter}`;
    const record: TrainingProgramRecord = {
      programId, programName: name, category, deliveryMethod: method, targetAudience: audience,
      durationHours, enrollments: 0, completions: 0, completionRatePct: 0,
      avgAssessmentScore: 0, avgSatisfactionScore: 0, costPerLearnerUSD: costPerLearner,
      totalCostUSD: 0, businessImpact, isCompliance, complianceDeadline, createdAt: Date.now()
    };
    this.programs.set(programId, record);
    logger.debug('Training program created', { programId, name, category, method });
    return record;
  }

  enroll(programId: string, count: number): boolean {
    const prog = this.programs.get(programId);
    if (!prog) return false;
    prog.enrollments += count;
    prog.totalCostUSD = prog.enrollments * prog.costPerLearnerUSD;
    return true;
  }

  updateMetrics(programId: string, completions: number, avgAssessment: number, avgSatisfaction: number): boolean {
    const prog = this.programs.get(programId);
    if (!prog) return false;
    prog.completions = completions;
    prog.completionRatePct = prog.enrollments > 0 ? Math.round((completions / prog.enrollments) * 100 * 10) / 10 : 0;
    prog.avgAssessmentScore = avgAssessment;
    prog.avgSatisfactionScore = avgSatisfaction;
    return true;
  }

  getOverdueCompliance(): TrainingProgramRecord[] {
    const now = Date.now();
    return Array.from(this.programs.values()).filter(p => p.isCompliance && p.complianceDeadline && p.complianceDeadline < now && p.completionRatePct < 100);
  }

  getLowCompletion(threshold = 70): TrainingProgramRecord[] {
    return Array.from(this.programs.values()).filter(p => p.completionRatePct > 0 && p.completionRatePct < threshold);
  }

  getAll(): TrainingProgramRecord[] {
    return Array.from(this.programs.values());
  }

  getProgram(id: string): TrainingProgramRecord | undefined {
    return this.programs.get(id);
  }
}

class LearningOutcomeTracker {
  private outcomes: LearningOutcomeRecord[] = [];
  private counter = 0;

  record(programId: string, programName: string, learnerId: string, learnerName: string, department: string, preScore: number, postScore: number, skillsApplied: string[], behaviorChange: boolean, performanceImprovement: number, timeToApply: number, retention30: number): LearningOutcomeRecord {
    const outcomeId = `outcome-${Date.now()}-${++this.counter}`;
    const record: LearningOutcomeRecord = {
      outcomeId, programId, programName, learnerId, learnerName, department,
      preAssessmentScore: preScore, postAssessmentScore: postScore,
      knowledgeGain: Math.round((postScore - preScore) * 10) / 10,
      skillsApplied, behaviorChangeObserved: behaviorChange,
      performanceImprovementPct: performanceImprovement, timeToApplyDays: timeToApply,
      retentionScore30Day: retention30, completedAt: Date.now()
    };
    this.outcomes.push(record);
    return record;
  }

  getAvgKnowledgeGain(programId: string): number {
    const prog = this.outcomes.filter(o => o.programId === programId);
    return prog.length > 0 ? Math.round(prog.reduce((s, o) => s + o.knowledgeGain, 0) / prog.length * 10) / 10 : 0;
  }

  getHighPerformers(minGain = 15): LearningOutcomeRecord[] {
    return this.outcomes.filter(o => o.knowledgeGain >= minGain);
  }

  getAll(): LearningOutcomeRecord[] {
    return [...this.outcomes];
  }
}

class LDRoiCalculator {
  private rois: LDRoiRecord[] = [];
  private counter = 0;

  calculate(programId: string, programName: string, period: string, totalInvestment: number, directBenefits: number, indirectBenefits: number, intangibles: string[], methodology: LDRoiRecord['methodologyUsed'], confidence: LDRoiRecord['confidenceLevel']): LDRoiRecord {
    const roiId = `ldroi-${Date.now()}-${++this.counter}`;
    const totalBenefits = directBenefits + indirectBenefits;
    const roiPct = totalInvestment > 0 ? Math.round(((totalBenefits - totalInvestment) / totalInvestment) * 100 * 10) / 10 : 0;
    const bcr = totalInvestment > 0 ? Math.round((totalBenefits / totalInvestment) * 100) / 100 : 0;
    const payback = directBenefits > 0 ? Math.round((totalInvestment / (directBenefits / 12)) * 10) / 10 : 999;

    const record: LDRoiRecord = {
      roiId, programId, programName, period, totalInvestmentUSD: totalInvestment,
      directBenefitsUSD: directBenefits, indirectBenefitsUSD: indirectBenefits,
      totalBenefitsUSD: totalBenefits, roiPct, paybackPeriodMonths: payback,
      benefitsCostRatio: bcr, intangibleBenefits: intangibles,
      methodologyUsed: methodology, confidenceLevel: confidence, calculatedAt: Date.now()
    };
    this.rois.push(record);
    logger.debug('L&D ROI calculated', { roiId, programName, roiPct, bcr });
    return record;
  }

  getHighROIPrograms(minRoi = 100): LDRoiRecord[] {
    return this.rois.filter(r => r.roiPct >= minRoi).sort((a, b) => b.roiPct - a.roiPct);
  }

  getAverageROI(): number {
    const all = this.rois;
    return all.length > 0 ? Math.round(all.reduce((s, r) => s + r.roiPct, 0) / all.length * 10) / 10 : 0;
  }
}

class SkillDevelopmentManager {
  private developments: Map<string, Map<string, SkillDevelopmentRecord>> = new Map();
  private counter = 0;

  track(learnerId: string, learnerName: string, department: string, skillName: string, initialLevel: SkillDevelopmentRecord['initialLevel'], currentLevel: SkillDevelopmentRecord['currentLevel'], targetLevel: SkillDevelopmentRecord['targetLevel'], programsCompleted: string[], avgDaysPerLevel = 90): SkillDevelopmentRecord {
    const devId = `skilldev-${Date.now()}-${++this.counter}`;
    const totalGap = targetLevel - initialLevel;
    const achieved = currentLevel - initialLevel;
    const progressPct = totalGap > 0 ? Math.round((achieved / totalGap) * 100 * 10) / 10 : 100;
    const remainingLevels = targetLevel - currentLevel;
    const estimatedDays = remainingLevels > 0 ? remainingLevels * avgDaysPerLevel : 0;
    const isOnTrack = progressPct >= (Date.now() % 100);  // simplified

    const record: SkillDevelopmentRecord = {
      devId, learnerId, learnerName, department, skillName,
      initialLevel, currentLevel, targetLevel, progressPct,
      programsCompleted, estimatedTimeToTargetDays: estimatedDays,
      isOnTrack: progressPct >= 50, lastAssessedAt: Date.now(), updatedAt: Date.now()
    };

    if (!this.developments.has(learnerId)) this.developments.set(learnerId, new Map());
    this.developments.get(learnerId)!.set(skillName, record);
    return record;
  }

  getLearnerProgress(learnerId: string): SkillDevelopmentRecord[] {
    return Array.from(this.developments.get(learnerId)?.values() || []);
  }

  getOrganizationProgress(): SkillDevelopmentRecord[] {
    const all: SkillDevelopmentRecord[] = [];
    this.developments.forEach(learnerMap => learnerMap.forEach(r => all.push(r)));
    return all;
  }

  getSkillGaps(): { skillName: string; learnersOffTrack: number }[] {
    const gapMap = new Map<string, number>();
    this.getOrganizationProgress().filter(r => !r.isOnTrack).forEach(r => {
      gapMap.set(r.skillName, (gapMap.get(r.skillName) || 0) + 1);
    });
    return Array.from(gapMap.entries()).map(([skillName, count]) => ({ skillName, learnersOffTrack: count })).sort((a, b) => b.learnersOffTrack - a.learnersOffTrack);
  }
}

export const trainingProgramManager = new TrainingProgramManager();
export const learningOutcomeTracker = new LearningOutcomeTracker();
export const ldRoiCalculator = new LDRoiCalculator();
export const skillDevelopmentManager = new SkillDevelopmentManager();

export { TrainingProgramRecord, LearningOutcomeRecord, LDRoiRecord, SkillDevelopmentRecord };
