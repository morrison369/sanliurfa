/**
 * Phase 251: Employee Experience Intelligence
 * EX scoring, pulse surveys, wellbeing tracking, engagement drivers, eNPS
 */

import { logger } from './logger';

interface EmployeeExperienceScore {
  scoreId: string;
  employeeId: string;
  department: string;
  period: string;
  workLifeBalanceScore: number;   // 0-100
  growthOpportunityScore: number; // 0-100
  managerRelationshipScore: number; // 0-100
  toolsResourcesScore: number;    // 0-100
  recognitionScore: number;       // 0-100
  overallEXScore: number;         // weighted composite
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

interface PulseSurveyResponse {
  responseId: string;
  surveyId: string;
  employeeId: string;
  department: string;
  responses: Record<string, number>;  // questionId → score
  sentimentText?: string;
  npsScore?: number;   // -100 to 100
  submittedAt: number;
}

interface WellbeingIndicator {
  indicatorId: string;
  employeeId: string;
  period: string;
  stressLevel: number;       // 1-10 (lower = better)
  burnoutRisk: 'low' | 'medium' | 'high' | 'critical';
  overtimeHoursPerWeek: number;
  ptoDaysUsedPct: number;    // % of entitled PTO used
  absenceRatePct: number;
  wellbeingScore: number;    // composite 0-100
  recordedAt: number;
}

interface EngagementDriver {
  driverId: string;
  name: string;
  category: 'culture' | 'leadership' | 'growth' | 'compensation' | 'tools' | 'autonomy';
  impactScore: number;    // correlation with engagement
  currentScore: number;  // how well we're doing
  benchmarkScore: number;
  gap: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  updatedAt: number;
}

class EXScoreCalculator {
  private scores: Map<string, EmployeeExperienceScore[]> = new Map();
  private counter = 0;

  calculate(employeeId: string, department: string, period: string, workLifeBalance: number, growth: number, managerRel: number, tools: number, recognition: number): EmployeeExperienceScore {
    const overall = workLifeBalance * 0.25 + growth * 0.2 + managerRel * 0.25 + tools * 0.15 + recognition * 0.15;
    const history = this.scores.get(employeeId) || [];
    const prev = history[history.length - 1];
    const trend: EmployeeExperienceScore['trend'] = prev
      ? (overall - prev.overallEXScore > 3 ? 'improving' : prev.overallEXScore - overall > 3 ? 'declining' : 'stable')
      : 'stable';

    const scoreId = `exscore-${Date.now()}-${++this.counter}`;
    const score: EmployeeExperienceScore = {
      scoreId, employeeId, department, period,
      workLifeBalanceScore: Math.max(0, Math.min(100, workLifeBalance)),
      growthOpportunityScore: Math.max(0, Math.min(100, growth)),
      managerRelationshipScore: Math.max(0, Math.min(100, managerRel)),
      toolsResourcesScore: Math.max(0, Math.min(100, tools)),
      recognitionScore: Math.max(0, Math.min(100, recognition)),
      overallEXScore: Math.max(0, Math.min(100, overall)), trend, calculatedAt: Date.now()
    };
    history.push(score);
    this.scores.set(employeeId, history);
    return score;
  }

  getDepartmentAverage(department: string): number {
    const latest = Array.from(this.scores.values())
      .map(h => h[h.length - 1])
      .filter((s): s is EmployeeExperienceScore => !!s && s.department === department);
    if (!latest.length) return 0;
    return latest.reduce((s, e) => s + e.overallEXScore, 0) / latest.length;
  }

  getAtRisk(threshold = 50): EmployeeExperienceScore[] {
    return Array.from(this.scores.values())
      .map(h => h[h.length - 1])
      .filter((s): s is EmployeeExperienceScore => !!s && s.overallEXScore < threshold)
      .sort((a, b) => a.overallEXScore - b.overallEXScore);
  }

  getLatest(employeeId: string): EmployeeExperienceScore | undefined {
    const history = this.scores.get(employeeId) || [];
    return history[history.length - 1];
  }
}

class PulseSurveyAnalyzer {
  private responses: Map<string, PulseSurveyResponse[]> = new Map();  // keyed by surveyId
  private counter = 0;

  submit(surveyId: string, employeeId: string, department: string, responses: Record<string, number>, npsScore?: number, sentimentText?: string): PulseSurveyResponse {
    const responseId = `pulseResp-${Date.now()}-${++this.counter}`;
    const response: PulseSurveyResponse = {
      responseId, surveyId, employeeId, department, responses, sentimentText, npsScore, submittedAt: Date.now()
    };
    const existing = this.responses.get(surveyId) || [];
    existing.push(response);
    this.responses.set(surveyId, existing);
    return response;
  }

