/**
 * Phase 228: Operations Intelligence
 * Operational KPI tracking, bottleneck detection, capacity planning, ops health monitoring
 */

import { logger } from './logger';

interface OperationalKPI {
  kpiId: string;
  name: string;
  category: 'throughput' | 'quality' | 'cost' | 'speed' | 'reliability';
  currentValue: number;
  targetValue: number;
  unit: string;
  achievementPct: number;
  status: 'exceeded' | 'on_target' | 'at_risk' | 'missed';
  period: string;
  capturedAt: number;
}

interface Bottleneck {
  bottleneckId: string;
  processName: string;
  stage: string;
  avgWaitTimeMs: number;
  queueDepth: number;
  throughputPerHour: number;
  utilizationPct: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  detectedAt: number;
}

interface CapacityPlan {
  planId: string;
  resourceType: string;
  currentCapacity: number;
  utilizedCapacity: number;
  utilizationRate: number;
  forecastedDemand: number;
  headroom: number;
  recommendedAction: 'scale_up' | 'maintain' | 'scale_down' | 'optimize';
  horizon: string;
  createdAt: number;
}

interface OpsHealthReport {
  reportId: string;
  period: string;
  overallHealthScore: number;   // 0-100
  kpisOnTarget: number;
  kpisAtRisk: number;
  activeBottlenecks: number;
  capacityUtilizationAvg: number;
  incidentCount: number;
  mttrAvgMs: number;
  generatedAt: number;
}

class OperationalKPITracker {
  private kpis: Map<string, OperationalKPI[]> = new Map();
  private counter = 0;

  record(name: string, category: OperationalKPI['category'], currentValue: number, targetValue: number, unit: string, period: string): OperationalKPI {
    const achievementPct = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
    const status: OperationalKPI['status'] =
      achievementPct >= 110 ? 'exceeded' :
      achievementPct >= 90 ? 'on_target' :
      achievementPct >= 70 ? 'at_risk' : 'missed';
    const kpiId = `opskpi-${Date.now()}-${++this.counter}`;
    const kpi: OperationalKPI = {
      kpiId, name, category, currentValue, targetValue, unit,
      achievementPct, status, period, capturedAt: Date.now()
    };
    const existing = this.kpis.get(name) || [];
    existing.push(kpi);
    this.kpis.set(name, existing);
    logger.debug('Operational KPI recorded', { name, currentValue, targetValue, status });
    return kpi;
  }

  getAtRisk(): OperationalKPI[] {
    return Array.from(this.kpis.values())
      .map(h => h[h.length - 1])
      .filter((k): k is OperationalKPI => !!k && (k.status === 'at_risk' || k.status === 'missed'));
  }

  getByCategory(category: OperationalKPI['category']): OperationalKPI[] {
    return Array.from(this.kpis.values())
      .map(h => h[h.length - 1])
      .filter((k): k is OperationalKPI => !!k && k.category === category);
  }

  getOverallAchievement(): number {
    const latest = Array.from(this.kpis.values()).map(h => h[h.length - 1]).filter((k): k is OperationalKPI => !!k);
    if (!latest.length) return 0;
    return latest.reduce((s, k) => s + k.achievementPct, 0) / latest.length;
  }
}

class BottleneckDetector {
  private bottlenecks: Map<string, Bottleneck> = new Map();
  private counter = 0;

  detect(processName: string, stage: string, avgWaitMs: number, queueDepth: number, throughputPerHour: number, utilizationPct: number): Bottleneck {
    const severity: Bottleneck['severity'] =
      utilizationPct >= 95 || queueDepth > 100 ? 'critical' :
      utilizationPct >= 85 || queueDepth > 50 ? 'high' :
      utilizationPct >= 70 || queueDepth > 20 ? 'medium' : 'low';
    const impact = severity === 'critical' ? 'Service degradation imminent' :
      severity === 'high' ? 'Throughput significantly reduced' :
      severity === 'medium' ? 'Moderate throughput impact' : 'Minor impact';
    const bottleneckId = `btlnk-${Date.now()}-${++this.counter}`;
    const bottleneck: Bottleneck = {
      bottleneckId, processName, stage, avgWaitTimeMs: avgWaitMs,
      queueDepth, throughputPerHour, utilizationPct, severity, impact, detectedAt: Date.now()
    };
    this.bottlenecks.set(`${processName}:${stage}`, bottleneck);
    logger.debug('Bottleneck detected', { processName, stage, severity, utilizationPct });
    return bottleneck;
  }

