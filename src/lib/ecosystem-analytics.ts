/**
 * Phase 187: Ecosystem Analytics
 * Ecosystem health monitoring, partner performance tracking, growth analysis, network effects
 */

import { logger } from './logger';

interface EcosystemHealthSnapshot {
  snapshotId: string;
  activePartners: number;
  newPartnersThisMonth: number;
  churnedPartnersThisMonth: number;
  avgRevenuePerPartner: number;
  apiCallsThisMonth: number;
  integrationCount: number;
  healthScore: number;
  capturedAt: number;
}

interface PartnerKPI {
  partnerId: string;
  period: string;
  revenueGenerated: number;
  apiCalls: number;
  dealsRegistered: number;
  customersReferred: number;
  certificationCount: number;
  performanceScore: number;
}

interface GrowthMetric {
  period: string;
  partnerCount: number;
  revenueTotal: number;
  apiCallsTotal: number;
  growthRatePct: number;
}

class EcosystemHealthMonitor {
  private snapshots: EcosystemHealthSnapshot[] = [];
  private counter = 0;

  capture(activePartners: number, newPartners: number, churnedPartners: number, avgRevenue: number, apiCalls: number, integrations: number): EcosystemHealthSnapshot {
    const healthScore = this.computeHealthScore(activePartners, churnedPartners, avgRevenue, apiCalls);
    const snapshot: EcosystemHealthSnapshot = {
      snapshotId: `snapshot-${Date.now()}-${++this.counter}`,
      activePartners, newPartnersThisMonth: newPartners,
      churnedPartnersThisMonth: churnedPartners, avgRevenuePerPartner: avgRevenue,
      apiCallsThisMonth: apiCalls, integrationCount: integrations,
      healthScore, capturedAt: Date.now()
    };
    this.snapshots.push(snapshot);
    logger.debug('Ecosystem health captured', { activePartners, healthScore: healthScore.toFixed(1) });
    return snapshot;
  }

  private computeHealthScore(active: number, churned: number, avgRevenue: number, apiCalls: number): number {
    const churnRate = active > 0 ? (churned / active) * 100 : 0;
    const churnScore = Math.max(0, 100 - churnRate * 10);
    const revenueScore = Math.min(100, avgRevenue / 10);
    const activityScore = Math.min(100, apiCalls / 1000);
    return churnScore * 0.4 + revenueScore * 0.35 + activityScore * 0.25;
  }

  getLatest(): EcosystemHealthSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getTrend(): 'improving' | 'declining' | 'stable' {
    if (this.snapshots.length < 2) return 'stable';
    const prev = this.snapshots[this.snapshots.length - 2].healthScore;
    const curr = this.snapshots[this.snapshots.length - 1].healthScore;
    return curr - prev > 2 ? 'improving' : prev - curr > 2 ? 'declining' : 'stable';
  }

  getNetRetentionRate(): number {
    const latest = this.getLatest();
    if (!latest || latest.activePartners === 0) return 100;
    return ((latest.activePartners - latest.newPartnersThisMonth + latest.churnedPartnersThisMonth) / latest.activePartners) * 100;
  }
}

class PartnerPerformanceTracker {
  private kpis: Map<string, PartnerKPI[]> = new Map();

  record(partnerId: string, period: string, metrics: Omit<PartnerKPI, 'partnerId' | 'period' | 'performanceScore'>): PartnerKPI {
    const performanceScore = this.computeScore(metrics);
    const kpi: PartnerKPI = { partnerId, period, ...metrics, performanceScore };

    const history = this.kpis.get(partnerId) || [];
    const idx = history.findIndex(k => k.period === period);
    if (idx >= 0) history[idx] = kpi; else history.push(kpi);
    this.kpis.set(partnerId, history);

    return kpi;
  }

