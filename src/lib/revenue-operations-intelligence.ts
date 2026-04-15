/**
 * Phase 260: Revenue Operations Intelligence
 * Pipeline intelligence, sales velocity, RevOps metrics, go-to-market analytics
 */

import { logger } from './logger';

interface PipelineHealthMetric {
  metricId: string;
  period: string;
  stage: string;
  dealCount: number;
  totalValue: number;
  avgDealSize: number;
  avgDaysInStage: number;
  conversionRatePct: number;
  stageVelocity: number;    // deals moving per week
  atRiskDeals: number;      // deals stuck > 2× avg days
  recordedAt: number;
}

interface SalesVelocityMetric {
  metricId: string;
  period: string;
  team: string;
  opportunityCount: number;
  avgDealValue: number;
  winRatePct: number;
  avgSalesCycleDays: number;
  velocityScore: number;    // opportunities × dealValue × winRate / salesCycleDays
  vsTargetPct: number;
  calculatedAt: number;
}

interface GTMEffectivenessReport {
  reportId: string;
  period: string;
  campaignInfluencedRevenuePct: number;
  avgTouchesToClose: number;
  marketingSourcedRevenuePct: number;
  salesSourcedRevenuePct: number;
  partnerSourcedRevenuePct: number;
  costPerOpportunity: number;
  costPerAcquisition: number;
  gtmEfficiencyScore: number;   // composite 0-100
  generatedAt: number;
}

interface RevOpsHealthScore {
  healthId: string;
  period: string;
  dataQualityScore: number;       // CRM data completeness/accuracy
  processAdherenceScore: number;  // % following defined processes
  forecastAccuracyScore: number;  // actual vs forecast
  toolAdoptionScore: number;      // RevOps stack utilization
  overallRevOpsHealth: number;
  calculatedAt: number;
}

class PipelineIntelligenceEngine {
  private metrics: Map<string, PipelineHealthMetric[]> = new Map();
  private counter = 0;

  record(period: string, stage: string, dealCount: number, totalValue: number, avgDaysInStage: number, conversionRatePct: number, stageVelocity: number, avgDaysThreshold: number): PipelineHealthMetric {
    const avgDealSize = dealCount > 0 ? totalValue / dealCount : 0;
    const atRiskDeals = avgDaysInStage > avgDaysThreshold * 2 ? Math.floor(dealCount * 0.3) : 0;

    const metricId = `pipeline-${Date.now()}-${++this.counter}`;
    const metric: PipelineHealthMetric = {
      metricId, period, stage, dealCount, totalValue, avgDealSize, avgDaysInStage,
      conversionRatePct, stageVelocity, atRiskDeals, recordedAt: Date.now()
    };
    const key = `${period}-${stage}`;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);
    this.metrics.set(key, existing);
    return metric;
  }

  getTotalPipelineValue(period: string): number {
    return Array.from(this.metrics.values()).flat()
      .filter(m => m.period === period)
      .reduce((s, m) => s + m.totalValue, 0);
  }

  getStuckDeals(period: string): PipelineHealthMetric[] {
    return Array.from(this.metrics.values()).flat()
      .filter(m => m.period === period && m.atRiskDeals > 0)
      .sort((a, b) => b.atRiskDeals - a.atRiskDeals);
  }

  getWeakestStage(period: string): PipelineHealthMetric | undefined {
    return Array.from(this.metrics.values()).flat()
      .filter(m => m.period === period)
      .sort((a, b) => a.conversionRatePct - b.conversionRatePct)[0];
  }
}

class SalesVelocityTracker {
  private metrics: Map<string, SalesVelocityMetric[]> = new Map();
  private counter = 0;

