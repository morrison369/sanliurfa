/**
 * Phase 225: Strategic Planning Intelligence
 * Strategic objective management, OKR tracking, scenario planning, strategy execution analytics
 */

import { logger } from './logger';

interface StrategicObjective {
  objectiveId: string;
  title: string;
  description: string;
  pillar: 'growth' | 'efficiency' | 'innovation' | 'talent' | 'customer' | 'sustainability';
  timeHorizon: 'annual' | 'three_year' | 'five_year';
  owner: string;
  status: 'draft' | 'approved' | 'active' | 'achieved' | 'at_risk' | 'missed';
  progressPct: number;
  createdAt: number;
}

interface OKRRecord {
  okrId: string;
  objectiveId: string;
  period: string;
  objective: string;
  keyResults: Array<{ krId: string; description: string; target: number; current: number; unit: string }>;
  overallProgress: number;  // 0-100
  confidence: number;       // 0-100
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  updatedAt: number;
}

interface ScenarioPlan {
  scenarioId: string;
  name: string;
  type: 'base' | 'optimistic' | 'pessimistic' | 'stress';
  assumptions: string[];
  projectedRevenue: number;
  projectedCosts: number;
  probability: number;  // 0-1
  keyRisks: string[];
  keyOpportunities: string[];
  createdAt: number;
}

interface StrategyExecutionMetric {
  metricId: string;
  period: string;
  initiativesTotal: number;
  initiativesOnTrack: number;
  initiativesAtRisk: number;
  initiativesMissed: number;
  strategicAlignmentScore: number;  // 0-100
  executionVelocity: number;        // initiatives completed per quarter
  capturedAt: number;
}

class StrategicObjectiveManager {
  private objectives: Map<string, StrategicObjective> = new Map();
  private counter = 0;

  create(title: string, description: string, pillar: StrategicObjective['pillar'], timeHorizon: StrategicObjective['timeHorizon'], owner: string): StrategicObjective {
    const objectiveId = `strobj-${Date.now()}-${++this.counter}`;
    const objective: StrategicObjective = {
      objectiveId, title, description, pillar, timeHorizon, owner,
      status: 'draft', progressPct: 0, createdAt: Date.now()
    };
    this.objectives.set(objectiveId, objective);
    logger.debug('Strategic objective created', { objectiveId, title, pillar });
    return objective;
  }

  updateProgress(objectiveId: string, progressPct: number): boolean {
    const obj = this.objectives.get(objectiveId);
    if (!obj) return false;
    obj.progressPct = Math.max(0, Math.min(100, progressPct));
    obj.status = progressPct >= 100 ? 'achieved' : progressPct >= 70 ? 'active' : progressPct >= 30 ? 'at_risk' : obj.status;
    return true;
  }

  getByPillar(pillar: StrategicObjective['pillar']): StrategicObjective[] {
    return Array.from(this.objectives.values()).filter(o => o.pillar === pillar);
  }

  getAtRisk(): StrategicObjective[] {
    return Array.from(this.objectives.values()).filter(o => o.status === 'at_risk');
  }

  getOverallProgress(): number {
    const all = Array.from(this.objectives.values()).filter(o => o.status !== 'draft');
    if (!all.length) return 0;
    return all.reduce((s, o) => s + o.progressPct, 0) / all.length;
  }
}

class OKRTracker {
  private okrs: Map<string, OKRRecord> = new Map();
  private counter = 0;

  create(objectiveId: string, period: string, objective: string, keyResults: OKRRecord['keyResults']): OKRRecord {
    const okrId = `okr-${Date.now()}-${++this.counter}`;
    const okr: OKRRecord = {
      okrId, objectiveId, period, objective, keyResults,
      overallProgress: 0, confidence: 50, status: 'on_track', updatedAt: Date.now()
    };
    this.okrs.set(okrId, okr);
    return okr;
  }

  updateKeyResult(okrId: string, krId: string, current: number): boolean {
    const okr = this.okrs.get(okrId);
    if (!okr) return false;
    const kr = okr.keyResults.find(k => k.krId === krId);
    if (!kr) return false;
    kr.current = current;
    const totalProgress = okr.keyResults.reduce((s, k) => s + (k.target > 0 ? Math.min(100, (k.current / k.target) * 100) : 0), 0);
    okr.overallProgress = okr.keyResults.length > 0 ? totalProgress / okr.keyResults.length : 0;
    okr.status = okr.overallProgress >= 100 ? 'achieved' : okr.overallProgress >= 70 ? 'on_track' : okr.overallProgress >= 40 ? 'at_risk' : 'behind';
    okr.updatedAt = Date.now();
    return true;
  }

