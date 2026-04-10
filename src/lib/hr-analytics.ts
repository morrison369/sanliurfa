/**
 * Phase 76: HR Analytics & Insights
 * HR metrics, headcount analysis, turnover, engagement scores, workforce planning
 */

import { logger } from './logging';
import { employeeManager, employeeProfileManager, employmentHistory, type DepartmentType, type Employee } from './hr-employees';
import { jobManager } from './hr-recruitment';
import { feedbackManager, goalManager, performanceReviewManager } from './hr-performance';
import { salaryManager } from './hr-compensation';

// ==================== TYPES & INTERFACES ====================

export interface HRMetrics {
  period: string;
  headcount: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  avgTenure: number;
  openPositions: number;
}

export interface TurnoverAnalysis {
  period: string;
  voluntaryTurnover: number;
  involuntaryTurnover: number;
  topReasons: Record<string, number>;
  riskEmployees: string[];
}

export interface EngagementScore {
  employeeId: string;
  overallScore: number;
  scorecards: Record<string, number>;
  trend: 'improving' | 'declining' | 'stable';
  risks: string[];
}

export interface DiversityMetrics {
  period: string;
  totalEmployees: number;
  byGender: Record<string, number>;
  byEthnicity: Record<string, number>;
  byAge: Record<string, number>;
  byDepartment: Record<string, any>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function getPeriodBounds(period: string): { start: number; end: number } | null {
  const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterMatch) {
    const year = Number.parseInt(quarterMatch[1], 10);
    const quarter = Number.parseInt(quarterMatch[2], 10);
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1).getTime();
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number.parseInt(monthMatch[1], 10);
    const month = Number.parseInt(monthMatch[2], 10) - 1;
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  return null;
}

function getEmployeesActiveOn(asOfDate: number): Employee[] {
  return employeeManager
    .listEmployees()
    .filter(employee => employee.startDate <= asOfDate && (!employee.endDate || employee.endDate >= asOfDate));
}

function getDepartmentSkillRequirements(): Record<DepartmentType, string[]> {
  return {
    engineering: ['TypeScript', 'Testing', 'Cloud Architecture'],
    sales: ['Negotiation', 'CRM', 'Forecasting'],
    marketing: ['Analytics', 'Content Strategy', 'Campaign Management'],
    operations: ['Process Improvement', 'Project Management', 'Reporting'],
    finance: ['Financial Planning', 'Excel', 'Compliance'],
    hr: ['People Operations', 'Coaching', 'Compliance'],
    other: ['Communication', 'Reporting']
  };
}

function getPerformanceScore(employeeId: string): number {
  const latestReview = performanceReviewManager.getPerformanceHistory(employeeId)[0];
  if (!latestReview) return 55;

  switch (latestReview.rating) {
    case 'exceeds_expectations':
      return 92;
    case 'meets_expectations':
      return 76;
    case 'needs_improvement':
      return 48;
    case 'underperforming':
      return 32;
    default:
      return 55;
  }
}

function getGoalCompletionScore(employeeId: string): number {
  const goals = goalManager.listGoals(employeeId);
  if (goals.length === 0) return 60;
  const averageProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;
  return clamp(averageProgress, 0, 100);
}

function getFeedbackScore(employeeId: string): number {
  const feedback = feedbackManager.getFeedback(employeeId);
  if (feedback.length === 0) return 60;
  const averageRating = feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length;
  return clamp(averageRating * 20, 0, 100);
}

