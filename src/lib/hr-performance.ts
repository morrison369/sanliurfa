/**
 * Phase 74: Performance & Goals Management
 * Performance reviews, goal setting, feedback, 360 reviews, appraisals
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ReviewCycle = 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
export type PerformanceRating = 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'underperforming';
export type FeedbackType = 'self' | 'manager' | 'peer' | 'direct_report' | 'customer';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  cycle: ReviewCycle;
  reviewer: string;
  rating: PerformanceRating;
  comments: string;
  goals: string[];
  startDate: number;
  endDate: number;
  submittedDate?: number;
  createdAt: number;
}

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  targetDate: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  dueDate: number;
  createdAt: number;
}

export interface Feedback {
  id: string;
  employeeId: string;
  fromUserId: string;
  type: FeedbackType;
  category: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface AppraisalCycle {
  id: string;
  name: string;
  reviewCycle: ReviewCycle;
  startDate: number;
  endDate: number;
  status: 'planning' | 'active' | 'closed';
  createdAt: number;
}

// ==================== PERFORMANCE REVIEW MANAGER ====================

export class PerformanceReviewManager {
  private reviews = new Map<string, PerformanceReview>();
  private reviewCount = 0;

  /**
   * Create review
   */
  createReview(review: Omit<PerformanceReview, 'id' | 'createdAt'>): PerformanceReview {
    const id = 'review-' + Date.now() + '-' + this.reviewCount++;

    const newReview: PerformanceReview = {
      ...review,
      id,
      createdAt: Date.now()
    };

    this.reviews.set(id, newReview);
    logger.info('Performance review created', { reviewId: id, employeeId: review.employeeId });

    return newReview;
  }

  /**
   * Get review
   */
  getReview(reviewId: string): PerformanceReview | null {
    return this.reviews.get(reviewId) || null;
  }

  /**
   * List reviews
   */
  listReviews(employeeId?: string, cycle?: ReviewCycle): PerformanceReview[] {
    let reviews = Array.from(this.reviews.values());

    if (employeeId) {
      reviews = reviews.filter(r => r.employeeId === employeeId);
    }

    if (cycle) {
      reviews = reviews.filter(r => r.cycle === cycle);
    }

    return reviews;
  }

  /**
   * Submit review
   */
  submitReview(reviewId: string): void {
    const review = this.reviews.get(reviewId);
    if (review) {
      review.submittedDate = Date.now();
      logger.info('Performance review submitted', { reviewId });
    }
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(employeeId: string): PerformanceReview[] {
    return Array.from(this.reviews.values())
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Calculate rating trend
   */
  calculateRatingTrend(employeeId: string): PerformanceRating[] {
    return this.getPerformanceHistory(employeeId).map(r => r.rating);
  }
}

// ==================== GOAL MANAGER ====================

export class GoalManager {
  private goals = new Map<string, Goal>();
  private goalCount = 0;

  /**
   * Create goal
   */
  createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
    const id = 'goal-' + Date.now() + '-' + this.goalCount++;

    const newGoal: Goal = {
      ...goal,
      id,
      createdAt: Date.now()
    };

    this.goals.set(id, newGoal);
    logger.info('Goal created', { goalId: id, employeeId: goal.employeeId });

    return newGoal;
  }

  /**
   * Get goal
   */
  getGoal(goalId: string): Goal | null {
    return this.goals.get(goalId) || null;
  }

  /**
   * List goals
   */
  listGoals(employeeId: string, status?: string): Goal[] {
    let goals = Array.from(this.goals.values()).filter(g => g.employeeId === employeeId);

    if (status) {
      goals = goals.filter(g => g.status === status);
    }

    return goals;
  }

  /**
   * Update goal
   */
  updateGoal(goalId: string, updates: Partial<Goal>): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      Object.assign(goal, updates);
      logger.debug('Goal updated', { goalId });
    }
  }

  /**
   * Complete goal
   */
  completeGoal(goalId: string): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.status = 'completed';
      goal.progress = 100;
      logger.info('Goal completed', { goalId });
    }
  }

  /**
   * Track progress
   */
  trackProgress(goalId: string): { progress: number; onTrack: boolean } {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { progress: 0, onTrack: false };
    }

    const now = Date.now();
    const totalTime = goal.dueDate - goal.createdAt;
    const elapsedTime = now - goal.createdAt;
    const expectedProgress = (elapsedTime / totalTime) * 100;
    const onTrack = goal.progress >= Math.min(expectedProgress, 100);

    return { progress: goal.progress, onTrack };
  }
}

