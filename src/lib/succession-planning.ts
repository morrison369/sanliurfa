/**
 * Phase 206: Succession Planning
 * Succession plan management, readiness assessment, talent pipeline tracking, leadership development
 */

import { logger } from './logger';

interface SuccessionPlan {
  planId: string;
  roleId: string;
  roleTitle: string;
  department: string;
  incumbentId: string;
  criticalityLevel: 'critical' | 'high' | 'medium';
  successorSlots: Array<{ employeeId: string; readinessLevel: 'ready_now' | 'ready_1_2yr' | 'ready_3_5yr'; gap: string[] }>;
  reviewedAt: number;
  nextReviewDate: number;
  status: 'active' | 'vacant' | 'filled';
}

interface ReadinessAssessment {
  assessmentId: string;
  employeeId: string;
  targetRoleId: string;
  competencies: Array<{ name: string; required: number; current: number; gap: number }>;
  overallReadiness: number; // 0-100
  readinessLevel: SuccessionPlan['successorSlots'][0]['readinessLevel'];
  developmentPriorities: string[];
  assessedAt: number;
}

interface TalentPipelineEntry {
  entryId: string;
  employeeId: string;
  currentRole: string;
  currentLevel: string;
  targetRole: string;
  targetLevel: string;
  estimatedReadinessDate: number;
  mobilityWillingness: 'high' | 'medium' | 'low';
  developmentActivities: string[];
  status: 'active' | 'placed' | 'withdrawn';
}

interface LeadershipDevelopmentRecord {
  recordId: string;
  employeeId: string;
  programName: string;
  type: 'mentoring' | 'coaching' | 'stretch_assignment' | 'training' | 'executive_exposure';
  startedAt: number;
  completedAt?: number;
  outcomeScore: number; // 0-100
  status: 'active' | 'completed' | 'dropped';
}

class SuccessionPlanManager {
  private plans: Map<string, SuccessionPlan> = new Map();
  private counter = 0;

  create(roleId: string, roleTitle: string, department: string, incumbentId: string, criticality: SuccessionPlan['criticalityLevel']): SuccessionPlan {
    const planId = `succession-${Date.now()}-${++this.counter}`;
    const plan: SuccessionPlan = {
      planId, roleId, roleTitle, department, incumbentId,
      criticalityLevel: criticality, successorSlots: [],
      reviewedAt: Date.now(),
      nextReviewDate: Date.now() + 365 * 86400000,
      status: 'active'
    };
    this.plans.set(roleId, plan);
    logger.debug('Succession plan created', { planId, roleTitle, department, criticality });
    return plan;
  }

  addSuccessor(roleId: string, employeeId: string, readiness: SuccessionPlan['successorSlots'][0]['readinessLevel'], gaps: string[]): boolean {
    const plan = this.plans.get(roleId);
    if (!plan) return false;
    const existing = plan.successorSlots.find(s => s.employeeId === employeeId);
    if (existing) { existing.readinessLevel = readiness; existing.gap = gaps; }
    else plan.successorSlots.push({ employeeId, readinessLevel: readiness, gap: gaps });
    return true;
  }

  getReadyNow(roleId: string): string[] {
    const plan = this.plans.get(roleId);
    return plan ? plan.successorSlots.filter(s => s.readinessLevel === 'ready_now').map(s => s.employeeId) : [];
  }

  getCriticalRolesWithoutSuccessors(): SuccessionPlan[] {
    return Array.from(this.plans.values())
      .filter(p => p.criticalityLevel === 'critical' && p.successorSlots.length === 0 && p.status === 'active');
  }

  getPlan(roleId: string): SuccessionPlan | undefined {
    return this.plans.get(roleId);
  }
}

class ReadinessAssessor {
  private assessments: Map<string, ReadinessAssessment> = new Map();
  private counter = 0;

  assess(employeeId: string, targetRoleId: string, competencies: Array<{ name: string; required: number; current: number }>): ReadinessAssessment {
    const scored = competencies.map(c => ({ ...c, gap: Math.max(0, c.required - c.current) }));
    const totalRequired = competencies.reduce((s, c) => s + c.required, 0);
    const totalCurrent = competencies.reduce((s, c) => s + c.current, 0);
    const overallReadiness = totalRequired > 0 ? Math.min(100, (totalCurrent / totalRequired) * 100) : 0;
    const readinessLevel: ReadinessAssessment['readinessLevel'] =
      overallReadiness >= 85 ? 'ready_now' : overallReadiness >= 60 ? 'ready_1_2yr' : 'ready_3_5yr';
    const developmentPriorities = scored.filter(c => c.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3).map(c => c.name);

    const assessmentId = `readiness-${Date.now()}-${++this.counter}`;
    const assessment: ReadinessAssessment = {
      assessmentId, employeeId, targetRoleId, competencies: scored,
      overallReadiness, readinessLevel, developmentPriorities, assessedAt: Date.now()
    };
    this.assessments.set(`${employeeId}:${targetRoleId}`, assessment);
    logger.debug('Readiness assessed', { employeeId, targetRoleId, readinessLevel, overallReadiness: overallReadiness.toFixed(1) });
    return assessment;
  }