function buildEngagementSnapshot(employeeId: string): Omit<EngagementScore, 'trend'> {
  const employee = employeeManager.getEmployee(employeeId);
  const profile = employeeProfileManager.getProfile(employeeId);
  const tenureDays = employee ? Math.max(1, Math.floor((Date.now() - employee.startDate) / DAY_MS)) : 0;
  const profileSkills = profile?.skills || [];
  const profileLanguages = profile?.languages || [];
  const profileCompleteness = profile
    ? [profile.location, profile.officeLocation, profile.bio, profileSkills.length > 0, profileLanguages.length > 0]
        .filter(Boolean).length / 5
    : 0;

  const scorecards: Record<string, number> = {
    satisfaction: round((getPerformanceScore(employeeId) * 0.55) + (getFeedbackScore(employeeId) * 0.45)),
    alignment: round((getGoalCompletionScore(employeeId) * 0.65) + (employee?.managerId ? 15 : 5)),
    growth: round(clamp(profileSkills.length * 12 + ((profile?.certifications || []).length * 10) + (tenureDays > 365 ? 20 : 10), 0, 100)),
    workLifeBalance: round(clamp(55 + profileCompleteness * 20 + (employee?.status === 'on_leave' ? -10 : 10), 0, 100))
  };

  const overallScore = round(
    Object.values(scorecards).reduce((sum, score) => sum + score, 0) / Object.keys(scorecards).length
  );

  const risks: string[] = [];
  if (scorecards.satisfaction < 55) risks.push('Low satisfaction');
  if (scorecards.alignment < 55) risks.push('Misalignment with goals');
  if (scorecards.growth < 55) risks.push('Limited growth opportunities');
  if (scorecards.workLifeBalance < 55) risks.push('Work-life balance concerns');

  return {
    employeeId,
    overallScore,
    scorecards,
    risks
  };
}

// ==================== HR METRICS MANAGER ====================

export class HRMetricsManager {
  private metricsHistory: HRMetrics[] = [];

  /**
   * Record metrics
   */
  recordMetrics(metrics: HRMetrics): void {
    this.metricsHistory.push(metrics);
    logger.info('HR metrics recorded', { period: metrics.period, headcount: metrics.headcount });
  }

  /**
   * Get metrics
   */
  getMetrics(period: string): HRMetrics | null {
    return this.metricsHistory.find(m => m.period === period) || null;
  }

  /**
   * Calculate metrics
   */
  calculateMetrics(startDate: number, endDate: number): HRMetrics {
    const period = `${startDate}-${endDate}`;
    const employeesInRange = employeeManager.listEmployees();
    const activeEmployees = getEmployeesActiveOn(endDate);
    const newHires = employeesInRange.filter(employee => employee.startDate >= startDate && employee.startDate <= endDate).length;
    const terminations = employeesInRange.filter(
      employee => employee.status === 'terminated' && employee.endDate && employee.endDate >= startDate && employee.endDate <= endDate
    ).length;
    const avgTenureDays = activeEmployees.length > 0
      ? activeEmployees.reduce((sum, employee) => sum + Math.max(0, endDate - employee.startDate), 0) / activeEmployees.length
      : 0;
    const headcount = activeEmployees.length;
    const openPositions = jobManager.listPostings('open').reduce((sum, job) => sum + job.openPositions, 0);

    return {
      period,
      headcount,
      newHires,
      terminations,
      turnoverRate: headcount > 0 ? round((terminations / headcount) * 100) : 0,
      avgTenure: round(avgTenureDays / 365),
      openPositions
    };
  }

  /**
   * Compare metrics
   */
  compareMetrics(period1: string, period2: string): Record<string, any> {
    const metrics1 = this.getMetrics(period1);
    const metrics2 = this.getMetrics(period2);

    if (!metrics1 || !metrics2) {
      return {};
    }

    return {
      period1,
      period2,
      headcountChange: metrics2.headcount - metrics1.headcount,
      turnoverRateChange: metrics2.turnoverRate - metrics1.turnoverRate,
      newHiresChange: metrics2.newHires - metrics1.newHires
    };
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis(metric: string, periods: number): { values: number[]; trend: string } {
    const recentMetrics = this.metricsHistory.slice(-periods);
    const values: number[] = [];

    recentMetrics.forEach(m => {
      switch (metric) {
        case 'headcount':
          values.push(m.headcount);
          break;
        case 'turnover':
          values.push(m.turnoverRate);
          break;
        case 'newHires':
          values.push(m.newHires);
          break;
      }
    });

    let trend = 'stable';
    if (values.length >= 2) {
      const diff = values[values.length - 1] - values[0];
      if (diff > 5) trend = 'increasing';
      else if (diff < -5) trend = 'decreasing';
    }

    return { values, trend };
  }
}

// ==================== TURNOVER ANALYZER ====================

export class TurnoverAnalyzer {
  private turnoverRecords: { employeeId: string; reason?: string; voluntary: boolean; timestamp: number }[] = [];

