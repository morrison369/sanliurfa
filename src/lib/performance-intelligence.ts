/**
 * Phase 205: Performance Intelligence
 * Performance metrics tracking, goal alignment, performance prediction, team analytics
 */

import { logger } from './logger';

interface PerformanceReview {
  reviewId: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  overallScore: number; // 1-5
  dimensionScores: Record<string, number>;
  strengths: string[];
  areasForImprovement: string[];
  performanceBand: 'exceptional' | 'exceeds' | 'meets' | 'below' | 'unsatisfactory';
  createdAt: number;
}

interface Goal {
  goalId: string;
  employeeId: string;
  title: string;
  description: string;
  targetMetric: number;
  currentMetric: number;
  unit: string;
  dueDate: number;
  weight: number; // 0-1
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk' | 'missed';
  progressPct: number;
  alignedToOrgGoal: string;
}

interface PerformancePrediction {
  predictionId: string;
  employeeId: string;
  predictedBand: PerformanceReview['performanceBand'];
  confidence: number;
  riskFactors: string[];
  positiveIndicators: string[];
  generatedAt: number;
}

interface TeamPerformanceSummary {
  teamId: string;
  period: string;
  avgScore: number;
  topPerformers: string[];
  atRiskMembers: string[];
  goalCompletionRate: number;
  distributionByBand: Record<PerformanceReview['performanceBand'], number>;
}

class PerformanceMetricsTracker {
  private reviews: Map<string, PerformanceReview[]> = new Map();
  private counter = 0;

  submitReview(employeeId: string, reviewerId: string, period: string, overallScore: number, dimensionScores: Record<string, number>, strengths: string[], improvements: string[]): PerformanceReview {
    const clampedScore = Math.max(1, Math.min(5, overallScore));
    const band: PerformanceReview['performanceBand'] =
      clampedScore >= 4.5 ? 'exceptional' :
        clampedScore >= 3.5 ? 'exceeds' :
          clampedScore >= 2.5 ? 'meets' :
            clampedScore >= 1.5 ? 'below' : 'unsatisfactory';

    const review: PerformanceReview = {
      reviewId: `review-${Date.now()}-${++this.counter}`,
      employeeId, reviewerId, period, overallScore: clampedScore,
      dimensionScores, strengths, areasForImprovement: improvements,
      performanceBand: band, createdAt: Date.now()
    };
    const emp = this.reviews.get(employeeId) || [];
    emp.push(review);
    this.reviews.set(employeeId, emp);
    logger.debug('Performance review submitted', { employeeId, period, overallScore: clampedScore, band });
    return review;
  }

  getLatestReview(employeeId: string): PerformanceReview | undefined {
    const reviews = this.reviews.get(employeeId) || [];
    return reviews[reviews.length - 1];
  }

  getPerformanceTrend(employeeId: string): 'improving' | 'declining' | 'stable' {
    const reviews = this.reviews.get(employeeId) || [];
    if (reviews.length < 2) return 'stable';
    const prev = reviews[reviews.length - 2].overallScore;
    const curr = reviews[reviews.length - 1].overallScore;
    return curr - prev > 0.5 ? 'improving' : prev - curr > 0.5 ? 'declining' : 'stable';
  }

  getOrgAvgScore(period: string): number {
    const allReviews = Array.from(this.reviews.values()).flat().filter(r => r.period === period);
    if (!allReviews.length) return 0;
    return allReviews.reduce((s, r) => s + r.overallScore, 0) / allReviews.length;
  }
}

class GoalAlignmentAnalyzer {
  private goals: Map<string, Goal[]> = new Map();
  private counter = 0;

  addGoal(employeeId: string, title: string, targetMetric: number, unit: string, dueDays: number, weight: number, alignedToOrgGoal: string): Goal {
    const goalId = `goal-${Date.now()}-${++this.counter}`;
    const goal: Goal = {
      goalId, employeeId, title, description: '',
      targetMetric, currentMetric: 0, unit,
      dueDate: Date.now() + dueDays * 86400000,
      weight: Math.max(0, Math.min(1, weight)),
      status: 'not_started', progressPct: 0,
      alignedToOrgGoal
    };
    const emp = this.goals.get(employeeId) || [];
    emp.push(goal);
    this.goals.set(employeeId, emp);
    return goal;
  }

  updateProgress(goalId: string, currentMetric: number): Goal | undefined {
    for (const goals of this.goals.values()) {
      const goal = goals.find(g => g.goalId === goalId);
      if (goal) {
        goal.currentMetric = currentMetric;
        goal.progressPct = goal.targetMetric > 0 ? Math.min(100, (currentMetric / goal.targetMetric) * 100) : 0;
        const daysLeft = (goal.dueDate - Date.now()) / 86400000;
        if (goal.progressPct >= 100) goal.status = 'completed';
        else if (daysLeft < 14 && goal.progressPct < 50) goal.status = 'at_risk';
        else if (goal.progressPct > 0) goal.status = 'in_progress';
        return goal;
      }
    }
    return undefined;
  }