  getCritical(): Bottleneck[] {
    return Array.from(this.bottlenecks.values())
      .filter(b => b.severity === 'critical' || b.severity === 'high')
      .sort((a, b) => b.utilizationPct - a.utilizationPct);
  }

  getBottleneck(processName: string, stage: string): Bottleneck | undefined {
    return this.bottlenecks.get(`${processName}:${stage}`);
  }

  getAllBottlenecks(): Bottleneck[] {
    return Array.from(this.bottlenecks.values());
  }
}

class CapacityPlanner {
  private plans: Map<string, CapacityPlan> = new Map();
  private counter = 0;

  plan(resourceType: string, currentCapacity: number, utilizedCapacity: number, forecastedDemand: number, horizon: string): CapacityPlan {
    const utilizationRate = currentCapacity > 0 ? (utilizedCapacity / currentCapacity) * 100 : 0;
    const headroom = currentCapacity - utilizedCapacity;
    const recommendedAction: CapacityPlan['recommendedAction'] =
      forecastedDemand > currentCapacity * 0.9 ? 'scale_up' :
      utilizationRate < 30 ? 'scale_down' :
      utilizationRate > 70 ? 'optimize' : 'maintain';
    const planId = `capplan-${Date.now()}-${++this.counter}`;
    const capPlan: CapacityPlan = {
      planId, resourceType, currentCapacity, utilizedCapacity,
      utilizationRate, forecastedDemand, headroom, recommendedAction, horizon, createdAt: Date.now()
    };
    this.plans.set(resourceType, capPlan);
    return capPlan;
  }

  getScaleUpNeeded(): CapacityPlan[] {
    return Array.from(this.plans.values()).filter(p => p.recommendedAction === 'scale_up');
  }

  getPlan(resourceType: string): CapacityPlan | undefined {
    return this.plans.get(resourceType);
  }

  getAvgUtilization(): number {
    const all = Array.from(this.plans.values());
    if (!all.length) return 0;
    return all.reduce((s, p) => s + p.utilizationRate, 0) / all.length;
  }
}

class OpsHealthMonitor {
  private reports: OpsHealthReport[] = [];
  private counter = 0;

  generate(period: string, kpisOnTarget: number, kpisAtRisk: number, activeBottlenecks: number, capacityUtilizationAvg: number, incidentCount: number, mttrAvgMs: number): OpsHealthReport {
    const totalKpis = kpisOnTarget + kpisAtRisk;
    const kpiScore = totalKpis > 0 ? (kpisOnTarget / totalKpis) * 100 : 100;
    const bottleneckPenalty = activeBottlenecks * 5;
    const overallHealthScore = Math.max(0, Math.min(100, kpiScore - bottleneckPenalty - (incidentCount * 2)));
    const reportId = `opshealth-${Date.now()}-${++this.counter}`;
    const report: OpsHealthReport = {
      reportId, period, overallHealthScore, kpisOnTarget, kpisAtRisk,
      activeBottlenecks, capacityUtilizationAvg, incidentCount, mttrAvgMs, generatedAt: Date.now()
    };
    this.reports.push(report);
    logger.debug('Ops health report generated', { period, overallHealthScore });
    return report;
  }

  getLatest(): OpsHealthReport | undefined {
    return this.reports[this.reports.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.reports.length < 2) return 'stable';
    const prev = this.reports[this.reports.length - 2];
    const curr = this.reports[this.reports.length - 1];
    const diff = curr.overallHealthScore - prev.overallHealthScore;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }
}

export const operationalKPITracker = new OperationalKPITracker();
export const bottleneckDetector = new BottleneckDetector();
export const capacityPlanner = new CapacityPlanner();
export const opsHealthMonitor = new OpsHealthMonitor();

export { OperationalKPI, Bottleneck, CapacityPlan, OpsHealthReport };
