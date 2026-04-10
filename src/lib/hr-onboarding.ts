/**
 * Phase 73: Onboarding & Learning Development
 * Onboarding workflows, training programs, skill development
 */

import { logger } from './logging';
import { employeeManager, employeeProfileManager } from './hr-employees';

// ==================== TYPES & INTERFACES ====================

export type OnboardingStatus = 'scheduled' | 'in_progress' | 'completed' | 'paused';
export type TrainingType = 'mandatory' | 'optional' | 'role_specific' | 'skill_development';
export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface OnboardingPlan {
  id: string;
  employeeId: string;
  startDate: number;
  status: OnboardingStatus;
  manager: string;
  tasks: string[];
  estimatedEndDate: number;
  createdAt: number;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  type: TrainingType;
  duration: number;
  instructor?: string;
  maxParticipants?: number;
  createdAt: number;
}

export interface TrainingEnrollment {
  id: string;
  employeeId: string;
  programId: string;
  status: TrainingStatus;
  enrolledDate: number;
  completedDate?: number;
  score?: number;
  certificate?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: string[];
  department?: string;
  estimatedDuration: number;
  createdAt: number;
}

const departmentSkillMap: Record<string, string[]> = {
  engineering: ['TypeScript', 'Testing', 'Cloud Architecture'],
  sales: ['Negotiation', 'CRM', 'Forecasting'],
  marketing: ['Analytics', 'Content Strategy', 'Campaign Management'],
  operations: ['Process Improvement', 'Project Management', 'Reporting'],
  finance: ['Financial Planning', 'Excel', 'Compliance'],
  hr: ['People Operations', 'Coaching', 'Compliance'],
  other: ['Communication', 'Reporting']
};

// ==================== ONBOARDING MANAGER ====================

export class OnboardingManager {
  private plans = new Map<string, OnboardingPlan>();
  private planCount = 0;

  /**
   * Create plan
   */
  createPlan(plan: Omit<OnboardingPlan, 'id' | 'createdAt'>): OnboardingPlan {
    const id = 'onboard-' + Date.now() + '-' + this.planCount++;

    const newPlan: OnboardingPlan = {
      ...plan,
      id,
      createdAt: Date.now()
    };

    this.plans.set(id, newPlan);
    logger.info('Onboarding plan created', { planId: id, employeeId: plan.employeeId });

    return newPlan;
  }

  /**
   * Get plan
   */
  getPlan(planId: string): OnboardingPlan | null {
    return this.plans.get(planId) || null;
  }

  /**
   * List plans
   */
  listPlans(status?: OnboardingStatus): OnboardingPlan[] {
    let plans = Array.from(this.plans.values());

    if (status) {
      plans = plans.filter(p => p.status === status);
    }

    return plans;
  }

  /**
   * Update plan
   */
  updatePlan(planId: string, updates: Partial<OnboardingPlan>): void {
    const plan = this.plans.get(planId);
    if (plan) {
      Object.assign(plan, updates);
      logger.debug('Onboarding plan updated', { planId });
    }
  }

  /**
   * Complete plan
   */
  completePlan(planId: string): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.status = 'completed';
      logger.info('Onboarding plan completed', { planId });
    }
  }

  /**
   * Track progress
   */
  trackProgress(planId: string): { completedTasks: number; totalTasks: number; percentage: number } {
    const plan = this.plans.get(planId);
    if (!plan) {
      return { completedTasks: 0, totalTasks: 0, percentage: 0 };
    }

    const totalTasks = plan.tasks.length;
    const completedTasks = Math.floor(totalTasks * 0.5);

    return {
      completedTasks,
      totalTasks,
      percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };
  }
}

// ==================== TRAINING MANAGER ====================

export class TrainingManager {
  private programs = new Map<string, TrainingProgram>();
  private enrollments = new Map<string, TrainingEnrollment>();
  private programCount = 0;
  private enrollmentCount = 0;

  /**
   * Create program
   */
  createProgram(program: Omit<TrainingProgram, 'id' | 'createdAt'>): TrainingProgram {
    const id = 'prog-' + Date.now() + '-' + this.programCount++;

    const newProgram: TrainingProgram = {
      ...program,
      id,
      createdAt: Date.now()
    };

    this.programs.set(id, newProgram);
    logger.info('Training program created', { programId: id, title: program.title });

    return newProgram;
  }

  /**
   * Get program
   */
  getProgram(programId: string): TrainingProgram | null {
    return this.programs.get(programId) || null;
  }

  /**
   * List programs
   */
  listPrograms(type?: TrainingType): TrainingProgram[] {
    let programs = Array.from(this.programs.values());

    if (type) {
      programs = programs.filter(p => p.type === type);
    }

    return programs;
  }

  /**
   * Enroll employee
   */
  enrollEmployee(employeeId: string, programId: string): TrainingEnrollment {
    const id = 'enroll-' + Date.now() + '-' + this.enrollmentCount++;

    const enrollment: TrainingEnrollment = {
      id,
      employeeId,
      programId,
      status: 'not_started',
      enrolledDate: Date.now()
    };

    this.enrollments.set(id, enrollment);
    logger.info('Employee enrolled in training', { enrollmentId: id, employeeId, programId });

    return enrollment;
  }

