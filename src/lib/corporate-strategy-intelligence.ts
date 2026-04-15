/**
 * Phase 310: Corporate Strategy Intelligence
 * Strategic goals, OKR tracking, initiative portfolio, strategic risk
 */

import { logger } from './logger';

interface StrategicGoalRecord {
  goalId: string;
  goalName: string;
  strategicTheme: string;
  timeHorizon: '1_year' | '3_year' | '5_year';
  owner: string;
  ownerDepartment: string;
  targetValueUSD?: number;
  currentValueUSD?: number;
  targetMetric: string;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  progressPct: number;
  weight: number;                  // 0-100 — strategic importance
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'cancelled';
  linkedInitiatives: string[];
  lastReviewedAt: number;
  createdAt: number;
}

interface OKRRecord {
  okrId: string;
  period: string;                  // e.g., '2026-Q1'
  level: 'company' | 'department' | 'team';
  department?: string;
  objectiveStatement: string;
  keyResults: {
    krId: string;
    description: string;
    startValue: number;
    targetValue: number;
    currentValue: number;
    progressPct: number;
    confidence: 'green' | 'yellow' | 'red';
  }[];
  avgProgressPct: number;
  overallConfidence: 'green' | 'yellow' | 'red';
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

interface StrategicInitiativeRecord {
  initiativeId: string;
  name: string;
  strategicGoalId: string;
  sponsorName: string;
  ownerName: string;
  businessCase: string;
  expectedBenefitUSD: number;
  investmentUSD: number;
  expectedROIPct: number;
  startDate: number;
  targetEndDate: number;
  actualEndDate?: number;
  milestonesTotal: number;
  milestonesComplete: number;
  completionPct: number;
  budgetSpentUSD: number;
  budgetVariancePct: number;
  ragStatus: 'green' | 'amber' | 'red';
  risksIdentified: number;
  risksOpen: number;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  createdAt: number;
}

interface StrategicRiskRecord {
  riskId: string;
  riskCategory: 'market' | 'competitive' | 'regulatory' | 'technology' | 'operational' | 'financial' | 'talent' | 'geopolitical';
  description: string;
  affectedGoals: string[];
  likelihood: number;       // 1-5
  impact: number;           // 1-5
  riskScore: number;
  velocity: 'accelerating' | 'stable' | 'decelerating';
  mitigationStrategy: string;
  mitigationStatus: 'not_started' | 'in_progress' | 'mitigated';
  owner: string;
  reviewedAt: number;
  identifiedAt: number;
}

class StrategicGoalManager {
  private goals: Map<string, StrategicGoalRecord> = new Map();
  private counter = 0;

  define(name: string, theme: string, horizon: StrategicGoalRecord['timeHorizon'], owner: string, dept: string, metric: string, baseline: number, target: number, weight: number, initiatives: string[]): StrategicGoalRecord {
    const goalId = `goal-${Date.now()}-${++this.counter}`;
    const record: StrategicGoalRecord = {
      goalId, goalName: name, strategicTheme: theme, timeHorizon: horizon,
      owner, ownerDepartment: dept, targetMetric: metric, baselineValue: baseline,
      targetValue: target, currentValue: baseline, progressPct: 0, weight,
      status: 'on_track', linkedInitiatives: initiatives,
      lastReviewedAt: Date.now(), createdAt: Date.now()
    };
    this.goals.set(goalId, record);
    logger.debug('Strategic goal defined', { goalId, name, theme, horizon });
    return record;
  }

  updateProgress(goalId: string, currentValue: number): boolean {
    const g = this.goals.get(goalId);
    if (!g) return false;
    g.currentValue = currentValue;
    const range = g.targetValue - g.baselineValue;
    g.progressPct = range !== 0 ? Math.round(((currentValue - g.baselineValue) / range) * 100) : 0;
    g.status = g.progressPct >= 100 ? 'achieved' : g.progressPct >= 70 ? 'on_track' : g.progressPct >= 40 ? 'at_risk' : 'behind';
    g.lastReviewedAt = Date.now();
    return true;
  }

