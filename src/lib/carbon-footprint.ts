/**
 * Phase 211: Carbon Footprint Tracking
 * Emission tracking, carbon intensity calculation, scope management, reduction planning
 */

import { logger } from './logger';

interface EmissionRecord {
  emissionId: string;
  sourceId: string;
  sourceName: string;
  scope: 1 | 2 | 3;
  category: string;
  activityData: number;
  activityUnit: string;
  emissionFactor: number;
  co2Equivalent: number; // tCO2e
  period: string;
  recordedAt: number;
}

interface CarbonIntensityMetric {
  metricId: string;
  period: string;
  totalEmissions: number;   // tCO2e
  revenueUSD: number;
  productionUnits: number;
  intensityByRevenue: number;   // tCO2e per $1M revenue
  intensityByUnit: number;      // tCO2e per production unit
  capturedAt: number;
}

interface ScopeBreakdown {
  period: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  scope1Pct: number;
  scope2Pct: number;
  scope3Pct: number;
}

interface CarbonReductionTarget {
  targetId: string;
  name: string;
  baselineYear: string;
  baselineEmissions: number;
  targetYear: string;
  targetEmissions: number;
  reductionPct: number;
  currentEmissions: number;
  progressPct: number;
  onTrack: boolean;
  createdAt: number;
}

class EmissionTracker {
  private records: EmissionRecord[] = [];
  private counter = 0;

  record(sourceId: string, sourceName: string, scope: EmissionRecord['scope'], category: string, activityData: number, activityUnit: string, emissionFactor: number, period: string): EmissionRecord {
    const emissionId = `emission-${Date.now()}-${++this.counter}`;
    const co2Equivalent = activityData * emissionFactor;
    const record: EmissionRecord = {
      emissionId, sourceId, sourceName, scope, category,
      activityData, activityUnit, emissionFactor, co2Equivalent, period, recordedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Emission recorded', { emissionId, sourceName, scope, co2Equivalent: co2Equivalent.toFixed(3) });
    return record;
  }

  getTotalEmissions(period?: string, scope?: EmissionRecord['scope']): number {
    return this.records
      .filter(r => (!period || r.period === period) && (!scope || r.scope === scope))
      .reduce((s, r) => s + r.co2Equivalent, 0);
  }

  getEmissionsByCategory(period?: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const r of this.records.filter(r => !period || r.period === period)) {
      result[r.category] = (result[r.category] || 0) + r.co2Equivalent;
    }
    return result;
  }

  getTopEmitters(period?: string, limit = 5): Array<{ sourceName: string; co2Equivalent: number }> {
    const map = new Map<string, number>();
    for (const r of this.records.filter(r => !period || r.period === period)) {
      map.set(r.sourceName, (map.get(r.sourceName) || 0) + r.co2Equivalent);
    }
    return Array.from(map.entries())
      .map(([sourceName, co2Equivalent]) => ({ sourceName, co2Equivalent }))
      .sort((a, b) => b.co2Equivalent - a.co2Equivalent)
      .slice(0, limit);
  }
}

class CarbonIntensityCalculator {
  private metrics: CarbonIntensityMetric[] = [];
  private counter = 0;

  calculate(period: string, totalEmissions: number, revenueUSD: number, productionUnits: number): CarbonIntensityMetric {
    const metricId = `intensity-${Date.now()}-${++this.counter}`;
    const metric: CarbonIntensityMetric = {
      metricId, period, totalEmissions, revenueUSD, productionUnits,
      intensityByRevenue: revenueUSD > 0 ? (totalEmissions / (revenueUSD / 1000000)) : 0,
      intensityByUnit: productionUnits > 0 ? totalEmissions / productionUnits : 0,
      capturedAt: Date.now()
    };
    this.metrics.push(metric);
    logger.debug('Carbon intensity calculated', { period, intensityByRevenue: metric.intensityByRevenue.toFixed(3) });
    return metric;
  }