  /**
   * Analyze turnover
   */
  analyze(period: string): TurnoverAnalysis {
    const voluntaryCount = this.turnoverRecords.filter(r => r.voluntary).length;
    const involuntaryCount = this.turnoverRecords.filter(r => !r.voluntary).length;
    const totalTurnover = voluntaryCount + involuntaryCount;

    const reasonCounts: Record<string, number> = {};
    this.turnoverRecords.forEach(r => {
      if (r.reason) {
        reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      }
    });

    return {
      period,
      voluntaryTurnover: voluntaryCount,
      involuntaryTurnover: involuntaryCount,
      topReasons: reasonCounts,
      riskEmployees: this.identifyAtRiskEmployees().map(e => e.employeeId)
    };
  }

  /**
   * Predict turnover
   */
  predictTurnover(employeeId: string): { riskScore: number; riskFactors: string[] } {
    const employee = employeeManager.getEmployee(employeeId);
    if (!employee) {
      return { riskScore: 0, riskFactors: [] };
    }

    const riskFactors: string[] = [];
    let riskScore = 0;

    const engagement = buildEngagementSnapshot(employeeId);
    if (engagement.overallScore < 55) {
      riskFactors.push('Low engagement');
      riskScore += 25;
    }

    const latestReview = performanceReviewManager.getPerformanceHistory(employeeId)[0];
    if (latestReview?.rating === 'needs_improvement') {
      riskFactors.push('Performance issues');
      riskScore += 20;
    } else if (latestReview?.rating === 'underperforming') {
      riskFactors.push('Severe performance issues');
      riskScore += 30;
    }

    const history = employmentHistory.getHistory(employeeId);
    const hasPromotion = history.some(record => record.eventType === 'promotion');
    const tenureDays = Math.floor((Date.now() - employee.startDate) / DAY_MS);
    if (tenureDays > 365 * 3 && !hasPromotion) {
      riskFactors.push('Long tenure without promotion');
      riskScore += 15;
    }

    const salary = salaryManager.getSalary(employeeId);
    if (salary) {
      const departmentSalaries = employeeManager
        .listEmployees('active', employee.department)
        .map(candidate => salaryManager.calculateAnnualSalary(candidate.id))
        .filter(amount => amount > 0);
      const departmentAverage = departmentSalaries.length > 0
        ? departmentSalaries.reduce((sum, amount) => sum + amount, 0) / departmentSalaries.length
        : 0;

      if (departmentAverage > 0 && salaryManager.calculateAnnualSalary(employeeId) < departmentAverage * 0.9) {
        riskFactors.push('Below-market compensation');
        riskScore += 15;
      }
    }

    if (!employeeProfileManager.getProfile(employeeId)) {
      riskFactors.push('Low profile completeness');
      riskScore += 10;
    }

    return { riskScore: Math.min(riskScore, 100), riskFactors };
  }

  /**
   * Identify at-risk employees
   */
  identifyAtRiskEmployees(): Array<{ employeeId: string; riskScore: number }> {
    return employeeManager
      .listEmployees('active')
      .map(employee => ({
        employeeId: employee.id,
        riskScore: this.predictTurnover(employee.id).riskScore
      }))
      .filter(item => item.riskScore >= 40)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Analyze reasons
   */
  analyzeReasons(period: string): Record<string, number> {
    const reasons: Record<string, number> = {};
    this.turnoverRecords.forEach(r => {
      if (r.reason) {
        reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      }
    });
    return reasons;
  }

  /**
   * Calculate retention cost
   */
  calculateRetentionCost(employeeId: string): number {
    return round(salaryManager.calculateAnnualSalary(employeeId) * 0.5);
  }
}

// ==================== ENGAGEMENT ANALYZER ====================

export class EngagementAnalyzer {
  private engagementScores = new Map<string, EngagementScore[]>();