  getAtRiskGoals(): StrategicGoalRecord[] {
    return Array.from(this.goals.values()).filter(g => g.status === 'at_risk' || g.status === 'behind');
  }

  getOverallPortfolioProgress(): number {
    const goals = Array.from(this.goals.values());
    if (!goals.length) return 0;
    const totalWeight = goals.reduce((s, g) => s + g.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.round(goals.reduce((s, g) => s + g.progressPct * g.weight, 0) / totalWeight);
  }

  getGoal(id: string): StrategicGoalRecord | undefined {
    return this.goals.get(id);
  }
}

class OKRTracker {
  private okrs: Map<string, OKRRecord> = new Map();
  private counter = 0;

  create(period: string, level: OKRRecord['level'], objective: string, dept?: string): OKRRecord {
    const okrId = `okr-${Date.now()}-${++this.counter}`;
    const record: OKRRecord = {
      okrId, period, level, department: dept, objectiveStatement: objective,
      keyResults: [], avgProgressPct: 0, overallConfidence: 'green',
      status: 'active', createdAt: Date.now()
    };
    this.okrs.set(okrId, record);
    return record;
  }

  addKeyResult(okrId: string, description: string, startVal: number, targetVal: number): string {
    const okr = this.okrs.get(okrId);
    if (!okr) return '';
    const krId = `kr-${Date.now()}-${this.counter}`;
    okr.keyResults.push({
      krId, description, startValue: startVal, targetValue: targetVal,
      currentValue: startVal, progressPct: 0, confidence: 'green'
    });
    return krId;
  }

  updateKeyResult(okrId: string, krId: string, currentValue: number, confidence: 'green' | 'yellow' | 'red'): boolean {
    const okr = this.okrs.get(okrId);
    if (!okr) return false;
    const kr = okr.keyResults.find(k => k.krId === krId);
    if (!kr) return false;
    kr.currentValue = currentValue;
    const range = kr.targetValue - kr.startValue;
    kr.progressPct = range !== 0 ? Math.round(((currentValue - kr.startValue) / range) * 100) : 0;
    kr.confidence = confidence;
    okr.avgProgressPct = okr.keyResults.length > 0
      ? Math.round(okr.keyResults.reduce((s, k) => s + k.progressPct, 0) / okr.keyResults.length) : 0;
    const redCount = okr.keyResults.filter(k => k.confidence === 'red').length;
    const yellowCount = okr.keyResults.filter(k => k.confidence === 'yellow').length;
    okr.overallConfidence = redCount > 0 ? 'red' : yellowCount > 0 ? 'yellow' : 'green';
    return true;
  }

  getAtRiskOKRs(): OKRRecord[] {
    return Array.from(this.okrs.values()).filter(o => o.overallConfidence === 'red' || o.overallConfidence === 'yellow');
  }

  getCompanyOKRs(period: string): OKRRecord[] {
    return Array.from(this.okrs.values()).filter(o => o.level === 'company' && o.period === period);
  }

  getOKR(id: string): OKRRecord | undefined {
    return this.okrs.get(id);
  }
}

class StrategicInitiativeManager {
  private initiatives: Map<string, StrategicInitiativeRecord> = new Map();
  private counter = 0;

  register(name: string, goalId: string, sponsor: string, owner: string, businessCase: string, expectedBenefit: number, investment: number, startDate: number, targetEnd: number, milestones: number): StrategicInitiativeRecord {
    const initiativeId = `init-${Date.now()}-${++this.counter}`;
    const expectedROI = investment > 0 ? Math.round(((expectedBenefit - investment) / investment) * 100) : 0;
    const record: StrategicInitiativeRecord = {
      initiativeId, name, strategicGoalId: goalId, sponsorName: sponsor, ownerName: owner,
      businessCase, expectedBenefitUSD: expectedBenefit, investmentUSD: investment,
      expectedROIPct: expectedROI, startDate, targetEndDate: targetEnd,
      milestonesTotal: milestones, milestonesComplete: 0, completionPct: 0,
      budgetSpentUSD: 0, budgetVariancePct: 0, ragStatus: 'green',
      risksIdentified: 0, risksOpen: 0, status: 'planning', createdAt: Date.now()
    };
    this.initiatives.set(initiativeId, record);
    logger.debug('Strategic initiative registered', { initiativeId, name, expectedROI });
    return record;
  }

