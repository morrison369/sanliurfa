/**
 * Phase 246: Technical Debt Intelligence
 * Debt identification, remediation tracking, debt cost calculation, health scoring
 */

import { logger } from './logger';

interface TechnicalDebtItem {
  debtId: string;
  title: string;
  description: string;
  type: 'code' | 'architecture' | 'test' | 'documentation' | 'dependency' | 'security' | 'infrastructure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffortHours: number;
  interestRatePerMonth: number;  // how much harder it gets per month
  accruedCost: number;           // effort * months_outstanding * interest
  affectedServices: string[];
  reportedBy: string;
  status: 'identified' | 'accepted' | 'in_progress' | 'resolved' | 'deferred';
  identifiedAt: number;
  resolvedAt?: number;
}

interface DebtRemediationPlan {
  planId: string;
  debtId: string;
  sprint: string;
  assignedTeam: string;
  plannedEffortHours: number;
  actualEffortHours: number;
  progressPct: number;
  blockers: string[];
  status: 'planned' | 'active' | 'completed' | 'blocked';
  createdAt: number;
}

interface DebtCostEstimate {
  estimateId: string;
  period: string;
  totalDebtItems: number;
  criticalItems: number;
  estimatedRemediationCost: number;
  estimatedSlowdownCost: number;  // velocity lost due to debt
  totalDebtCost: number;
  debtRatioPct: number;  // debt cost / total dev cost
  calculatedAt: number;
}

interface TechHealthScore {
  healthId: string;
  service: string;
  codeQualityScore: number;      // 0-100
  testCoverageScore: number;     // 0-100
  dependencyHealthScore: number; // 0-100
  architectureScore: number;     // 0-100
  overallHealthScore: number;    // weighted
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

class TechnicalDebtRegister {
  private items: Map<string, TechnicalDebtItem> = new Map();
  private counter = 0;

  register(title: string, description: string, type: TechnicalDebtItem['type'], severity: TechnicalDebtItem['severity'], estimatedHours: number, affectedServices: string[], reportedBy: string): TechnicalDebtItem {
    const interestRatePerMonth = severity === 'critical' ? 0.1 : severity === 'high' ? 0.05 : severity === 'medium' ? 0.02 : 0.01;
    const debtId = `debt-${Date.now()}-${++this.counter}`;
    const item: TechnicalDebtItem = {
      debtId, title, description, type, severity, estimatedEffortHours: estimatedHours,
      interestRatePerMonth, accruedCost: estimatedHours,
      affectedServices, reportedBy, status: 'identified', identifiedAt: Date.now()
    };
    this.items.set(debtId, item);
    logger.debug('Technical debt registered', { debtId, title, severity });
    return item;
  }

  accrueInterest(): void {
    for (const item of this.items.values()) {
      if (item.status !== 'resolved') {
        const monthsOutstanding = (Date.now() - item.identifiedAt) / (30 * 86400 * 1000);
        item.accruedCost = item.estimatedEffortHours * (1 + item.interestRatePerMonth * monthsOutstanding);
      }
    }
  }

  resolve(debtId: string): boolean {
    const item = this.items.get(debtId);
    if (!item) return false;
    item.status = 'resolved';
    item.resolvedAt = Date.now();
    return true;
  }

  getByType(type: TechnicalDebtItem['type']): TechnicalDebtItem[] {
    return Array.from(this.items.values()).filter(i => i.type === type && i.status !== 'resolved');
  }

  getCritical(): TechnicalDebtItem[] {
    return Array.from(this.items.values())
      .filter(i => i.severity === 'critical' && i.status !== 'resolved')
      .sort((a, b) => b.accruedCost - a.accruedCost);
  }

  getTotalAccruedCost(): number {
    return Array.from(this.items.values())
      .filter(i => i.status !== 'resolved')
      .reduce((s, i) => s + i.accruedCost, 0);
  }
}

class DebtRemediationTracker {
  private plans: Map<string, DebtRemediationPlan[]> = new Map();
  private counter = 0;

  plan(debtId: string, sprint: string, assignedTeam: string, plannedHours: number): DebtRemediationPlan {
    const planId = `remplan-${Date.now()}-${++this.counter}`;
    const plan: DebtRemediationPlan = {
      planId, debtId, sprint, assignedTeam, plannedEffortHours: plannedHours,
      actualEffortHours: 0, progressPct: 0, blockers: [], status: 'planned', createdAt: Date.now()
    };
    const existing = this.plans.get(debtId) || [];
    existing.push(plan);
    this.plans.set(debtId, existing);
    return plan;
  }

