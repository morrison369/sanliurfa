/**
 * Phase 76: HR Analytics & Insights
 * HR metrics, headcount analysis, turnover, engagement scores, workforce planning
 */

import { logger } from './logging';

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
    // Placeholder calculation
    return {
      period,
      headcount: 100,
      newHires: 5,
      terminations: 2,
      turnoverRate: 2.4,
      avgTenure: 3.5,
      openPositions: 8
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
    // Placeholder: would analyze engagement, salary, performance data
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Simulated risk calculation
    if (Math.random() > 0.7) {
      riskFactors.push('Low engagement');
      riskScore += 25;
    }
    if (Math.random() > 0.8) {
      riskFactors.push('Performance issues');
      riskScore += 20;
    }
    if (Math.random() > 0.9) {
      riskFactors.push('Long tenure without promotion');
      riskScore += 15;
    }

    return { riskScore: Math.min(riskScore, 100), riskFactors };
  }

  /**
   * Identify at-risk employees
   */
  identifyAtRiskEmployees(): Array<{ employeeId: string; riskScore: number }> {
    // Placeholder: would check all employees for risk indicators
    return [];
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
    // Cost formula: 50-200% of annual salary
    // Placeholder calculation
    return 75000; // Example
  }
}

// ==================== ENGAGEMENT ANALYZER ====================

export class EngagementAnalyzer {
  private engagementScores = new Map<string, EngagementScore[]>();

  /**
   * Calculate engagement score
   */
  calculateScore(employeeId: string): EngagementScore {
    // Placeholder: would aggregate survey data, performance reviews, etc.
    const scorecards: Record<string, number> = {
      satisfaction: Math.floor(Math.random() * 100),
      alignment: Math.floor(Math.random() * 100),
      growth: Math.floor(Math.random() * 100),
      workLifeBalance: Math.floor(Math.random() * 100)
    };

    const overallScore =
      Object.values(scorecards).reduce((sum, s) => sum + s, 0) / Object.keys(scorecards).length;

    const history = this.engagementScores.get(employeeId) || [];
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (history.length >= 2) {
      const prev = history[history.length - 1];
      if (overallScore > prev.overallScore) trend = 'improving';
      else if (overallScore < prev.overallScore) trend = 'declining';
    }

    const risks: string[] = [];
    if (scorecards.satisfaction < 50) risks.push('Low satisfaction');
    if (scorecards.alignment < 50) risks.push('Misalignment with goals');
    if (scorecards.growth < 50) risks.push('Limited growth opportunities');

    const score: EngagementScore = {
      employeeId,
      overallScore: Math.round(overallScore),
      scorecards,
      trend,
      risks
    };

    history.push(score);
    this.engagementScores.set(employeeId, history);

    logger.debug('Engagement score calculated', { employeeId, score: overallScore });

    return score;
  }

  /**
   * Get team engagement
   */
  getTeamEngagement(department: string): { avgScore: number; byEmployee: Record<string, number> } {
    // Placeholder: would filter by department
    return { avgScore: 72, byEmployee: {} };
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
    // Placeholder: would query employee data
    return {
      total: 150,
      byDepartment: {
        engineering: 45,
        sales: 35,
        marketing: 25,
        operations: 20,
        finance: 15,
        hr: 10
      },
      byStatus: {
        active: 140,
        onLeave: 5,
        inactive: 5
      }
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
    // Placeholder: would query recruitment data
    return {
      totalHired: 12,
      byDepartment: {
        engineering: 6,
        sales: 3,
        marketing: 2,
        operations: 1
      },
      avgTimeToFill: 28 // days
    };
  }

  /**
   * Get diversity metrics
   */
  getDiversityMetrics(period: string): DiversityMetrics {
    return {
      period,
      totalEmployees: 150,
      byGender: {
        male: 85,
        female: 60,
        nonBinary: 5
      },
      byEthnicity: {
        white: 70,
        hispanic: 30,
        asian: 25,
        black: 15,
        other: 10
      },
      byAge: {
        '18-25': 15,
        '26-35': 55,
        '36-45': 50,
        '46-55': 20,
        '56+': 10
      },
      byDepartment: {
        engineering: { total: 45, femaleCount: 12, avgTenure: 3.2 },
        sales: { total: 35, femaleCount: 14, avgTenure: 2.8 },
        marketing: { total: 25, femaleCount: 12, avgTenure: 3.5 }
      }
    };
  }

  /**
   * Skill gap analysis
   */
  skillGapAnalysis(): Record<string, any> {
    // Placeholder: would analyze skills data
    return {
      criticalGaps: ['Cloud Architecture', 'Advanced Python', 'ML Engineering'],
      departmentGaps: {
        engineering: ['Kubernetes', 'GraphQL'],
        sales: ['Salesforce Admin', 'Deal Negotiation']
      },
      recommendedTraining: ['Advanced Cloud', 'Python Mastery', 'ML Basics']
    };
  }

  /**
   * Successor planning analysis
   */
  successorPlanningAnalysis(): Record<string, any> {
    // Placeholder: would identify succession candidates
    return {
      criticalRoles: ['VP Engineering', 'Director Sales', 'CFO'],
      successorCandidates: {
        'VP Engineering': ['emp-001', 'emp-042'],
        'Director Sales': ['emp-103', 'emp-087'],
        'CFO': ['emp-156']
      },
      readinessByRole: {
        'VP Engineering': { ready: 1, developing: 1 },
        'Director Sales': { ready: 1, developing: 1 }
      }
    };
  }
}

// ==================== EXPORTS ====================

export const hrMetricsManager = new HRMetricsManager();
export const turnoverAnalyzer = new TurnoverAnalyzer();
export const engagementAnalyzer = new EngagementAnalyzer();
export const workforceAnalytics = new WorkforceAnalytics();