  updateProgress(initiativeId: string, milestonesComplete: number, budgetSpent: number): boolean {
    const i = this.initiatives.get(initiativeId);
    if (!i) return false;
    i.milestonesComplete = Math.min(milestonesComplete, i.milestonesTotal);
    i.completionPct = i.milestonesTotal > 0 ? Math.round((i.milestonesComplete / i.milestonesTotal) * 100) : 0;
    i.budgetSpentUSD = budgetSpent;
    i.budgetVariancePct = i.investmentUSD > 0 ? Math.round(((budgetSpent - i.investmentUSD) / i.investmentUSD) * 100 * 10) / 10 : 0;
    i.ragStatus = i.budgetVariancePct > 20 || i.completionPct < 30 ? 'red' : i.budgetVariancePct > 10 ? 'amber' : 'green';
    i.status = i.completionPct === 100 ? 'completed' : 'active';
    return true;
  }

  getPortfolioSummary(): { total: number; active: number; atRisk: number; totalInvestmentUSD: number; totalExpectedBenefitUSD: number } {
    const all = Array.from(this.initiatives.values());
    return {
      total: all.length,
      active: all.filter(i => i.status === 'active').length,
      atRisk: all.filter(i => i.ragStatus === 'red' || i.ragStatus === 'amber').length,
      totalInvestmentUSD: all.reduce((s, i) => s + i.investmentUSD, 0),
      totalExpectedBenefitUSD: all.reduce((s, i) => s + i.expectedBenefitUSD, 0)
    };
  }

  getRedInitiatives(): StrategicInitiativeRecord[] {
    return Array.from(this.initiatives.values()).filter(i => i.ragStatus === 'red');
  }

  getInitiative(id: string): StrategicInitiativeRecord | undefined {
    return this.initiatives.get(id);
  }
}

class StrategicRiskRegister {
  private risks: StrategicRiskRecord[] = [];
  private counter = 0;

  register(category: StrategicRiskRecord['riskCategory'], description: string, affectedGoals: string[], likelihood: number, impact: number, velocity: StrategicRiskRecord['velocity'], mitigation: string, owner: string): StrategicRiskRecord {
    const riskId = `strisk-${Date.now()}-${++this.counter}`;
    const record: StrategicRiskRecord = {
      riskId, riskCategory: category, description, affectedGoals,
      likelihood: Math.max(1, Math.min(5, likelihood)), impact: Math.max(1, Math.min(5, impact)),
      riskScore: likelihood * impact, velocity, mitigationStrategy: mitigation,
      mitigationStatus: 'not_started', owner, reviewedAt: Date.now(), identifiedAt: Date.now()
    };
    this.risks.push(record);
    return record;
  }

  getCriticalRisks(threshold = 15): StrategicRiskRecord[] {
    return this.risks.filter(r => r.riskScore >= threshold).sort((a, b) => b.riskScore - a.riskScore);
  }

  getAcceleratingRisks(): StrategicRiskRecord[] {
    return this.risks.filter(r => r.velocity === 'accelerating');
  }

  getRiskHeatmap(): { category: string; avgScore: number; count: number }[] {
    const byCategory: Record<string, number[]> = {};
    this.risks.forEach(r => {
      if (!byCategory[r.riskCategory]) byCategory[r.riskCategory] = [];
      byCategory[r.riskCategory].push(r.riskScore);
    });
    return Object.entries(byCategory).map(([category, scores]) => ({
      category, avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10, count: scores.length
    })).sort((a, b) => b.avgScore - a.avgScore);
  }
}

export const strategicGoalManager = new StrategicGoalManager();
export const okrTracker = new OKRTracker();
export const strategicInitiativeManager = new StrategicInitiativeManager();
export const strategicRiskRegister = new StrategicRiskRegister();

export { StrategicGoalRecord, OKRRecord, StrategicInitiativeRecord, StrategicRiskRecord };