  getByPeriod(period: string): OKRRecord[] {
    return Array.from(this.okrs.values()).filter(o => o.period === period);
  }

  getAtRisk(): OKRRecord[] {
    return Array.from(this.okrs.values()).filter(o => o.status === 'at_risk' || o.status === 'behind');
  }

  getOKR(okrId: string): OKRRecord | undefined {
    return this.okrs.get(okrId);
  }
}

class ScenarioPlanningEngine {
  private scenarios: Map<string, ScenarioPlan> = new Map();
  private counter = 0;

  create(name: string, type: ScenarioPlan['type'], assumptions: string[], projectedRevenue: number, projectedCosts: number, probability: number, keyRisks: string[], keyOpportunities: string[]): ScenarioPlan {
    const scenarioId = `scenario-${Date.now()}-${++this.counter}`;
    const scenario: ScenarioPlan = {
      scenarioId, name, type, assumptions,
      projectedRevenue, projectedCosts,
      probability: Math.max(0, Math.min(1, probability)),
      keyRisks, keyOpportunities, createdAt: Date.now()
    };
    this.scenarios.set(scenarioId, scenario);
    logger.debug('Scenario plan created', { scenarioId, name, type, probability });
    return scenario;
  }

  getWeightedProjection(): { revenue: number; costs: number } {
    const all = Array.from(this.scenarios.values());
    if (!all.length) return { revenue: 0, costs: 0 };
    const totalProb = all.reduce((s, sc) => s + sc.probability, 0);
    if (!totalProb) return { revenue: 0, costs: 0 };
    return {
      revenue: all.reduce((s, sc) => s + sc.projectedRevenue * sc.probability, 0) / totalProb,
      costs: all.reduce((s, sc) => s + sc.projectedCosts * sc.probability, 0) / totalProb
    };
  }

  getScenario(scenarioId: string): ScenarioPlan | undefined {
    return this.scenarios.get(scenarioId);
  }

  getAllScenarios(): ScenarioPlan[] {
    return Array.from(this.scenarios.values());
  }
}

class StrategyExecutionAnalyzer {
  private metrics: StrategyExecutionMetric[] = [];
  private counter = 0;

  record(period: string, total: number, onTrack: number, atRisk: number, missed: number, alignmentScore: number, velocity: number): StrategyExecutionMetric {
    const metricId = `strexec-${Date.now()}-${++this.counter}`;
    const metric: StrategyExecutionMetric = {
      metricId, period, initiativesTotal: total, initiativesOnTrack: onTrack,
      initiativesAtRisk: atRisk, initiativesMissed: missed,
      strategicAlignmentScore: Math.max(0, Math.min(100, alignmentScore)),
      executionVelocity: velocity, capturedAt: Date.now()
    };
    this.metrics.push(metric);
    return metric;
  }

  getLatest(): StrategyExecutionMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getExecutionHealth(): 'healthy' | 'warning' | 'critical' {
    const latest = this.getLatest();
    if (!latest) return 'healthy';
    const onTrackRate = latest.initiativesTotal > 0 ? latest.initiativesOnTrack / latest.initiativesTotal : 1;
    return onTrackRate >= 0.7 ? 'healthy' : onTrackRate >= 0.5 ? 'warning' : 'critical';
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.metrics.length < 2) return 'stable';
    const prev = this.metrics[this.metrics.length - 2];
    const curr = this.metrics[this.metrics.length - 1];
    const diff = curr.strategicAlignmentScore - prev.strategicAlignmentScore;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }
}

export const strategicObjectiveManager = new StrategicObjectiveManager();
export const okrTracker = new OKRTracker();
export const scenarioPlanningEngine = new ScenarioPlanningEngine();
export const strategyExecutionAnalyzer = new StrategyExecutionAnalyzer();

export { StrategicObjective, OKRRecord, ScenarioPlan, StrategyExecutionMetric };