  getSurveyNPS(surveyId: string): number {
    const responses = (this.responses.get(surveyId) || []).filter(r => r.npsScore !== undefined);
    if (!responses.length) return 0;
    const promoters = responses.filter(r => (r.npsScore || 0) >= 9).length;
    const detractors = responses.filter(r => (r.npsScore || 0) <= 6).length;
    return ((promoters - detractors) / responses.length) * 100;
  }

  getResponseRate(surveyId: string, totalInvited: number): number {
    const count = (this.responses.get(surveyId) || []).length;
    return totalInvited > 0 ? (count / totalInvited) * 100 : 0;
  }

  getQuestionAverage(surveyId: string, questionId: string): number {
    const responses = this.responses.get(surveyId) || [];
    const scores = responses.map(r => r.responses[questionId]).filter(s => s !== undefined);
    if (!scores.length) return 0;
    return scores.reduce((s, v) => s + v, 0) / scores.length;
  }
}

class WellbeingMonitor {
  private indicators: Map<string, WellbeingIndicator[]> = new Map();
  private counter = 0;

  record(employeeId: string, period: string, stressLevel: number, overtimeHrs: number, ptoDaysUsedPct: number, absenceRatePct: number): WellbeingIndicator {
    const burnoutRisk: WellbeingIndicator['burnoutRisk'] =
      stressLevel >= 8 || overtimeHrs >= 20 ? 'critical' :
      stressLevel >= 7 || overtimeHrs >= 15 ? 'high' :
      stressLevel >= 5 || overtimeHrs >= 10 ? 'medium' : 'low';

    // Wellbeing: lower stress + reasonable hours + using PTO = better
    const stressScore = Math.max(0, 100 - stressLevel * 10);
    const overtimeScore = Math.max(0, 100 - overtimeHrs * 5);
    const ptoScore = Math.min(100, ptoDaysUsedPct);
    const absenceScore = Math.max(0, 100 - absenceRatePct * 10);
    const wellbeingScore = stressScore * 0.4 + overtimeScore * 0.3 + ptoScore * 0.2 + absenceScore * 0.1;

    const indicatorId = `wellbeing-${Date.now()}-${++this.counter}`;
    const indicator: WellbeingIndicator = {
      indicatorId, employeeId, period, stressLevel, burnoutRisk, overtimeHoursPerWeek: overtimeHrs,
      ptoDaysUsedPct, absenceRatePct, wellbeingScore: Math.max(0, Math.min(100, wellbeingScore)), recordedAt: Date.now()
    };
    const history = this.indicators.get(employeeId) || [];
    history.push(indicator);
    this.indicators.set(employeeId, history);
    return indicator;
  }

  getHighBurnoutRisk(): WellbeingIndicator[] {
    return Array.from(this.indicators.values())
      .map(h => h[h.length - 1])
      .filter((i): i is WellbeingIndicator => !!i && (i.burnoutRisk === 'critical' || i.burnoutRisk === 'high'))
      .sort((a, b) => b.stressLevel - a.stressLevel);
  }

  getLatest(employeeId: string): WellbeingIndicator | undefined {
    const history = this.indicators.get(employeeId) || [];
    return history[history.length - 1];
  }
}

class EngagementDriverAnalyzer {
  private drivers: Map<string, EngagementDriver> = new Map();
  private counter = 0;

  upsert(name: string, category: EngagementDriver['category'], impactScore: number, currentScore: number, benchmarkScore: number): EngagementDriver {
    const existing = Array.from(this.drivers.values()).find(d => d.name === name);
    const gap = benchmarkScore - currentScore;
    const priority: EngagementDriver['priority'] =
      gap > 20 && impactScore > 0.7 ? 'critical' :
      gap > 15 ? 'high' :
      gap > 8 ? 'medium' : 'low';

    if (existing) {
      existing.impactScore = impactScore;
      existing.currentScore = currentScore;
      existing.benchmarkScore = benchmarkScore;
      existing.gap = gap;
      existing.priority = priority;
      existing.updatedAt = Date.now();
      return existing;
    }

    const driverId = `engdriver-${Date.now()}-${++this.counter}`;
    const driver: EngagementDriver = {
      driverId, name, category, impactScore, currentScore, benchmarkScore, gap, priority, updatedAt: Date.now()
    };
    this.drivers.set(driverId, driver);
    logger.debug('Engagement driver updated', { name, gap, priority });
    return driver;
  }

  getTopPriority(limit = 5): EngagementDriver[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return Array.from(this.drivers.values())
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.gap - a.gap)
      .slice(0, limit);
  }

  getByCategory(category: EngagementDriver['category']): EngagementDriver[] {
    return Array.from(this.drivers.values()).filter(d => d.category === category);
  }
}

export const exScoreCalculator = new EXScoreCalculator();
export const pulseSurveyAnalyzer = new PulseSurveyAnalyzer();
export const wellbeingMonitor = new WellbeingMonitor();
export const engagementDriverAnalyzer = new EngagementDriverAnalyzer();

export { EmployeeExperienceScore, PulseSurveyResponse, WellbeingIndicator, EngagementDriver };