  calculate(period: string, team: string, opportunityCount: number, avgDealValue: number, winRatePct: number, avgSalesCycleDays: number, target: number): SalesVelocityMetric {
    // Standard sales velocity formula
    const velocityScore = avgSalesCycleDays > 0
      ? (opportunityCount * avgDealValue * (winRatePct / 100)) / avgSalesCycleDays
      : 0;
    const vsTargetPct = target > 0 ? (velocityScore / target) * 100 : 0;

    const metricId = `salesvel-${Date.now()}-${++this.counter}`;
    const metric: SalesVelocityMetric = {
      metricId, period, team, opportunityCount, avgDealValue, winRatePct,
      avgSalesCycleDays, velocityScore, vsTargetPct, calculatedAt: Date.now()
    };
    const history = this.metrics.get(team) || [];
    history.push(metric);
    this.metrics.set(team, history);
    logger.debug('Sales velocity calculated', { team, velocityScore, vsTargetPct });
    return metric;
  }

  getBelowTarget(thresholdPct = 80): SalesVelocityMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is SalesVelocityMetric => !!m && m.vsTargetPct < thresholdPct)
      .sort((a, b) => a.vsTargetPct - b.vsTargetPct);
  }

  getLatest(team: string): SalesVelocityMetric | undefined {
    const history = this.metrics.get(team) || [];
    return history[history.length - 1];
  }
}

class GTMEffectivenessAnalyzer {
  private reports: GTMEffectivenessReport[] = [];
  private counter = 0;

  analyze(period: string, campaignInfluencedPct: number, avgTouches: number, mktgSourcedPct: number, salesSourcedPct: number, partnerSourcedPct: number, costPerOpp: number, costPerAcq: number): GTMEffectivenessReport {
    // Efficiency: high marketing sourced + lower cost + fewer touches = better
    const sourceDiversityScore = Math.min(100, (mktgSourcedPct + salesSourcedPct + partnerSourcedPct) / 3);
    const costEfficiencyScore = Math.max(0, 100 - (costPerAcq / 1000));  // penalize high CAC
    const touchScore = Math.max(0, 100 - avgTouches * 5);
    const gtmEfficiencyScore = campaignInfluencedPct * 0.3 + costEfficiencyScore * 0.4 + touchScore * 0.3;

    const reportId = `gtmreport-${Date.now()}-${++this.counter}`;
    const report: GTMEffectivenessReport = {
      reportId, period, campaignInfluencedRevenuePct: campaignInfluencedPct,
      avgTouchesToClose: avgTouches, marketingSourcedRevenuePct: mktgSourcedPct,
      salesSourcedRevenuePct: salesSourcedPct, partnerSourcedRevenuePct: partnerSourcedPct,
      costPerOpportunity: costPerOpp, costPerAcquisition: costPerAcq,
      gtmEfficiencyScore: Math.max(0, Math.min(100, gtmEfficiencyScore)), generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): GTMEffectivenessReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

class RevOpsHealthMonitor {
  private scores: RevOpsHealthScore[] = [];
  private counter = 0;

  evaluate(period: string, dataQuality: number, processAdherence: number, forecastAccuracy: number, toolAdoption: number): RevOpsHealthScore {
    const overall = dataQuality * 0.3 + processAdherence * 0.25 + forecastAccuracy * 0.3 + toolAdoption * 0.15;

    const healthId = `revopshealth-${Date.now()}-${++this.counter}`;
    const score: RevOpsHealthScore = {
      healthId, period,
      dataQualityScore: Math.max(0, Math.min(100, dataQuality)),
      processAdherenceScore: Math.max(0, Math.min(100, processAdherence)),
      forecastAccuracyScore: Math.max(0, Math.min(100, forecastAccuracy)),
      toolAdoptionScore: Math.max(0, Math.min(100, toolAdoption)),
      overallRevOpsHealth: Math.max(0, Math.min(100, overall)),
      calculatedAt: Date.now()
    };
    this.scores.push(score);
    return score;
  }

  getLatest(): RevOpsHealthScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallRevOpsHealth - this.scores[this.scores.length - 2].overallRevOpsHealth;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }
}

export const pipelineIntelligenceEngine = new PipelineIntelligenceEngine();
export const salesVelocityTracker = new SalesVelocityTracker();
export const gtmEffectivenessAnalyzer = new GTMEffectivenessAnalyzer();
export const revOpsHealthMonitor = new RevOpsHealthMonitor();

export { PipelineHealthMetric, SalesVelocityMetric, GTMEffectivenessReport, RevOpsHealthScore };
