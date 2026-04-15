/**
 * Phase 268: Corporate Performance Management
 * Balanced scorecard, KPI cascading, strategy execution tracking, performance dashboards
 */

import { logger } from './logger';

interface BalancedScorecardPerspective {
  perspectiveId: string;
  name: 'financial' | 'customer' | 'internal_process' | 'learning_growth';
  objectives: Array<{
    objectiveId: string;
    title: string;
    weight: number;       // % of perspective score
    kpiIds: string[];
  }>;
  perspectiveScore: number;  // 0-100
  weight: number;            // % of overall scorecard
  updatedAt: number;
}

interface KPICascadeItem {
  cascadeId: string;
  kpiName: string;
  corporateTarget: number;
  unit: string;
  divisions: Array<{
    divisionName: string;
    cascadedTarget: number;
    actualValue: number;
    achievementPct: number;
    status: 'achieved' | 'on_track' | 'at_risk' | 'missed';
  }>;
  aggregationMethod: 'sum' | 'average' | 'weighted_average';
  corporateActual: number;
  corporateAchievementPct: number;
  createdAt: number;
}

interface StrategyExecutionPulse {
  pulseId: string;
  period: string;
  initiativesOnTrack: number;
  initiativesAtRisk: number;
  initiativesBehind: number;
  totalInitiatives: number;
  executionRatePct: number;     // on_track / total × 100
  budgetUtilizationPct: number;
  milestoneCompletionPct: number;
  overallPulse: 'green' | 'amber' | 'red';
  keyRisks: string[];
  recordedAt: number;
}

interface PerformanceDashboardSnapshot {
  snapshotId: string;
  period: string;
  overallScorecardScore: number;
  financialScore: number;
  customerScore: number;
  processScore: number;
  learningScore: number;
  topPerformingUnit: string;
  bottomPerformingUnit: string;
  criticalKPIs: string[];    // KPIs in red zone
  generatedAt: number;
}

class BalancedScorecardManager {
  private perspectives: Map<string, BalancedScorecardPerspective> = new Map();
  private counter = 0;

  upsertPerspective(name: BalancedScorecardPerspective['name'], objectives: BalancedScorecardPerspective['objectives'], perspectiveScore: number, weight: number): BalancedScorecardPerspective {
    const existing = Array.from(this.perspectives.values()).find(p => p.name === name);
    if (existing) {
      existing.objectives = objectives;
      existing.perspectiveScore = Math.max(0, Math.min(100, perspectiveScore));
      existing.weight = weight;
      existing.updatedAt = Date.now();
      return existing;
    }
    const perspectiveId = `bsc-${Date.now()}-${++this.counter}`;
    const perspective: BalancedScorecardPerspective = {
      perspectiveId, name, objectives,
      perspectiveScore: Math.max(0, Math.min(100, perspectiveScore)),
      weight, updatedAt: Date.now()
    };
    this.perspectives.set(perspectiveId, perspective);
    logger.debug('BSC perspective updated', { name, perspectiveScore });
    return perspective;
  }

  getOverallScore(): number {
    const all = Array.from(this.perspectives.values());
    const totalWeight = all.reduce((s, p) => s + p.weight, 0);
    if (totalWeight === 0) return 0;
    return all.reduce((s, p) => s + p.perspectiveScore * p.weight, 0) / totalWeight;
  }

  getWeakestPerspective(): BalancedScorecardPerspective | undefined {
    return Array.from(this.perspectives.values())
      .sort((a, b) => a.perspectiveScore - b.perspectiveScore)[0];
  }

  getPerspective(name: BalancedScorecardPerspective['name']): BalancedScorecardPerspective | undefined {
    return Array.from(this.perspectives.values()).find(p => p.name === name);
  }
}

class KPICascadeManager {
  private cascades: Map<string, KPICascadeItem> = new Map();
  private counter = 0;

  create(kpiName: string, corporateTarget: number, unit: string, aggregationMethod: KPICascadeItem['aggregationMethod']): KPICascadeItem {
    const cascadeId = `kpicascade-${Date.now()}-${++this.counter}`;
    const cascade: KPICascadeItem = {
      cascadeId, kpiName, corporateTarget, unit, divisions: [],
      aggregationMethod, corporateActual: 0, corporateAchievementPct: 0, createdAt: Date.now()
    };
    this.cascades.set(cascadeId, cascade);
    return cascade;
  }

