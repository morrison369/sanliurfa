/**
 * Phase 255: Ecosystem Health Intelligence
 * Partner network health, marketplace vitality, API consumer health, ecosystem growth metrics
 */

import { logger } from './logger';

interface EcosystemPartnerHealth {
  healthId: string;
  partnerId: string;
  partnerName: string;
  partnerType: 'technology' | 'channel' | 'integration' | 'marketplace' | 'developer';
  activityScore: number;       // 0-100, recent engagement level
  integrationHealth: number;   // 0-100, API reliability, data quality
  revenueContribution: number; // absolute value
  growthRatePct: number;
  churnRisk: 'low' | 'medium' | 'high';
  overallHealth: number;       // weighted composite
  calculatedAt: number;
}

interface MarketplaceVitalityMetric {
  metricId: string;
  period: string;
  totalListings: number;
  activeListings: number;
  newListings: number;
  transactionVolume: number;
  avgTransactionValue: number;
  buyerRetentionRatePct: number;
  sellerRetentionRatePct: number;
  liquidityScore: number;   // how easily buyers find what they need
  calculatedAt: number;
}

interface APIConsumerHealth {
  consumerId: string;
  consumerName: string;
  apiKey: string;
  callsLast30Days: number;
  errorRatePct: number;
  avgLatencyMs: number;
  uniqueEndpointsUsed: number;
  lastActiveAt: number;
  tier: 'free' | 'basic' | 'professional' | 'enterprise';
  healthScore: number;   // 0-100
  churnRisk: 'low' | 'medium' | 'high';
  updatedAt: number;
}

interface EcosystemGrowthReport {
  reportId: string;
  period: string;
  totalPartners: number;
  newPartners: number;
  churnedPartners: number;
  netPartnerGrowth: number;
  ecosystemRevenue: number;
  revenueGrowthPct: number;
  healthyPartnerPct: number;  // % with health > 70
  generatedAt: number;
}

class PartnerHealthMonitor {
  private health: Map<string, EcosystemPartnerHealth[]> = new Map();
  private counter = 0;

  evaluate(partnerId: string, partnerName: string, partnerType: EcosystemPartnerHealth['partnerType'], activityScore: number, integrationHealth: number, revenueContribution: number, growthRatePct: number): EcosystemPartnerHealth {
    const churnRisk: EcosystemPartnerHealth['churnRisk'] =
      activityScore < 20 || integrationHealth < 30 ? 'high' :
      activityScore < 50 || integrationHealth < 60 ? 'medium' : 'low';

    const overall = activityScore * 0.35 + integrationHealth * 0.35 + Math.min(100, Math.max(0, growthRatePct + 50)) * 0.3;

    const healthId = `partnerhealth-${Date.now()}-${++this.counter}`;
    const record: EcosystemPartnerHealth = {
      healthId, partnerId, partnerName, partnerType, activityScore, integrationHealth,
      revenueContribution, growthRatePct, churnRisk,
      overallHealth: Math.max(0, Math.min(100, overall)), calculatedAt: Date.now()
    };
    const history = this.health.get(partnerId) || [];
    history.push(record);
    this.health.set(partnerId, history);
    logger.debug('Partner health evaluated', { partnerId, overallHealth: record.overallHealth, churnRisk });
    return record;
  }

  getAtRisk(): EcosystemPartnerHealth[] {
    return Array.from(this.health.values())
      .map(h => h[h.length - 1])
      .filter((r): r is EcosystemPartnerHealth => !!r && r.churnRisk === 'high')
      .sort((a, b) => b.revenueContribution - a.revenueContribution);
  }

  getAverageHealth(): number {
    const latest = Array.from(this.health.values()).map(h => h[h.length - 1]).filter(Boolean) as EcosystemPartnerHealth[];
    if (!latest.length) return 0;
    return latest.reduce((s, r) => s + r.overallHealth, 0) / latest.length;
  }

  getLatest(partnerId: string): EcosystemPartnerHealth | undefined {
    const history = this.health.get(partnerId) || [];
    return history[history.length - 1];
  }
}

class MarketplaceVitalityAnalyzer {
  private metrics: MarketplaceVitalityMetric[] = [];
  private counter = 0;

  record(period: string, totalListings: number, activeListings: number, newListings: number, transactionVolume: number, avgTransactionValue: number, buyerRetention: number, sellerRetention: number): MarketplaceVitalityMetric {
    // Liquidity = active ratio × retention balance
    const activeRatio = totalListings > 0 ? (activeListings / totalListings) * 100 : 0;
    const liquidityScore = activeRatio * 0.5 + (buyerRetention + sellerRetention) / 2 * 0.5;

