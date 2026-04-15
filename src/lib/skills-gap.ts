/**
 * Phase 203: Skills Gap Analysis
 * Skills inventory, gap analysis, development planning, skills matrix
 */

import { logger } from './logger';

interface SkillRecord {
  skillId: string;
  employeeId: string;
  skillName: string;
  category: 'technical' | 'leadership' | 'communication' | 'domain' | 'tool';
  currentLevel: number; // 1-5
  requiredLevel: number; // 1-5
  gap: number;
  verifiedAt: number;
  endorsedBy: string[];
}

interface GapAnalysisResult {
  analysisId: string;
  employeeId: string;
  totalSkills: number;
  skillsWithGap: number;
  criticalGaps: SkillRecord[];
  avgGapScore: number;
  priorityAreas: string[];
  analyzedAt: number;
}

interface DevelopmentPlan {
  planId: string;
  employeeId: string;
  targetRole: string;
  skills: Array<{ skillName: string; currentLevel: number; targetLevel: number; resources: string[]; durationWeeks: number }>;
  startDate: number;
  targetDate: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  completionPct: number;
}

interface SkillsMatrix {
  matrixId: string;
  teamId: string;
  skillColumns: string[];
  rows: Array<{ employeeId: string; levels: number[] }>;
  coverageBySkill: Record<string, number>;
  createdAt: number;
}

class SkillsInventoryManager {
  private skills: Map<string, SkillRecord[]> = new Map();
  private counter = 0;

  record(employeeId: string, skillName: string, category: SkillRecord['category'], currentLevel: number, requiredLevel: number): SkillRecord {
    const skillId = `skill-${Date.now()}-${++this.counter}`;
    const clampedCurrent = Math.max(1, Math.min(5, currentLevel));
    const clampedRequired = Math.max(1, Math.min(5, requiredLevel));
    const record: SkillRecord = {
      skillId, employeeId, skillName, category,
      currentLevel: clampedCurrent, requiredLevel: clampedRequired,
      gap: Math.max(0, clampedRequired - clampedCurrent),
      verifiedAt: Date.now(), endorsedBy: []
    };
    const emp = this.skills.get(employeeId) || [];
    const idx = emp.findIndex(s => s.skillName === skillName);
    if (idx >= 0) emp[idx] = record; else emp.push(record);
    this.skills.set(employeeId, emp);
    return record;
  }

  endorse(employeeId: string, skillName: string, endorserId: string): boolean {
    const emp = this.skills.get(employeeId) || [];
    const skill = emp.find(s => s.skillName === skillName);
    if (skill && !skill.endorsedBy.includes(endorserId)) {
      skill.endorsedBy.push(endorserId);
      return true;
    }
    return false;
  }

  getEmployeeSkills(employeeId: string): SkillRecord[] {
    return this.skills.get(employeeId) || [];
  }

  getSkillsByCategory(employeeId: string, category: SkillRecord['category']): SkillRecord[] {
    return this.getEmployeeSkills(employeeId).filter(s => s.category === category);
  }

  getOrganizationSkillCoverage(skillName: string): number {
    let total = 0, proficient = 0;
    for (const records of this.skills.values()) {
      const skill = records.find(s => s.skillName === skillName);
      if (skill) { total++; if (skill.currentLevel >= skill.requiredLevel) proficient++; }
    }
    return total > 0 ? (proficient / total) * 100 : 0;
  }
}

class GapAnalyzer {
  private results: Map<string, GapAnalysisResult> = new Map();
  private counter = 0;

  analyze(employeeId: string, skills: SkillRecord[]): GapAnalysisResult {
    const criticalGaps = skills.filter(s => s.gap >= 2).sort((a, b) => b.gap - a.gap);
    const avgGapScore = skills.length > 0 ? skills.reduce((s, r) => s + r.gap, 0) / skills.length : 0;
    const priorityAreas = [...new Set(criticalGaps.slice(0, 3).map(s => s.category))];

    const result: GapAnalysisResult = {
      analysisId: `gap-${Date.now()}-${++this.counter}`,
      employeeId,
      totalSkills: skills.length,
      skillsWithGap: skills.filter(s => s.gap > 0).length,
      criticalGaps,
      avgGapScore,
      priorityAreas,
      analyzedAt: Date.now()
    };
    this.results.set(employeeId, result);
    logger.debug('Gap analysis completed', { employeeId, skillsWithGap: result.skillsWithGap, avgGapScore: avgGapScore.toFixed(2) });
    return result;
  }