  addDivision(cascadeId: string, divisionName: string, cascadedTarget: number, actualValue: number): boolean {
    const cascade = this.cascades.get(cascadeId);
    if (!cascade) return false;
    const achievementPct = cascadedTarget > 0 ? (actualValue / cascadedTarget) * 100 : 0;
    const status: KPICascadeItem['divisions'][0]['status'] =
      achievementPct >= 100 ? 'achieved' : achievementPct >= 80 ? 'on_track' :
      achievementPct >= 60 ? 'at_risk' : 'missed';

    cascade.divisions.push({ divisionName, cascadedTarget, actualValue, achievementPct, status });

    // Recalculate corporate actual
    if (cascade.aggregationMethod === 'sum') {
      cascade.corporateActual = cascade.divisions.reduce((s, d) => s + d.actualValue, 0);
    } else {
      cascade.corporateActual = cascade.divisions.reduce((s, d) => s + d.actualValue, 0) / cascade.divisions.length;
    }
    cascade.corporateAchievementPct = cascade.corporateTarget > 0
      ? (cascade.corporateActual / cascade.corporateTarget) * 100 : 0;
    return true;
  }

  getMissedKPIs(): KPICascadeItem[] {
    return Array.from(this.cascades.values())
      .filter(c => c.corporateAchievementPct < 60);
  }

  getCascade(cascadeId: string): KPICascadeItem | undefined {
    return this.cascades.get(cascadeId);
  }
}

class StrategyExecutionMonitor {
  private pulses: StrategyExecutionPulse[] = [];
  private counter = 0;

  record(period: string, onTrack: number, atRisk: number, behind: number, budgetUtil: number, milestoneCompletion: number, keyRisks: string[]): StrategyExecutionPulse {
    const total = onTrack + atRisk + behind;
    const executionRatePct = total > 0 ? (onTrack / total) * 100 : 0;
    const overallPulse: StrategyExecutionPulse['overallPulse'] =
      executionRatePct >= 70 && behind === 0 ? 'green' :
      executionRatePct >= 50 ? 'amber' : 'red';

    const pulseId = `stratpulse-${Date.now()}-${++this.counter}`;
    const pulse: StrategyExecutionPulse = {
      pulseId, period, initiativesOnTrack: onTrack, initiativesAtRisk: atRisk,
      initiativesBehind: behind, totalInitiatives: total, executionRatePct,
      budgetUtilizationPct: budgetUtil, milestoneCompletionPct: milestoneCompletion,
      overallPulse, keyRisks, recordedAt: Date.now()
    };
    this.pulses.push(pulse);
    return pulse;
  }

  getLatest(): StrategyExecutionPulse | undefined {
    return this.pulses[this.pulses.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.pulses.length < 2) return 'stable';
    const diff = this.pulses[this.pulses.length - 1].executionRatePct - this.pulses[this.pulses.length - 2].executionRatePct;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }
}

class PerformanceDashboardEngine {
  private snapshots: PerformanceDashboardSnapshot[] = [];
  private counter = 0;

  snapshot(period: string, financial: number, customer: number, process: number, learning: number, unitScores: Record<string, number>, criticalKPIs: string[]): PerformanceDashboardSnapshot {
    const overallScore = financial * 0.4 + customer * 0.25 + process * 0.2 + learning * 0.15;
    const sorted = Object.entries(unitScores).sort(([, a], [, b]) => b - a);
    const topUnit = sorted[0]?.[0] || '';
    const bottomUnit = sorted[sorted.length - 1]?.[0] || '';

    const snapshotId = `perfdash-${Date.now()}-${++this.counter}`;
    const snap: PerformanceDashboardSnapshot = {
      snapshotId, period, overallScorecardScore: Math.max(0, Math.min(100, overallScore)),
      financialScore: financial, customerScore: customer, processScore: process, learningScore: learning,
      topPerformingUnit: topUnit, bottomPerformingUnit: bottomUnit, criticalKPIs, generatedAt: Date.now()
    };
    this.snapshots.push(snap);
    return snap;
  }

  getLatest(): PerformanceDashboardSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.snapshots.length < 2) return 'stable';
    const diff = this.snapshots[this.snapshots.length - 1].overallScorecardScore - this.snapshots[this.snapshots.length - 2].overallScorecardScore;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }
}

export const balancedScorecardManager = new BalancedScorecardManager();
export const kpiCascadeManager = new KPICascadeManager();
export const strategyExecutionMonitor = new StrategyExecutionMonitor();
export const performanceDashboardEngine = new PerformanceDashboardEngine();

export { BalancedScorecardPerspective, KPICascadeItem, StrategyExecutionPulse, PerformanceDashboardSnapshot };