    const metricId = `mktplace-${Date.now()}-${++this.counter}`;
    const metric: MarketplaceVitalityMetric = {
      metricId, period, totalListings, activeListings, newListings, transactionVolume,
      avgTransactionValue, buyerRetentionRatePct: buyerRetention,
      sellerRetentionRatePct: sellerRetention, liquidityScore: Math.max(0, Math.min(100, liquidityScore)),
      calculatedAt: Date.now()
    };
    this.metrics.push(metric);
    return metric;
  }

  getLatest(): MarketplaceVitalityMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getGrowthTrend(): 'growing' | 'stable' | 'contracting' {
    if (this.metrics.length < 2) return 'stable';
    const diff = this.metrics[this.metrics.length - 1].transactionVolume - this.metrics[this.metrics.length - 2].transactionVolume;
    const base = this.metrics[this.metrics.length - 2].transactionVolume;
    const changePct = base > 0 ? (diff / base) * 100 : 0;
    return changePct > 5 ? 'growing' : changePct < -5 ? 'contracting' : 'stable';
  }
}

class APIConsumerHealthTracker {
  private consumers: Map<string, APIConsumerHealth> = new Map();
  private counter = 0;

  upsert(consumerName: string, apiKey: string, calls30Days: number, errorRatePct: number, avgLatencyMs: number, uniqueEndpoints: number, tier: APIConsumerHealth['tier']): APIConsumerHealth {
    const healthScore =
      Math.max(0, 100 - errorRatePct * 5) * 0.4 +
      Math.max(0, 100 - avgLatencyMs / 10) * 0.2 +
      Math.min(100, uniqueEndpoints * 10) * 0.2 +
      Math.min(100, calls30Days / 100) * 0.2;

    const churnRisk: APIConsumerHealth['churnRisk'] =
      calls30Days < 10 ? 'high' : calls30Days < 100 ? 'medium' : 'low';

    const existing = Array.from(this.consumers.values()).find(c => c.apiKey === apiKey);
    if (existing) {
      existing.callsLast30Days = calls30Days;
      existing.errorRatePct = errorRatePct;
      existing.avgLatencyMs = avgLatencyMs;
      existing.uniqueEndpointsUsed = uniqueEndpoints;
      existing.lastActiveAt = Date.now();
      existing.healthScore = Math.max(0, Math.min(100, healthScore));
      existing.churnRisk = churnRisk;
      existing.updatedAt = Date.now();
      return existing;
    }

    const consumerId = `apiconsumer-${Date.now()}-${++this.counter}`;
    const consumer: APIConsumerHealth = {
      consumerId, consumerName, apiKey, callsLast30Days: calls30Days, errorRatePct, avgLatencyMs,
      uniqueEndpointsUsed: uniqueEndpoints, lastActiveAt: Date.now(), tier,
      healthScore: Math.max(0, Math.min(100, healthScore)), churnRisk, updatedAt: Date.now()
    };
    this.consumers.set(consumerId, consumer);
    return consumer;
  }

  getChurnRisk(risk: APIConsumerHealth['churnRisk']): APIConsumerHealth[] {
    return Array.from(this.consumers.values()).filter(c => c.churnRisk === risk);
  }

  getByTier(tier: APIConsumerHealth['tier']): APIConsumerHealth[] {
    return Array.from(this.consumers.values()).filter(c => c.tier === tier);
  }

  getAll(): APIConsumerHealth[] {
    return Array.from(this.consumers.values());
  }
}

class EcosystemGrowthReporter {
  private reports: EcosystemGrowthReport[] = [];
  private counter = 0;

  generate(period: string, totalPartners: number, newPartners: number, churnedPartners: number, ecosystemRevenue: number, prevRevenue: number, healthScores: number[]): EcosystemGrowthReport {
    const revenueGrowthPct = prevRevenue > 0 ? ((ecosystemRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const healthyPartnerPct = healthScores.length > 0
      ? (healthScores.filter(s => s > 70).length / healthScores.length) * 100 : 0;

    const reportId = `ecoReport-${Date.now()}-${++this.counter}`;
    const report: EcosystemGrowthReport = {
      reportId, period, totalPartners, newPartners, churnedPartners,
      netPartnerGrowth: newPartners - churnedPartners,
      ecosystemRevenue, revenueGrowthPct, healthyPartnerPct, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): EcosystemGrowthReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

export const partnerHealthMonitor = new PartnerHealthMonitor();
export const marketplaceVitalityAnalyzer = new MarketplaceVitalityAnalyzer();
export const apiConsumerHealthTracker = new APIConsumerHealthTracker();
export const ecosystemGrowthReporter = new EcosystemGrowthReporter();

export { EcosystemPartnerHealth, MarketplaceVitalityMetric, APIConsumerHealth, EcosystemGrowthReport };