  /**
   * Complete training
   */
  completeTraining(enrollmentId: string, score: number): void {
    const enrollment = this.enrollments.get(enrollmentId);
    if (enrollment) {
      enrollment.status = 'completed';
      enrollment.completedDate = Date.now();
      enrollment.score = score;
      logger.info('Training completed', { enrollmentId, score });
    }
  }

  /**
   * Get certificate
   */
  getCertificate(enrollmentId: string): string {
    return `cert-${enrollmentId}.pdf`;
  }
}

// ==================== LEARNING PATH MANAGER ====================

export class LearningPathManager {
  private paths = new Map<string, LearningPath>();
  private pathCount = 0;

  /**
   * Create path
   */
  createPath(path: Omit<LearningPath, 'id' | 'createdAt'>): LearningPath {
    const id = 'path-' + Date.now() + '-' + this.pathCount++;

    const newPath: LearningPath = {
      ...path,
      id,
      createdAt: Date.now()
    };

    this.paths.set(id, newPath);
    logger.info('Learning path created', { pathId: id, title: path.title });

    return newPath;
  }

  /**
   * Get path
   */
  getPath(pathId: string): LearningPath | null {
    return this.paths.get(pathId) || null;
  }

  /**
   * List paths
   */
  listPaths(department?: string): LearningPath[] {
    let paths = Array.from(this.paths.values());

    if (department) {
      paths = paths.filter(p => p.department === department);
    }

    return paths;
  }

  /**
   * Recommend path
   */
  recommendPath(employeeId: string): LearningPath[] {
    const employee = employeeManager.getEmployee(employeeId);
    const profile = employeeProfileManager.getProfile(employeeId);
    const currentSkills = new Set(profile?.skills || []);

    const scoredPaths = Array.from(this.paths.values()).map(path => {
      let score = 0;
      if (employee && path.department === employee.department) score += 3;
      const matchingCourses = path.courses.filter(course =>
        Array.from(currentSkills).some(skill => course.toLowerCase().includes(skill.toLowerCase()))
      );
      score += matchingCourses.length;
      return { path, score };
    });

    return scoredPaths
      .sort((left, right) => right.score - left.score || left.path.estimatedDuration - right.path.estimatedDuration)
      .map(item => item.path);
  }

  /**
   * Track progress
   */
  trackProgress(employeeId: string, pathId: string): { completedCourses: number; totalCourses: number } {
    const path = this.paths.get(pathId);
    if (!path) {
      return { completedCourses: 0, totalCourses: 0 };
    }

    const totalCourses = path.courses.length;
    const completedCourses = Math.floor(totalCourses * 0.4);

    return { completedCourses, totalCourses };
  }
}

// ==================== SKILL DEVELOPMENT ====================

export class SkillDevelopment {
  /**
   * Identify skill gaps
   */
  identifySkillGaps(employeeId: string): string[] {
    const employee = employeeManager.getEmployee(employeeId);
    const profile = employeeProfileManager.getProfile(employeeId);
    const requiredSkills = employee ? departmentSkillMap[employee.department] || departmentSkillMap.other : departmentSkillMap.other;
    const knownSkills = new Set(profile?.skills || []);
    const gaps = requiredSkills.filter(skill => !knownSkills.has(skill));

    logger.debug('Skill gaps identified', { employeeId, count: gaps.length });

    return gaps;
  }

  /**
   * Recommend training
   */
  recommendTraining(employeeId: string): TrainingProgram[] {
    const gaps = this.identifySkillGaps(employeeId).map(skill => skill.toLowerCase());
    const scoredPrograms = trainingManager.listPrograms().map(program => {
      const haystack = `${program.title} ${program.description}`.toLowerCase();
      const score = gaps.reduce((sum, gap) => sum + (haystack.includes(gap) ? 2 : 0), 0)
        + (program.type === 'skill_development' ? 1 : 0);
      return { program, score };
    });

    return scoredPrograms
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || left.program.duration - right.program.duration)
      .map(item => item.program);
  }

  /**
   * Track skill progress
   */
  trackSkillProgress(employeeId: string, skill: string): { level: number; targetLevel: number } {
    const profile = employeeProfileManager.getProfile(employeeId);
    const normalizedSkill = skill.toLowerCase();
    const completedPrograms = Array.from(trainingManager['enrollments'].values())
      .filter(enrollment => enrollment.employeeId === employeeId && enrollment.status === 'completed')
      .map(enrollment => trainingManager.getProgram(enrollment.programId))
      .filter((program): program is TrainingProgram => program !== null);

    const hasSkill = (profile?.skills || []).some(item => item.toLowerCase() === normalizedSkill);
    const certificationBonus = (profile?.certifications || []).some(item => item.toLowerCase().includes(normalizedSkill)) ? 1 : 0;
    const trainingBonus = completedPrograms.some(program => `${program.title} ${program.description}`.toLowerCase().includes(normalizedSkill)) ? 1 : 0;

    return {
      level: Math.min(5, (hasSkill ? 2 : 1) + certificationBonus + trainingBonus),
      targetLevel: 4
    };
  }
}

// ==================== EXPORTS ====================

export const onboardingManager = new OnboardingManager();
export const trainingManager = new TrainingManager();
export const learningPathManager = new LearningPathManager();
export const skillDevelopment = new SkillDevelopment();