  getAssessment(employeeId: string, targetRoleId: string): ReadinessAssessment | undefined {
    return this.assessments.get(`${employeeId}:${targetRoleId}`);
  }

  getReadyEmployees(targetRoleId: string): ReadinessAssessment[] {
    return Array.from(this.assessments.values())
      .filter(a => a.targetRoleId === targetRoleId && a.readinessLevel === 'ready_now');
  }
}

class TalentPipelineTracker {
  private pipeline: Map<string, TalentPipelineEntry> = new Map();
  private counter = 0;

  add(employeeId: string, currentRole: string, currentLevel: string, targetRole: string, targetLevel: string, readinessDays: number, mobility: TalentPipelineEntry['mobilityWillingness']): TalentPipelineEntry {
    const entryId = `pipeline-${Date.now()}-${++this.counter}`;
    const entry: TalentPipelineEntry = {
      entryId, employeeId, currentRole, currentLevel, targetRole, targetLevel,
      estimatedReadinessDate: Date.now() + readinessDays * 86400000,
      mobilityWillingness: mobility, developmentActivities: [], status: 'active'
    };
    this.pipeline.set(employeeId, entry);
    logger.debug('Added to talent pipeline', { entryId, employeeId, targetRole });
    return entry;
  }

  addActivity(employeeId: string, activity: string): boolean {
    const entry = this.pipeline.get(employeeId);
    if (entry && !entry.developmentActivities.includes(activity)) {
      entry.developmentActivities.push(activity);
      return true;
    }
    return false;
  }

  markPlaced(employeeId: string): boolean {
    const entry = this.pipeline.get(employeeId);
    if (entry) { entry.status = 'placed'; return true; }
    return false;
  }

  getReadyForPromotion(daysThreshold = 90): TalentPipelineEntry[] {
    const cutoff = Date.now() + daysThreshold * 86400000;
    return Array.from(this.pipeline.values())
      .filter(e => e.status === 'active' && e.estimatedReadinessDate <= cutoff);
  }

  getPipelineDepth(targetRole: string): number {
    return Array.from(this.pipeline.values()).filter(e => e.targetRole === targetRole && e.status === 'active').length;
  }
}

class LeadershipDevelopmentTracker {
  private records: Map<string, LeadershipDevelopmentRecord[]> = new Map();
  private counter = 0;

  enroll(employeeId: string, programName: string, type: LeadershipDevelopmentRecord['type']): LeadershipDevelopmentRecord {
    const recordId = `ldrdev-${Date.now()}-${++this.counter}`;
    const record: LeadershipDevelopmentRecord = {
      recordId, employeeId, programName, type,
      startedAt: Date.now(), outcomeScore: 0, status: 'active'
    };
    const emp = this.records.get(employeeId) || [];
    emp.push(record);
    this.records.set(employeeId, emp);
    logger.debug('Leadership development enrolled', { recordId, employeeId, programName, type });
    return record;
  }

  complete(recordId: string, outcomeScore: number): boolean {
    for (const records of this.records.values()) {
      const record = records.find(r => r.recordId === recordId);
      if (record) {
        record.status = 'completed';
        record.completedAt = Date.now();
        record.outcomeScore = Math.max(0, Math.min(100, outcomeScore));
        return true;
      }
    }
    return false;
  }

  getEmployeePrograms(employeeId: string): LeadershipDevelopmentRecord[] {
    return this.records.get(employeeId) || [];
  }

  getAvgOutcomeScore(type?: LeadershipDevelopmentRecord['type']): number {
    const completed = Array.from(this.records.values()).flat()
      .filter(r => r.status === 'completed' && (!type || r.type === type));
    if (!completed.length) return 0;
    return completed.reduce((s, r) => s + r.outcomeScore, 0) / completed.length;
  }
}

export const successionPlanManager = new SuccessionPlanManager();
export const readinessAssessor = new ReadinessAssessor();
export const talentPipelineTracker = new TalentPipelineTracker();
export const leadershipDevelopmentTracker = new LeadershipDevelopmentTracker();

export { SuccessionPlan, ReadinessAssessment, TalentPipelineEntry, LeadershipDevelopmentRecord };