  updateProgress(planId: string, progressPct: number, actualHours: number, blockers: string[] = []): boolean {
    for (const planList of this.plans.values()) {
      const plan = planList.find(p => p.planId === planId);
      if (plan) {
        plan.progressPct = Math.max(0, Math.min(100, progressPct));
        plan.actualEffortHours = actualHours;
        plan.blockers = blockers;
        plan.status = progressPct >= 100 ? 'completed' : blockers.length > 0 ? 'blocked' : 'active';
        return true;
      }
    }
    return false;
  }

  getBlocked(): DebtRemediationPlan[] {
    return Array.from(this.plans.values()).flat().filter(p => p.status === 'blocked');
  }

  getCompletionRate(): number {
    const all = Array.from(this.plans.values()).flat();
    if (!all.length) return 0;
    return (all.filter(p => p.status === 'completed').length / all.length) * 100;
  }
}

class DebtCostCalculator {
  private estimates: DebtCostEstimate[] = [];
  private counter = 0;

  calculate(period: string, items: TechnicalDebtItem[], totalDevCostHours: number, hourlyRate: number): DebtCostEstimate {
    const open = items.filter(i => i.status !== 'resolved');
    const critical = open.filter(i => i.severity === 'critical').length;
    const remediationCost = open.reduce((s, i) => s + i.accruedCost, 0) * hourlyRate;
    const slowdownCost = remediationCost * 0.3;  // 30% overhead on dev velocity
    const totalDebtCost = remediationCost + slowdownCost;
    const debtRatioPct = totalDevCostHours > 0 ? (totalDebtCost / (totalDevCostHours * hourlyRate)) * 100 : 0;
    const estimateId = `debtcost-${Date.now()}-${++this.counter}`;
    const estimate: DebtCostEstimate = {
      estimateId, period, totalDebtItems: open.length, criticalItems: critical,
      estimatedRemediationCost: remediationCost, estimatedSlowdownCost: slowdownCost,
      totalDebtCost, debtRatioPct, calculatedAt: Date.now()
    };
    this.estimates.push(estimate);
    return estimate;
  }

  getLatest(): DebtCostEstimate | undefined {
    return this.estimates[this.estimates.length - 1];
  }
}

class TechHealthScorer {
  private scores: Map<string, TechHealthScore[]> = new Map();
  private counter = 0;

  score(service: string, codeQuality: number, testCoverage: number, depHealth: number, architecture: number): TechHealthScore {
    const overall = codeQuality * 0.3 + testCoverage * 0.25 + depHealth * 0.25 + architecture * 0.2;
    const history = this.scores.get(service) || [];
    const prev = history[history.length - 1];
    const trend: TechHealthScore['trend'] = prev
      ? (overall - prev.overallHealthScore > 3 ? 'improving' : prev.overallHealthScore - overall > 3 ? 'declining' : 'stable')
      : 'stable';
    const healthId = `techhealth-${Date.now()}-${++this.counter}`;
    const record: TechHealthScore = {
      healthId, service, codeQualityScore: Math.max(0, Math.min(100, codeQuality)),
      testCoverageScore: Math.max(0, Math.min(100, testCoverage)),
      dependencyHealthScore: Math.max(0, Math.min(100, depHealth)),
      architectureScore: Math.max(0, Math.min(100, architecture)),
      overallHealthScore: Math.max(0, Math.min(100, overall)), trend, calculatedAt: Date.now()
    };
    history.push(record);
    this.scores.set(service, history);
    return record;
  }

  getUnhealthyServices(threshold = 60): TechHealthScore[] {
    return Array.from(this.scores.values())
      .map(h => h[h.length - 1])
      .filter((s): s is TechHealthScore => !!s && s.overallHealthScore < threshold)
      .sort((a, b) => a.overallHealthScore - b.overallHealthScore);
  }

  getLatest(service: string): TechHealthScore | undefined {
    const history = this.scores.get(service) || [];
    return history[history.length - 1];
  }
}

export const technicalDebtRegister = new TechnicalDebtRegister();
export const debtRemediationTracker = new DebtRemediationTracker();
export const debtCostCalculator = new DebtCostCalculator();
export const techHealthScorer = new TechHealthScorer();

export { TechnicalDebtItem, DebtRemediationPlan, DebtCostEstimate, TechHealthScore };