  /**
   * Calculate engagement score
   */
  calculateScore(employeeId: string): EngagementScore {
    const snapshot = buildEngagementSnapshot(employeeId);

    const history = this.engagementScores.get(employeeId) || [];
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (history.length >= 2) {
      const prev = history[history.length - 1];
      if (snapshot.overallScore > prev.overallScore) trend = 'improving';
      else if (snapshot.overallScore < prev.overallScore) trend = 'declining';
    }

    const score: EngagementScore = {
      ...snapshot,
      trend,
      overallScore: Math.round(snapshot.overallScore)
    };

    history.push(score);
    this.engagementScores.set(employeeId, history);

    logger.debug('Engagement score calculated', { employeeId, score: snapshot.overallScore });

    return score;
  }

  /**
   * Get team engagement
   */
  getTeamEngagement(department: string): { avgScore: number; byEmployee: Record<string, number> } {
    const employees = employeeManager.listEmployees('active', department as DepartmentType);
    const byEmployee = employees.reduce<Record<string, number>>((acc, employee) => {
      acc[employee.id] = buildEngagementSnapshot(employee.id).overallScore;
      return acc;
    }, {});
    const scores = Object.values(byEmployee);
    return {
      avgScore: scores.length > 0 ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      byEmployee
    };
  }

  /**
   * Identify disengaged employees
   */
  identifyDisengagedEmployees(): string[] {
    const disengaged: string[] = [];

    this.engagementScores.forEach((scores, employeeId) => {
      if (scores.length > 0) {
        const latest = scores[scores.length - 1];
        if (latest.overallScore < 50) {
          disengaged.push(employeeId);
        }
      }
    });

    return disengaged;
  }

  /**
   * Get engagement trends
   */
  getEngagementTrends(employeeId: string, periods: number): number[] {
    const scores = this.engagementScores.get(employeeId) || [];
    return scores.slice(-periods).map(s => s.overallScore);
  }