  private computeScore(metrics: Omit<PartnerKPI, 'partnerId' | 'period' | 'performanceScore'>): number {
    return Math.min(100,
      (metrics.revenueGenerated / 1000) * 30 +
      (metrics.dealsRegistered * 5) +
      (metrics.customersReferred * 3) +
      (metrics.certificationCount * 10) +
      Math.min(20, metrics.apiCalls / 500)
    );
  }

  getKPI(partnerId: string, period: string): PartnerKPI | undefined {
    return this.kpis.get(partnerId)?.find(k => k.period === period);
  }

  getTopPartners(period: string, limit: number): PartnerKPI[] {
    return Array.from(this.kpis.values()).flat()
      .filter(k => k.period === period)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getPartnerTrend(partnerId: string): 'improving' | 'declining' | 'stable' {
    const history = (this.kpis.get(partnerId) || []).slice(-3);
    if (history.length < 2) return 'stable';
    const change = history[history.length - 1].performanceScore - history[0].performanceScore;
    return change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
  }
}

class EcosystemGrowthAnalyzer {
  private metrics: GrowthMetric[] = [];

  record(period: string, partnerCount: number, revenueTotal: number, apiCallsTotal: number): GrowthMetric {
    const prev = this.metrics[this.metrics.length - 1];
    const growthRatePct = prev ? ((partnerCount - prev.partnerCount) / prev.partnerCount) * 100 : 0;
    const metric: GrowthMetric = { period, partnerCount, revenueTotal, apiCallsTotal, growthRatePct };
    this.metrics.push(metric);
    return metric;
  }

  getCAGR(periods: number): number {
    if (this.metrics.length < 2) return 0;
    const start = this.metrics[Math.max(0, this.metrics.length - periods - 1)].partnerCount;
    const end = this.metrics[this.metrics.length - 1].partnerCount;
    return ((Math.pow(end / start, 1 / periods) - 1) * 100);
  }

  forecastNextPeriod(): { partnerCount: number; revenueTotal: number } {
    if (this.metrics.length < 3) {
      const latest = this.metrics[this.metrics.length - 1];
      return { partnerCount: latest?.partnerCount || 0, revenueTotal: latest?.revenueTotal || 0 };
    }
    const recent = this.metrics.slice(-3);
    const avgGrowth = recent.reduce((sum, m) => sum + m.growthRatePct, 0) / 3;
    const latest = recent[recent.length - 1];
    return {
      partnerCount: Math.round(latest.partnerCount * (1 + avgGrowth / 100)),
      revenueTotal: Math.round(latest.revenueTotal * (1 + avgGrowth / 100))
    };
  }

  getMetrics(): GrowthMetric[] { return this.metrics; }
}

class NetworkEffectCalculator {
  calculateNetworkValue(nodeCount: number): number {
    // Metcalfe's Law: value ∝ n²
    return nodeCount * nodeCount;
  }

  calculateGrowthMultiplier(currentNodes: number, addedNodes: number): number {
    const before = this.calculateNetworkValue(currentNodes);
    const after = this.calculateNetworkValue(currentNodes + addedNodes);
    return before > 0 ? after / before : 1;
  }

  estimateViralCoefficient(invitesSent: number, invitesConverted: number): number {
    return invitesSent > 0 ? invitesConverted / invitesSent : 0;
  }

  isViral(viralCoefficient: number): boolean {
    return viralCoefficient > 1;
  }

  getNetworkHealthScore(partners: number, integrations: number, apiCalls: number): number {
    const densityScore = partners > 0 ? Math.min(100, (integrations / partners) * 20) : 0;
    const activityScore = partners > 0 ? Math.min(100, (apiCalls / partners / 100)) : 0;
    return (densityScore + activityScore) / 2;
  }
}

export const ecosystemHealthMonitor = new EcosystemHealthMonitor();
export const partnerPerformanceTracker = new PartnerPerformanceTracker();
export const ecosystemGrowthAnalyzer = new EcosystemGrowthAnalyzer();
export const networkEffectCalculator = new NetworkEffectCalculator();

export { EcosystemHealthSnapshot, PartnerKPI, GrowthMetric };
