/**
 * Phase 243: Customer Acquisition Optimization
 * CAC tracking, acquisition channel scoring, lead quality, conversion optimization
 */

import { logger } from './logger';

interface CACMetric {
  metricId: string;
  channel: string;
  period: string;
  marketingSpend: number;
  salesSpend: number;
  totalSpend: number;
  newCustomers: number;
  cac: number;               // total spend / new customers
  cacPaybackMonths: number;  // CAC / monthly ARPU
  ltvCacRatio: number;       // LTV / CAC (>3 is healthy)
  capturedAt: number;
}

interface AcquisitionChannel {
  channelId: string;
  name: string;
  type: 'organic' | 'paid' | 'referral' | 'partnership' | 'outbound' | 'event';
  monthlyLeads: number;
  leadQualityScore: number;  // 0-100
  conversionRate: number;    // leads → customers %
  avgCac: number;
  avgDealSize: number;
  efficiencyScore: number;   // composite metric
  status: 'active' | 'paused' | 'testing';
  updatedAt: number;
}

interface LeadQualityScore {
  scoreId: string;
  leadId: string;
  channel: string;
  firmographicScore: number;   // 0-100
  behavioralScore: number;     // 0-100
  intentScore: number;         // 0-100
  fitScore: number;            // 0-100
  compositeScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  scoredAt: number;
}

interface ConversionOptimizationInsight {
  insightId: string;
  funnel: string;
  stage: string;
  currentRate: number;
  benchmarkRate: number;
  gap: number;
  recommendation: string;
  estimatedUpliftPct: number;
  effort: 'low' | 'medium' | 'high';
  generatedAt: number;
}

class CACTracker {
  private metrics: Map<string, CACMetric[]> = new Map();
  private counter = 0;

  record(channel: string, period: string, mktSpend: number, salesSpend: number, newCustomers: number, monthlyARPU: number, ltv: number): CACMetric {
    const totalSpend = mktSpend + salesSpend;
    const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;
    const cacPaybackMonths = monthlyARPU > 0 ? cac / monthlyARPU : 0;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const metricId = `cac-${Date.now()}-${++this.counter}`;
    const metric: CACMetric = {
      metricId, channel, period, marketingSpend: mktSpend, salesSpend,
      totalSpend, newCustomers, cac, cacPaybackMonths, ltvCacRatio, capturedAt: Date.now()
    };
    const existing = this.metrics.get(channel) || [];
    existing.push(metric);
    this.metrics.set(channel, existing);
    logger.debug('CAC recorded', { channel, cac, ltvCacRatio });
    return metric;
  }

  getEfficiencyRanking(): Array<{ channel: string; ltvCacRatio: number }> {
    return Array.from(this.metrics.entries())
      .map(([channel, history]) => ({ channel, ltvCacRatio: history[history.length - 1]?.ltvCacRatio || 0 }))
      .sort((a, b) => b.ltvCacRatio - a.ltvCacRatio);
  }

  getUnhealthyChannels(minLtvCac = 3): CACMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is CACMetric => !!m && m.ltvCacRatio < minLtvCac);
  }

  getLatest(channel: string): CACMetric | undefined {
    const history = this.metrics.get(channel) || [];
    return history[history.length - 1];
  }
}

class AcquisitionChannelScorer {
  private channels: Map<string, AcquisitionChannel> = new Map();
  private counter = 0;

  score(name: string, type: AcquisitionChannel['type'], monthlyLeads: number, leadQuality: number, conversionRate: number, avgCac: number, avgDealSize: number): AcquisitionChannel {
    const efficiencyScore = Math.min(100,
      leadQuality * 0.3 + conversionRate * 0.3 + (avgDealSize / Math.max(1, avgCac)) * 0.4
    );
    const channelId = `acqch-${Date.now()}-${++this.counter}`;
    const channel: AcquisitionChannel = {
      channelId, name, type, monthlyLeads,
      leadQualityScore: Math.max(0, Math.min(100, leadQuality)),
      conversionRate, avgCac, avgDealSize,
      efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
      status: 'active', updatedAt: Date.now()
    };
    this.channels.set(name, channel);
    return channel;
  }

  getTopChannels(limit = 5): AcquisitionChannel[] {
    return Array.from(this.channels.values())
      .filter(c => c.status === 'active')
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, limit);
  }

  getChannel(name: string): AcquisitionChannel | undefined {
    return this.channels.get(name);
  }
}

class LeadQualityScorer {
  private scores: Map<string, LeadQualityScore> = new Map();
  private counter = 0;

  score(leadId: string, channel: string, firmographic: number, behavioral: number, intent: number, fit: number): LeadQualityScore {
    const compositeScore = firmographic * 0.25 + behavioral * 0.25 + intent * 0.3 + fit * 0.2;
    const grade: LeadQualityScore['grade'] =
      compositeScore >= 80 ? 'A' : compositeScore >= 65 ? 'B' : compositeScore >= 50 ? 'C' : 'D';
    const scoreId = `leadq-${Date.now()}-${++this.counter}`;
    const record: LeadQualityScore = {
      scoreId, leadId, channel,
      firmographicScore: Math.max(0, Math.min(100, firmographic)),
      behavioralScore: Math.max(0, Math.min(100, behavioral)),
      intentScore: Math.max(0, Math.min(100, intent)),
      fitScore: Math.max(0, Math.min(100, fit)),
      compositeScore, grade, scoredAt: Date.now()
    };
    this.scores.set(leadId, record);
    return record;
  }

  getGradeDistribution(): Record<string, number> {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const score of this.scores.values()) dist[score.grade]++;
    return dist;
  }

  getScore(leadId: string): LeadQualityScore | undefined {
    return this.scores.get(leadId);
  }

  getByGrade(grade: LeadQualityScore['grade']): LeadQualityScore[] {
    return Array.from(this.scores.values()).filter(s => s.grade === grade);
  }
}

class ConversionOptimizationAdvisor {
  private insights: ConversionOptimizationInsight[] = [];
  private counter = 0;

  generate(funnel: string, stage: string, currentRate: number, benchmarkRate: number, recommendation: string, estimatedUplift: number, effort: ConversionOptimizationInsight['effort']): ConversionOptimizationInsight {
    const insightId = `convopt-${Date.now()}-${++this.counter}`;
    const insight: ConversionOptimizationInsight = {
      insightId, funnel, stage, currentRate, benchmarkRate,
      gap: benchmarkRate - currentRate, recommendation,
      estimatedUpliftPct: estimatedUplift, effort, generatedAt: Date.now()
    };
    this.insights.push(insight);
    return insight;
  }

  getQuickWins(maxEffort: ConversionOptimizationInsight['effort'] = 'low', minUplift = 10): ConversionOptimizationInsight[] {
    const effortOrder = { low: 0, medium: 1, high: 2 };
    return this.insights
      .filter(i => effortOrder[i.effort] <= effortOrder[maxEffort] && i.estimatedUpliftPct >= minUplift)
      .sort((a, b) => b.estimatedUpliftPct - a.estimatedUpliftPct);
  }

  getTopOpportunities(limit = 5): ConversionOptimizationInsight[] {
    return this.insights
      .sort((a, b) => b.estimatedUpliftPct - a.estimatedUpliftPct)
      .slice(0, limit);
  }
}

export const cacTracker = new CACTracker();
export const acquisitionChannelScorer = new AcquisitionChannelScorer();
export const leadQualityScorer = new LeadQualityScorer();
export const conversionOptimizationAdvisor = new ConversionOptimizationAdvisor();

export { CACMetric, AcquisitionChannel, LeadQualityScore, ConversionOptimizationInsight };
