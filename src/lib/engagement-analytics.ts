/**
 * Phase 207: Engagement Analytics
 * Engagement surveys, pulse checks, retention risk analysis, engagement action tracking
 */

import { logger } from './logger';

interface EngagementSurveyResponse {
  responseId: string;
  surveyId: string;
  employeeId: string;
  department: string;
  scores: Record<string, number>; // dimension -> score (1-5)
  overallEngagement: number;
  verbatimFeedback: string;
  isAnonymous: boolean;
  submittedAt: number;
}

interface PulseCheck {
  pulseId: string;
  employeeId: string;
  question: string;
  score: number; // 1-5
  context: string;
  checkedAt: number;
}

interface RetentionRisk {
  riskId: string;
  employeeId: string;
  riskScore: number; // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  signals: string[];
  estimatedFlightRisk: number; // probability 0-1
  recommendedActions: string[];
  assessedAt: number;
}

interface EngagementAction {
  actionId: string;
  triggeredBy: string; // riskId or surveyId
  department: string;
  actionType: 'manager_conversation' | 'skip_level_meeting' | 'recognition' | 'development_opportunity' | 'compensation_review';
  assignedTo: string;
  dueDate: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  impactScore?: number;
  createdAt: number;
}

class EngagementSurveyManager {
  private responses: Map<string, EngagementSurveyResponse[]> = new Map();
  private counter = 0;

  record(surveyId: string, employeeId: string, department: string, scores: Record<string, number>, verbatim = '', anonymous = true): EngagementSurveyResponse {
    const values = Object.values(scores);
    const overallEngagement = values.length > 0 ? (values.reduce((s, v) => s + v, 0) / values.length / 5) * 100 : 0;
    const responseId = `engsurvey-${Date.now()}-${++this.counter}`;
    const response: EngagementSurveyResponse = {
      responseId, surveyId, employeeId, department, scores,
      overallEngagement, verbatimFeedback: verbatim,
      isAnonymous: anonymous, submittedAt: Date.now()
    };
    const survey = this.responses.get(surveyId) || [];
    survey.push(response);
    this.responses.set(surveyId, survey);
    logger.debug('Engagement survey recorded', { surveyId, department, overallEngagement: overallEngagement.toFixed(1) });
    return response;
  }

  getSurveyStats(surveyId: string): { avgEngagement: number; responseCount: number; byDepartment: Record<string, number> } {
    const responses = this.responses.get(surveyId) || [];
    const avgEngagement = responses.length > 0 ? responses.reduce((s, r) => s + r.overallEngagement, 0) / responses.length : 0;
    const byDepartment: Record<string, number> = {};
    for (const r of responses) {
      const dept = r.department;
      const deptResponses = responses.filter(res => res.department === dept);
      byDepartment[dept] = deptResponses.reduce((s, res) => s + res.overallEngagement, 0) / deptResponses.length;
    }
    return { avgEngagement, responseCount: responses.length, byDepartment };
  }

  getDimensionScores(surveyId: string): Record<string, number> {
    const responses = this.responses.get(surveyId) || [];
    const dimensionTotals: Record<string, number[]> = {};
    for (const r of responses) {
      for (const [dim, score] of Object.entries(r.scores)) {
        if (!dimensionTotals[dim]) dimensionTotals[dim] = [];
        dimensionTotals[dim].push(score);
      }
    }
    const result: Record<string, number> = {};
    for (const [dim, scores] of Object.entries(dimensionTotals)) {
      result[dim] = scores.reduce((s, v) => s + v, 0) / scores.length;
    }
    return result;
  }
}

class PulseCheckTracker {
  private checks: Map<string, PulseCheck[]> = new Map();
  private counter = 0;

  record(employeeId: string, question: string, score: number, context = ''): PulseCheck {
    const pulseId = `pulse-${Date.now()}-${++this.counter}`;
    const check: PulseCheck = {
      pulseId, employeeId, question,
      score: Math.max(1, Math.min(5, score)),
      context, checkedAt: Date.now()
    };
    const emp = this.checks.get(employeeId) || [];
    emp.push(check);
    if (emp.length > 50) emp.shift();
    this.checks.set(employeeId, emp);
    return check;
  }