  getAlignmentScore(employeeId: string, orgGoal: string): number {
    const goals = (this.goals.get(employeeId) || []).filter(g => g.alignedToOrgGoal === orgGoal);
    if (!goals.length) return 0;
    return goals.reduce((s, g) => s + g.weight, 0) * 100;
  }

  getEmployeeGoals(employeeId: string): Goal[] {
    return this.goals.get(employeeId) || [];
  }
}

class PerformancePredictionEngine {
  private predictions: Map<string, PerformancePrediction> = new Map();
  private counter = 0;

  predict(employeeId: string, reviewHistory: PerformanceReview[], goalCompletionRate: number, engagementScore: number): PerformancePrediction {
    const avgScore = reviewHistory.length > 0
      ? reviewHistory.slice(-3).reduce((s, r) => s + r.overallScore, 0) / Math.min(3, reviewHistory.length)
      : 3;
    const trendBonus = reviewHistory.length >= 2
      ? (reviewHistory[reviewHistory.length - 1].overallScore - reviewHistory[0].overallScore) * 0.1
      : 0;
    const predictedRaw = avgScore + trendBonus + (goalCompletionRate - 0.5) * 0.5 + (engagementScore / 100 - 0.5) * 0.3;
    const predicted = Math.max(1, Math.min(5, predictedRaw));

    const band: PerformanceReview['performanceBand'] =
      predicted >= 4.5 ? 'exceptional' : predicted >= 3.5 ? 'exceeds' : predicted >= 2.5 ? 'meets' : predicted >= 1.5 ? 'below' : 'unsatisfactory';

    const riskFactors: string[] = [];
    if (goalCompletionRate < 0.5) riskFactors.push('low_goal_completion');
    if (engagementScore < 40) riskFactors.push('low_engagement');
    if (trendBonus < -0.2) riskFactors.push('declining_trend');

    const positiveIndicators: string[] = [];
    if (goalCompletionRate >= 0.8) positiveIndicators.push('high_goal_completion');
    if (engagementScore >= 70) positiveIndicators.push('high_engagement');
    if (trendBonus > 0.2) positiveIndicators.push('improving_trend');

    const confidence = Math.min(95, 50 + reviewHistory.length * 5 + (riskFactors.length === 0 ? 20 : 0));
    const predictionId = `pred-${Date.now()}-${++this.counter}`;
    const prediction: PerformancePrediction = {
      predictionId, employeeId, predictedBand: band, confidence, riskFactors, positiveIndicators, generatedAt: Date.now()
    };
    this.predictions.set(employeeId, prediction);
    return prediction;
  }

  getPrediction(employeeId: string): PerformancePrediction | undefined {
    return this.predictions.get(employeeId);
  }

  getAtRiskEmployees(): string[] {
    return Array.from(this.predictions.entries())
      .filter(([, p]) => p.predictedBand === 'below' || p.predictedBand === 'unsatisfactory')
      .map(([employeeId]) => employeeId);
  }
}

class TeamPerformanceAnalyzer {
  summarize(teamId: string, period: string, reviews: PerformanceReview[], goals: Goal[]): TeamPerformanceSummary {
    const avgScore = reviews.length > 0 ? reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length : 0;
    const topPerformers = reviews.filter(r => r.performanceBand === 'exceptional' || r.performanceBand === 'exceeds').map(r => r.employeeId);
    const atRiskMembers = reviews.filter(r => r.performanceBand === 'below' || r.performanceBand === 'unsatisfactory').map(r => r.employeeId);
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalCompletionRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

    const distribution: Record<PerformanceReview['performanceBand'], number> = { exceptional: 0, exceeds: 0, meets: 0, below: 0, unsatisfactory: 0 };
    for (const r of reviews) distribution[r.performanceBand]++;

    logger.debug('Team performance summarized', { teamId, period, avgScore: avgScore.toFixed(2), goalCompletionRate: goalCompletionRate.toFixed(1) });
    return { teamId, period, avgScore, topPerformers, atRiskMembers, goalCompletionRate, distributionByBand: distribution };
  }
}

export const performanceMetricsTracker = new PerformanceMetricsTracker();
export const goalAlignmentAnalyzer = new GoalAlignmentAnalyzer();
export const performancePredictionEngine = new PerformancePredictionEngine();
export const teamPerformanceAnalyzer = new TeamPerformanceAnalyzer();

export { PerformanceReview, Goal, PerformancePrediction, TeamPerformanceSummary };