  getIntensityTrend(): 'improving' | 'worsening' | 'stable' {
    if (this.metrics.length < 2) return 'stable';
    const prev = this.metrics[this.metrics.length - 2].intensityByRevenue;
    const curr = this.metrics[this.metrics.length - 1].intensityByRevenue;
    const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return changePct < -3 ? 'improving' : changePct > 3 ? 'worsening' : 'stable';
  }

  getLatest(): CarbonIntensityMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getMetrics(): CarbonIntensityMetric[] {
    return this.metrics;
  }
}

class ScopeEmissionManager {
  private breakdowns: Map<string, ScopeBreakdown> = new Map();

  compile(period: string, emissionTracker: EmissionTracker): ScopeBreakdown {
    const scope1 = emissionTracker.getTotalEmissions(period, 1);
    const scope2 = emissionTracker.getTotalEmissions(period, 2);
    const scope3 = emissionTracker.getTotalEmissions(period, 3);
    const total = scope1 + scope2 + scope3;

    const breakdown: ScopeBreakdown = {
      period, scope1, scope2, scope3, total,
      scope1Pct: total > 0 ? (scope1 / total) * 100 : 0,
      scope2Pct: total > 0 ? (scope2 / total) * 100 : 0,
      scope3Pct: total > 0 ? (scope3 / total) * 100 : 0
    };
    this.breakdowns.set(period, breakdown);
    return breakdown;
  }

  getBreakdown(period: string): ScopeBreakdown | undefined {
    return this.breakdowns.get(period);
  }

  getLargestScope(period: string): 1 | 2 | 3 | undefined {
    const bd = this.breakdowns.get(period);
    if (!bd) return undefined;
    if (bd.scope1 >= bd.scope2 && bd.scope1 >= bd.scope3) return 1;
    if (bd.scope2 >= bd.scope3) return 2;
    return 3;
  }

  getYoYChange(currentPeriod: string, previousPeriod: string): number {
    const curr = this.breakdowns.get(currentPeriod);
    const prev = this.breakdowns.get(previousPeriod);
    if (!curr || !prev || prev.total === 0) return 0;
    return ((curr.total - prev.total) / prev.total) * 100;
  }
}

class CarbonReductionPlanner {
  private targets: Map<string, CarbonReductionTarget> = new Map();
  private counter = 0;

  setTarget(name: string, baselineYear: string, baselineEmissions: number, targetYear: string, reductionPct: number): CarbonReductionTarget {
    const targetId = `ctarget-${Date.now()}-${++this.counter}`;
    const targetEmissions = baselineEmissions * (1 - reductionPct / 100);
    const target: CarbonReductionTarget = {
      targetId, name, baselineYear, baselineEmissions, targetYear,
      targetEmissions, reductionPct, currentEmissions: baselineEmissions,
      progressPct: 0, onTrack: true, createdAt: Date.now()
    };
    this.targets.set(targetId, target);
    logger.debug('Carbon reduction target set', { targetId, name, reductionPct, targetEmissions: targetEmissions.toFixed(1) });
    return target;
  }

  updateProgress(targetId: string, currentEmissions: number): boolean {
    const target = this.targets.get(targetId);
    if (!target) return false;
    target.currentEmissions = currentEmissions;
    const totalReductionNeeded = target.baselineEmissions - target.targetEmissions;
    const achieved = target.baselineEmissions - currentEmissions;
    target.progressPct = totalReductionNeeded > 0 ? Math.max(0, (achieved / totalReductionNeeded) * 100) : 0;
    target.onTrack = currentEmissions <= target.baselineEmissions;
    return true;
  }

  getTarget(targetId: string): CarbonReductionTarget | undefined {
    return this.targets.get(targetId);
  }

  getOffTrackTargets(): CarbonReductionTarget[] {
    return Array.from(this.targets.values()).filter(t => !t.onTrack);
  }
}

export const emissionTracker = new EmissionTracker();
export const carbonIntensityCalculator = new CarbonIntensityCalculator();
export const scopeEmissionManager = new ScopeEmissionManager();
export const carbonReductionPlanner = new CarbonReductionPlanner();

export { EmissionRecord, CarbonIntensityMetric, ScopeBreakdown, CarbonReductionTarget };