  getResult(employeeId: string): GapAnalysisResult | undefined {
    return this.results.get(employeeId);
  }

  getOrgCriticalGaps(minGap = 2): Array<{ skillName: string; affectedEmployees: number }> {
    const skillGapMap = new Map<string, number>();
    for (const result of this.results.values()) {
      for (const gap of result.criticalGaps) {
        if (gap.gap >= minGap) skillGapMap.set(gap.skillName, (skillGapMap.get(gap.skillName) || 0) + 1);
      }
    }
    return Array.from(skillGapMap.entries())
      .map(([skillName, affectedEmployees]) => ({ skillName, affectedEmployees }))
      .sort((a, b) => b.affectedEmployees - a.affectedEmployees);
  }
}

class SkillsDevelopmentPlanner {
  private plans: Map<string, DevelopmentPlan> = new Map();
  private counter = 0;

  createPlan(employeeId: string, targetRole: string, skills: DevelopmentPlan['skills'], durationWeeks = 26): DevelopmentPlan {
    const planId = `devplan-${Date.now()}-${++this.counter}`;
    const plan: DevelopmentPlan = {
      planId, employeeId, targetRole, skills,
      startDate: Date.now(),
      targetDate: Date.now() + durationWeeks * 7 * 86400000,
      status: 'active', completionPct: 0
    };
    this.plans.set(planId, plan);
    logger.debug('Development plan created', { planId, employeeId, targetRole });
    return plan;
  }

  updateProgress(planId: string, completedSkills: number): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    plan.completionPct = plan.skills.length > 0 ? (completedSkills / plan.skills.length) * 100 : 0;
    if (plan.completionPct >= 100) plan.status = 'completed';
    return true;
  }

  getActivePlans(employeeId?: string): DevelopmentPlan[] {
    return Array.from(this.plans.values())
      .filter(p => p.status === 'active' && (!employeeId || p.employeeId === employeeId));
  }

  getPlan(planId: string): DevelopmentPlan | undefined {
    return this.plans.get(planId);
  }
}

class SkillsMatrixBuilder {
  private matrices: Map<string, SkillsMatrix> = new Map();
  private counter = 0;

  build(teamId: string, employeeSkills: Array<{ employeeId: string; skills: SkillRecord[] }>): SkillsMatrix {
    const allSkills = [...new Set(employeeSkills.flatMap(e => e.skills.map(s => s.skillName)))];
    const rows = employeeSkills.map(({ employeeId, skills }) => ({
      employeeId,
      levels: allSkills.map(sName => skills.find(s => s.skillName === sName)?.currentLevel || 0)
    }));
    const coverageBySkill: Record<string, number> = {};
    for (const skillName of allSkills) {
      const proficient = employeeSkills.filter(e => {
        const skill = e.skills.find(s => s.skillName === skillName);
        return skill && skill.currentLevel >= skill.requiredLevel;
      }).length;
      coverageBySkill[skillName] = employeeSkills.length > 0 ? (proficient / employeeSkills.length) * 100 : 0;
    }
    const matrixId = `matrix-${Date.now()}-${++this.counter}`;
    const matrix: SkillsMatrix = { matrixId, teamId, skillColumns: allSkills, rows, coverageBySkill, createdAt: Date.now() };
    this.matrices.set(teamId, matrix);
    return matrix;
  }

  getMatrix(teamId: string): SkillsMatrix | undefined {
    return this.matrices.get(teamId);
  }

  getCriticalSkillGaps(teamId: string, threshold = 50): string[] {
    const matrix = this.matrices.get(teamId);
    if (!matrix) return [];
    return Object.entries(matrix.coverageBySkill)
      .filter(([, coverage]) => coverage < threshold)
      .map(([skill]) => skill);
  }
}

export const skillsInventoryManager = new SkillsInventoryManager();
export const gapAnalyzer = new GapAnalyzer();
export const skillsDevelopmentPlanner = new SkillsDevelopmentPlanner();
export const skillsMatrixBuilder = new SkillsMatrixBuilder();

export { SkillRecord, GapAnalysisResult, DevelopmentPlan, SkillsMatrix };