  /**
   * Recommend interventions
   */
  recommendInterventions(employeeId: string): string[] {
    const score = this.calculateScore(employeeId);
    const interventions: string[] = [];

    if (score.risks.includes('Low satisfaction')) {
      interventions.push('Schedule 1:1 with manager');
      interventions.push('Review compensation and benefits');
    }
    if (score.risks.includes('Misalignment with goals')) {
      interventions.push('Conduct career development discussion');
      interventions.push('Clarify role expectations');
    }
    if (score.risks.includes('Limited growth opportunities')) {
      interventions.push('Identify training programs');
      interventions.push('Create advancement plan');
    }

    return interventions;
  }
}

// ==================== WORKFORCE ANALYTICS ====================

export class WorkforceAnalytics {
  /**
   * Headcount analysis
   */
  headcountAnalysis(asOfDate: number): {
    total: number;
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const employees = getEmployeesActiveOn(asOfDate);
    const byDepartment = employees.reduce<Record<string, number>>((acc, employee) => {
      acc[employee.department] = (acc[employee.department] || 0) + 1;
      return acc;
    }, {});
    const byStatus = employees.reduce<Record<string, number>>((acc, employee) => {
      acc[employee.status] = (acc[employee.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: employees.length,
      byDepartment,
      byStatus
    };
  }

  /**
   * Hiring summary
   */
  hiringSummary(period: string): {
    totalHired: number;
    byDepartment: Record<string, number>;
    avgTimeToFill: number;
  } {
    const bounds = getPeriodBounds(period);
    const hires = employeeManager
      .listEmployees()
      .filter(employee => !bounds || (employee.startDate >= bounds.start && employee.startDate <= bounds.end));
    const byDepartment = hires.reduce<Record<string, number>>((acc, employee) => {
      acc[employee.department] = (acc[employee.department] || 0) + 1;
      return acc;
    }, {});
    const filledJobs = jobManager
      .listPostings()
      .filter(job => job.status === 'filled' || job.status === 'closed')
      .filter(job => !bounds || !job.closingDate || (job.closingDate >= bounds.start && job.closingDate <= bounds.end))
      .filter(job => job.closingDate && job.postedDate);
    const avgTimeToFill = filledJobs.length > 0
      ? round(filledJobs.reduce((sum, job) => sum + ((job.closingDate! - job.postedDate) / DAY_MS), 0) / filledJobs.length)
      : 0;

    return {
      totalHired: hires.length,
      byDepartment,
      avgTimeToFill
    };
  }

  /**
   * Get diversity metrics
   */
  getDiversityMetrics(period: string): DiversityMetrics {
    const employees = employeeManager.listEmployees('active');
    const totalEmployees = employees.length;
    const byDepartment = employees.reduce<Record<string, { total: number; avgTenure: number }>>((acc, employee) => {
      const current = acc[employee.department] || { total: 0, avgTenure: 0 };
      const tenureYears = (Date.now() - employee.startDate) / (365 * DAY_MS);
      current.total += 1;
      current.avgTenure += tenureYears;
      acc[employee.department] = current;
      return acc;
    }, {});

    Object.keys(byDepartment).forEach(department => {
      const current = byDepartment[department];
      current.avgTenure = round(current.avgTenure / Math.max(current.total, 1));
    });

    return {
      period,
      totalEmployees,
      byGender: {
        undisclosed: totalEmployees
      },
      byEthnicity: {
        undisclosed: totalEmployees
      },
      byAge: {
        unknown: totalEmployees
      }
      ,
      byDepartment
    };
  }

  /**
   * Skill gap analysis
   */
  skillGapAnalysis(): Record<string, any> {
    const departmentRequirements = getDepartmentSkillRequirements();
    const departmentGaps = employeeManager.listEmployees('active').reduce<Record<string, string[]>>((acc, employee) => {
      const requiredSkills = departmentRequirements[employee.department] || [];
      const currentSkills = new Set(employeeProfileManager.getProfile(employee.id)?.skills || []);
      const missingSkills = requiredSkills.filter(skill => !currentSkills.has(skill));

      if (missingSkills.length > 0) {
        acc[employee.department] = Array.from(new Set([...(acc[employee.department] || []), ...missingSkills]));
      }

      return acc;
    }, {});

    const criticalGaps = Array.from(new Set(Object.values(departmentGaps).flat())).slice(0, 5);

    return {
      criticalGaps,
      departmentGaps,
      recommendedTraining: criticalGaps.map(skill => `${skill} training`)
    };
  }

  /**
   * Successor planning analysis
   */
  successorPlanningAnalysis(): Record<string, any> {
    const leadershipRoles = employeeManager
      .listEmployees('active')
      .filter(employee => employeeManager.getDirectReports(employee.id).length > 0);

    const criticalRoles = leadershipRoles.map(employee => employee.title);
    const successorCandidates = leadershipRoles.reduce<Record<string, string[]>>((acc, leader) => {
      const candidates = employeeManager
        .listEmployees('active', leader.department)
        .filter(employee => employee.id !== leader.id)
        .filter(employee => getPerformanceScore(employee.id) >= 76)
        .sort((left, right) => {
          const rightScore = getPerformanceScore(right.id) + goalManager.listGoals(right.id).reduce((sum, goal) => sum + goal.progress, 0);
          const leftScore = getPerformanceScore(left.id) + goalManager.listGoals(left.id).reduce((sum, goal) => sum + goal.progress, 0);
          return rightScore - leftScore;
        })
        .slice(0, 3)
        .map(employee => employee.id);

      acc[leader.title] = candidates;
      return acc;
    }, {});

    const readinessByRole = Object.entries(successorCandidates).reduce<Record<string, { ready: number; developing: number }>>((acc, [role, candidates]) => {
      const readiness = candidates.reduce(
        (result, candidateId) => {
          const performanceScore = getPerformanceScore(candidateId);
          if (performanceScore >= 90) {
            result.ready += 1;
          } else {
            result.developing += 1;
          }
          return result;
        },
        { ready: 0, developing: 0 }
      );
      acc[role] = readiness;
      return acc;
    }, {});

    return {
      criticalRoles,
      successorCandidates,
      readinessByRole
    };
  }
}

// ==================== EXPORTS ====================

export const hrMetricsManager = new HRMetricsManager();
export const turnoverAnalyzer = new TurnoverAnalyzer();
export const engagementAnalyzer = new EngagementAnalyzer();
export const workforceAnalytics = new WorkforceAnalytics();