  getEmployeeTrend(employeeId: string, windowSize = 5): 'improving' | 'declining' | 'stable' {
    const checks = (this.checks.get(employeeId) || []).slice(-windowSize);
    if (checks.length < 2) return 'stable';
    const prev = checks.slice(0, Math.floor(checks.length / 2)).reduce((s, c) => s + c.score, 0) / Math.floor(checks.length / 2);
    const curr = checks.slice(Math.floor(checks.length / 2)).reduce((s, c) => s + c.score, 0) / Math.ceil(checks.length / 2);
    return curr - prev > 0.5 ? 'improving' : prev - curr > 0.5 ? 'declining' : 'stable';
  }

  getAvgScore(employeeId: string): number {
    const checks = this.checks.get(employeeId) || [];
    if (!checks.length) return 0;
    return checks.reduce((s, c) => s + c.score, 0) / checks.length;
  }

  getLowScoreEmployees(threshold = 2.5): string[] {
    return Array.from(this.checks.keys()).filter(id => this.getAvgScore(id) <= threshold);
  }
}

class RetentionRiskAnalyzer {
  private risks: Map<string, RetentionRisk> = new Map();
  private counter = 0;

  assess(employeeId: string, signals: string[]): RetentionRisk {
    const signalWeights: Record<string, number> = {
      low_engagement: 20, low_pulse_scores: 15, peer_departures: 10, no_promotion_18mo: 15,
      manager_conflict: 25, below_market_comp: 20, interview_activity: 35, low_performance: 10
    };
    const riskScore = Math.min(100, signals.reduce((s, sig) => s + (signalWeights[sig] || 5), 0));
    const flightRisk = riskScore / 100;
    const riskLevel: RetentionRisk['riskLevel'] =
      riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

    const actions: string[] = [];
    if (signals.includes('below_market_comp')) actions.push('compensation_review');
    if (signals.includes('manager_conflict')) actions.push('skip_level_meeting');
    if (signals.includes('no_promotion_18mo')) actions.push('development_opportunity');
    if (riskScore >= 50) actions.push('manager_conversation');

    const riskId = `risk-${Date.now()}-${++this.counter}`;
    const risk: RetentionRisk = {
      riskId, employeeId, riskScore, riskLevel,
      signals, estimatedFlightRisk: flightRisk,
      recommendedActions: actions, assessedAt: Date.now()
    };
    this.risks.set(employeeId, risk);
    logger.debug('Retention risk assessed', { riskId, employeeId, riskLevel, riskScore });
    return risk;
  }

  getHighRiskEmployees(): RetentionRisk[] {
    return Array.from(this.risks.values())
      .filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high')
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  getRisk(employeeId: string): RetentionRisk | undefined {
    return this.risks.get(employeeId);
  }
}

class EngagementActionTracker {
  private actions: Map<string, EngagementAction> = new Map();
  private counter = 0;

  create(triggeredBy: string, department: string, actionType: EngagementAction['actionType'], assignedTo: string, dueDays: number): EngagementAction {
    const actionId = `engaction-${Date.now()}-${++this.counter}`;
    const action: EngagementAction = {
      actionId, triggeredBy, department, actionType, assignedTo,
      dueDate: Date.now() + dueDays * 86400000,
      status: 'pending', createdAt: Date.now()
    };
    this.actions.set(actionId, action);
    logger.debug('Engagement action created', { actionId, department, actionType, assignedTo });
    return action;
  }

  complete(actionId: string, impactScore: number): boolean {
    const action = this.actions.get(actionId);
    if (action) { action.status = 'completed'; action.impactScore = Math.max(0, Math.min(100, impactScore)); return true; }
    return false;
  }

  getOverdueActions(): EngagementAction[] {
    return Array.from(this.actions.values())
      .filter(a => a.status === 'pending' && a.dueDate < Date.now());
  }

  getCompletionRate(): number {
    const all = Array.from(this.actions.values());
    if (!all.length) return 0;
    return (all.filter(a => a.status === 'completed').length / all.length) * 100;
  }

  getPendingByDepartment(department: string): EngagementAction[] {
    return Array.from(this.actions.values())
      .filter(a => a.department === department && a.status === 'pending');
  }
}

export const engagementSurveyManager = new EngagementSurveyManager();
export const pulseCheckTracker = new PulseCheckTracker();
export const retentionRiskAnalyzer = new RetentionRiskAnalyzer();
export const engagementActionTracker = new EngagementActionTracker();

export { EngagementSurveyResponse, PulseCheck, RetentionRisk, EngagementAction };