// ==================== FEEDBACK MANAGER ====================

export class FeedbackManager {
  private feedbackList: Feedback[] = [];
  private feedbackCount = 0;

  /**
   * Submit feedback
   */
  submitFeedback(feedback: Omit<Feedback, 'id'>): Feedback {
    const id = 'feedback-' + Date.now() + '-' + this.feedbackCount++;

    const newFeedback: Feedback = {
      ...feedback,
      id
    };

    this.feedbackList.push(newFeedback);
    logger.info('Feedback submitted', { feedbackId: id, employeeId: feedback.employeeId });

    return newFeedback;
  }

  /**
   * Get feedback
   */
  getFeedback(employeeId: string, type?: FeedbackType): Feedback[] {
    let feedback = this.feedbackList.filter(f => f.employeeId === employeeId);

    if (type) {
      feedback = feedback.filter(f => f.type === type);
    }

    return feedback;
  }

  /**
   * Conduct 360 review
   */
  conduct360Review(
    employeeId: string
  ): { rating: number; feedbackByType: Record<string, number> } {
    const feedback = this.getFeedback(employeeId);
    const feedbackByType: Record<string, number> = {};
    let totalRating = 0;

    const types: FeedbackType[] = ['self', 'manager', 'peer', 'direct_report', 'customer'];

    types.forEach(type => {
      const typeFeedback = feedback.filter(f => f.type === type);
      const avgRating = typeFeedback.length > 0 ? typeFeedback.reduce((sum, f) => sum + f.rating, 0) / typeFeedback.length : 0;
      feedbackByType[type] = avgRating;
      totalRating += avgRating;
    });

    const rating = types.length > 0 ? totalRating / types.length : 0;

    return { rating, feedbackByType };
  }

  /**
   * Summarize feedback
   */
  summarizeFeedback(employeeId: string): { strengths: string[]; improvements: string[] } {
    const feedback = this.getFeedback(employeeId);
    const strengths: string[] = [];
    const improvements: string[] = [];

    feedback.forEach(f => {
      if (f.rating >= 4) {
        strengths.push(f.comment);
      } else if (f.rating < 3) {
        improvements.push(f.comment);
      }
    });

    return { strengths, improvements };
  }
}

// ==================== APPRAISAL CYCLE MANAGER ====================

export class AppraisalCycleManager {
  private cycles = new Map<string, AppraisalCycle>();
  private cycleCount = 0;
  private cycleReviews = new Map<string, string[]>();

  /**
   * Create cycle
   */
  createCycle(cycle: Omit<AppraisalCycle, 'id' | 'createdAt'>): AppraisalCycle {
    const id = 'cycle-' + Date.now() + '-' + this.cycleCount++;

    const newCycle: AppraisalCycle = {
      ...cycle,
      id,
      createdAt: Date.now()
    };

    this.cycles.set(id, newCycle);
    this.cycleReviews.set(id, []);
    logger.info('Appraisal cycle created', { cycleId: id, name: cycle.name });

    return newCycle;
  }

  /**
   * Get cycle
   */
  getCycle(cycleId: string): AppraisalCycle | null {
    return this.cycles.get(cycleId) || null;
  }

  /**
   * List cycles
   */
  listCycles(status?: string): AppraisalCycle[] {
    let cycles = Array.from(this.cycles.values());

    if (status) {
      cycles = cycles.filter(c => c.status === status);
    }

    return cycles;
  }

  /**
   * Start cycle
   */
  startCycle(cycleId: string): void {
    const cycle = this.cycles.get(cycleId);
    if (cycle) {
      cycle.status = 'active';
      logger.info('Appraisal cycle started', { cycleId });
    }
  }

  /**
   * Close cycle
   */
  closeCycle(cycleId: string): void {
    const cycle = this.cycles.get(cycleId);
    if (cycle) {
      cycle.status = 'closed';
      logger.info('Appraisal cycle closed', { cycleId });
    }
  }

  /**
   * Get cycle progress
   */
  getCycleProgress(cycleId: string): { completedReviews: number; totalReviews: number } {
    const reviews = this.cycleReviews.get(cycleId) || [];
    return {
      completedReviews: reviews.length,
      totalReviews: Math.max(reviews.length, 1)
    };
  }
}

// ==================== EXPORTS ====================

export const performanceReviewManager = new PerformanceReviewManager();
export const goalManager = new GoalManager();
export const feedbackManager = new FeedbackManager();
export const appraisalCycleManager = new AppraisalCycleManager();
