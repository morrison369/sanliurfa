/**
 * Phase 84: Success Planning & Execution
 * Success plans, goal setting, milestone tracking, execution monitoring
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type PlanStatus = 'draft' | 'active' | 'on_track' | 'at_risk' | 'completed';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'missed';

export interface SuccessPlan {
  id: string;
  customerId: string;
  accountId: string;
  title: string;
  description: string;
  status: PlanStatus;
  startDate: number;
  endDate: number;
  createdAt: number;
}

export interface Milestone {
  id: string;
  planId: string;
  title: string;
  description: string;
  targetDate: number;
  status: MilestoneStatus;
  completedDate?: number;
  createdAt: number;
}

export interface SuccessGoal {
  id: string;
  planId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  dueDate: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: number;
}

// ==================== SUCCESS PLAN MANAGER ====================

export class SuccessPlanManager {
  private plans = new Map<string, SuccessPlan>();
  private planCount = 0;

  /**
   * Create plan
   */
  createPlan(plan: Omit<SuccessPlan, 'id' | 'createdAt'>): SuccessPlan {
    const id = 'plan-' + Date.now() + '-' + this.planCount++;

    const newPlan: SuccessPlan = {
      ...plan,
      id,
      createdAt: Date.now()
    };

    this.plans.set(id, newPlan);
    logger.info('Success plan created', {
      planId: id,
      customerId: plan.customerId,
      title: plan.title,
      status: plan.status
    });

    return newPlan;
  }

  /**
   * Get plan
   */
  getPlan(planId: string): SuccessPlan | null {
    return this.plans.get(planId) || null;
  }

  /**
   * List plans
   */
  listPlans(accountId: string, status?: PlanStatus): SuccessPlan[] {
    let plans = Array.from(this.plans.values()).filter(p => p.accountId === accountId);

    if (status) {
      plans = plans.filter(p => p.status === status);
    }

    return plans;
  }

  /**
   * Update plan
   */
  updatePlan(planId: string, updates: Partial<SuccessPlan>): void {
    const plan = this.plans.get(planId);
    if (plan) {
      Object.assign(plan, updates);
      logger.debug('Plan updated', { planId, updates: Object.keys(updates) });
    }
  }

  /**
   * Complete plan
   */
  completePlan(planId: string): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.status = 'completed';
      plan.endDate = Date.now();
      logger.info('Plan completed', { planId });
    }
  }

  /**
   * Get plan progress
   */
  getPlanProgress(planId: string): { completed: number; total: number; percentage: number } {
    // This would integrate with milestone and goal managers
    return {
      completed: 3,
      total: 5,
      percentage: 60
    };
  }
}

// ==================== MILESTONE MANAGER ====================

export class MilestoneManager {
  private milestones = new Map<string, Milestone>();
  private milestoneCount = 0;

  /**
   * Add milestone
   */
  addMilestone(milestone: Omit<Milestone, 'id' | 'createdAt'>): Milestone {
    const id = 'milestone-' + Date.now() + '-' + this.milestoneCount++;

    const newMilestone: Milestone = {
      ...milestone,
      id,
      createdAt: Date.now()
    };

    this.milestones.set(id, newMilestone);
    logger.info('Milestone added', {
      milestoneId: id,
      planId: milestone.planId,
      title: milestone.title,
      targetDate: milestone.targetDate
    });

    return newMilestone;
  }

  /**
   * Get milestone
   */
  getMilestone(milestoneId: string): Milestone | null {
    return this.milestones.get(milestoneId) || null;
  }

  /**
   * Get plan milestones
   */
  getPlanMilestones(planId: string): Milestone[] {
    return Array.from(this.milestones.values()).filter(m => m.planId === planId);
  }

  /**
   * Complete milestone
   */
  completeMilestone(milestoneId: string): void {
    const milestone = this.milestones.get(milestoneId);
    if (milestone) {
      milestone.status = 'completed';
      milestone.completedDate = Date.now();
      logger.info('Milestone completed', { milestoneId });
    }
  }

  /**
   * Get upcoming milestones
   */
  getUpcomingMilestones(daysAhead: number): Milestone[] {
    const cutoff = Date.now() + daysAhead * 86400000;
    return Array.from(this.milestones.values()).filter(
      m => m.targetDate <= cutoff && m.status !== 'completed'
    );
  }
}

// ==================== GOAL MANAGER ====================

export class GoalManager {
  private goals = new Map<string, SuccessGoal>();
  private goalCount = 0;

  /**
   * Create goal
   */
  createGoal(goal: Omit<SuccessGoal, 'id' | 'createdAt'>): SuccessGoal {
    const id = 'goal-' + Date.now() + '-' + this.goalCount++;

    const newGoal: SuccessGoal = {
      ...goal,
      id,
      createdAt: Date.now()
    };

    this.goals.set(id, newGoal);
    logger.info('Goal created', {
      goalId: id,
      planId: goal.planId,
      title: goal.title,
      targetValue: goal.targetValue
    });

    return newGoal;
  }

  /**
   * Get goal
   */
  getGoal(goalId: string): SuccessGoal | null {
    return this.goals.get(goalId) || null;
  }

  /**
   * Get plan goals
   */
  getPlanGoals(planId: string): SuccessGoal[] {
    return Array.from(this.goals.values()).filter(g => g.planId === planId);
  }

  /**
   * Update progress
   */
  updateProgress(goalId: string, currentValue: number): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.currentValue = currentValue;

      if (currentValue >= goal.targetValue) {
        goal.status = 'completed';
        logger.info('Goal completed', { goalId, currentValue, targetValue: goal.targetValue });
      } else if (currentValue > 0) {
        goal.status = 'in_progress';
      }
    }
  }

  /**
   * Complete goal
   */
  completeGoal(goalId: string): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.status = 'completed';
      goal.currentValue = goal.targetValue;
      logger.info('Goal completed', { goalId });
    }
  }

  /**
   * Track goal progress
   */
  trackGoalProgress(goalId: string): { progress: number; onTrack: boolean } {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return { progress: 0, onTrack: false };
    }

    const progress = (goal.currentValue / goal.targetValue) * 100;
    const timeRemaining = goal.dueDate - Date.now();
    const progressNeeded = (progress / 100) * (goal.dueDate - goal.createdAt);
    const onTrack = (Date.now() - goal.createdAt) <= progressNeeded;

    return { progress: Math.round(progress), onTrack };
  }
}

// ==================== EXPORTS ====================

export const successPlanManager = new SuccessPlanManager();
export const milestoneManager = new MilestoneManager();
export const goalManager = new GoalManager();
