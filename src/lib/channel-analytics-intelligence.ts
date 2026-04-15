/**
 * Phase 318: Channel Analytics Intelligence
 * Multi-channel performance, attribution, ROI analysis, channel mix optimization
 */

import { logger } from './logger';

interface ChannelRecord {
  channelId: string;
  channelName: string;
  channelType: 'organic_search' | 'paid_search' | 'social' | 'email' | 'direct' | 'referral' | 'display' | 'affiliate';
  isActive: boolean;
  monthlyBudgetUSD: number;
  spendUSD: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueUSD: number;
  ctr: number;                    // click-through rate %
  conversionRate: number;         // %
  cpc: number;                    // cost per click
  cpa: number;                    // cost per acquisition
  roas: number;                   // return on ad spend
  roiPct: number;
  attributedRevenuePct: number;   // % of total revenue attributed
  status: 'top_performer' | 'performing' | 'underperforming' | 'paused';
  updatedAt: number;
  createdAt: number;
}

interface AttributionRecord {
  attributionId: string;
  conversionId: string;
  model: 'last_click' | 'first_click' | 'linear' | 'time_decay' | 'position_based' | 'data_driven';
  touchpoints: { channelId: string; channelName: string; weight: number; timestamp: number }[];
  totalRevenue: number;
  attributedRevenue: Record<string, number>;  // channelId → attributed revenue
  conversionPath: string[];
  pathLength: number;
  timeToConvertDays: number;
  createdAt: number;
}

interface ChannelMixRecord {
  mixId: string;
  period: string;
  totalBudgetUSD: number;
  totalRevenueUSD: number;
  totalConversions: number;
  overallROAS: number;
  channelAllocations: { channelId: string; channelName: string; budgetPct: number; revenuePct: number; roas: number }[];
  recommendedAllocations: { channelId: string; channelName: string; currentPct: number; recommendedPct: number; expectedRevenueLift: number }[];
  optimizationPotentialUSD: number;
  calculatedAt: number;
}

interface ChannelFunnelRecord {
  funnelId: string;
  channelId: string;
  channelName: string;
  period: string;
  awareness: number;              // impressions
  interest: number;               // clicks
  consideration: number;          // product views
  intent: number;                 // add-to-cart / sign-ups
  purchase: number;               // conversions
  awarenessToInterestPct: number;
  interestToConsiderationPct: number;
  considerationToIntentPct: number;
  intentToPurchasePct: number;
  overallFunnelConversionPct: number;
  topDropOffStage: string;
  createdAt: number;
}

class ChannelManager {
  private channels: Map<string, ChannelRecord> = new Map();
  private counter = 0;

  register(name: string, type: ChannelRecord['channelType'], monthlyBudget: number): ChannelRecord {
    const channelId = `chan-${Date.now()}-${++this.counter}`;
    const record: ChannelRecord = {
      channelId, channelName: name, channelType: type, isActive: true,
      monthlyBudgetUSD: monthlyBudget, spendUSD: 0, impressions: 0, clicks: 0,
      conversions: 0, revenueUSD: 0, ctr: 0, conversionRate: 0, cpc: 0, cpa: 0,
      roas: 0, roiPct: 0, attributedRevenuePct: 0,
      status: 'performing', updatedAt: Date.now(), createdAt: Date.now()
    };
    this.channels.set(channelId, record);
    logger.debug('Channel registered', { channelId, name, type });
    return record;
  }

  updateMetrics(channelId: string, spend: number, impressions: number, clicks: number, conversions: number, revenue: number): boolean {
    const ch = this.channels.get(channelId);
    if (!ch) return false;
    ch.spendUSD = spend;
    ch.impressions = impressions;
    ch.clicks = clicks;
    ch.conversions = conversions;
    ch.revenueUSD = revenue;
    ch.ctr = impressions > 0 ? Math.round((clicks / impressions) * 100 * 100) / 100 : 0;
    ch.conversionRate = clicks > 0 ? Math.round((conversions / clicks) * 100 * 100) / 100 : 0;
    ch.cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    ch.cpa = conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0;
    ch.roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
    ch.roiPct = spend > 0 ? Math.round(((revenue - spend) / spend) * 100 * 10) / 10 : 0;
    ch.status = ch.roas >= 4 ? 'top_performer' : ch.roas >= 2 ? 'performing' : ch.roas > 0 ? 'underperforming' : 'paused';
    ch.updatedAt = Date.now();
    return true;
  }

  recalculateAttributedRevenuePct(totalRevenue: number): void {
    this.channels.forEach(ch => {
      ch.attributedRevenuePct = totalRevenue > 0 ? Math.round((ch.revenueUSD / totalRevenue) * 100 * 10) / 10 : 0;
    });
  }

  getTopPerformers(limit = 5): ChannelRecord[] {
    return Array.from(this.channels.values())
      .filter(c => c.isActive)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, limit);
  }

  getUnderperforming(): ChannelRecord[] {
    return Array.from(this.channels.values()).filter(c => c.status === 'underperforming');
  }

  getAll(): ChannelRecord[] {
    return Array.from(this.channels.values());
  }

  getChannel(id: string): ChannelRecord | undefined {
    return this.channels.get(id);
  }
}

class AttributionEngine {
  private attributions: AttributionRecord[] = [];
  private counter = 0;

  attribute(conversionId: string, model: AttributionRecord['model'], touchpoints: { channelId: string; channelName: string; timestamp: number }[], totalRevenue: number, conversionTime: number): AttributionRecord {
    const attributionId = `attr-${Date.now()}-${++this.counter}`;
    const n = touchpoints.length;
    const weights: number[] = [];

    if (model === 'last_click') {
      touchpoints.forEach((_, i) => weights.push(i === n - 1 ? 1 : 0));
    } else if (model === 'first_click') {
      touchpoints.forEach((_, i) => weights.push(i === 0 ? 1 : 0));
    } else if (model === 'linear') {
      touchpoints.forEach(() => weights.push(n > 0 ? 1 / n : 0));
    } else if (model === 'position_based') {
      touchpoints.forEach((_, i) => {
        if (n === 1) weights.push(1);
        else if (i === 0 || i === n - 1) weights.push(0.4);
        else weights.push(0.2 / Math.max(1, n - 2));
      });
    } else if (model === 'time_decay') {
      const decayBase = 0.7;
      const rawWeights = touchpoints.map((_, i) => Math.pow(decayBase, n - 1 - i));
      const total = rawWeights.reduce((s, w) => s + w, 0);
      rawWeights.forEach(w => weights.push(total > 0 ? w / total : 0));
    } else {
      // data_driven: equal weights as fallback
      touchpoints.forEach(() => weights.push(n > 0 ? 1 / n : 0));
    }

    const attributedRevenue: Record<string, number> = {};
    touchpoints.forEach((tp, i) => {
      const rev = Math.round(totalRevenue * weights[i] * 100) / 100;
      attributedRevenue[tp.channelId] = (attributedRevenue[tp.channelId] || 0) + rev;
    });

    const firstTs = touchpoints.length > 0 ? touchpoints[0].timestamp : conversionTime;
    const timeToConvert = Math.round((conversionTime - firstTs) / 86400000 * 10) / 10;

    const record: AttributionRecord = {
      attributionId, conversionId, model,
      touchpoints: touchpoints.map((tp, i) => ({ ...tp, weight: Math.round(weights[i] * 100) / 100 })),
      totalRevenue, attributedRevenue,
      conversionPath: touchpoints.map(tp => tp.channelName),
      pathLength: n, timeToConvertDays: timeToConvert, createdAt: Date.now()
    };
    this.attributions.push(record);
    return record;
  }

  getAttributionByChannel(channelId: string): number {
    return this.attributions.reduce((s, a) => s + (a.attributedRevenue[channelId] || 0), 0);
  }

  getAveragePathLength(): number {
    if (this.attributions.length === 0) return 0;
    return Math.round(this.attributions.reduce((s, a) => s + a.pathLength, 0) / this.attributions.length * 10) / 10;
  }
}

class ChannelMixOptimizer {
  private records: ChannelMixRecord[] = [];
  private counter = 0;

  optimize(period: string, channels: ChannelRecord[]): ChannelMixRecord {
    const totalBudget = channels.reduce((s, c) => s + c.spendUSD, 0);
    const totalRevenue = channels.reduce((s, c) => s + c.revenueUSD, 0);
    const totalConversions = channels.reduce((s, c) => s + c.conversions, 0);
    const overallROAS = totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) / 100 : 0;

    const allocations = channels.map(c => ({
      channelId: c.channelId, channelName: c.channelName,
      budgetPct: totalBudget > 0 ? Math.round((c.spendUSD / totalBudget) * 100 * 10) / 10 : 0,
      revenuePct: totalRevenue > 0 ? Math.round((c.revenueUSD / totalRevenue) * 100 * 10) / 10 : 0,
      roas: c.roas
    }));

    // Recommend shifting budget toward top performers
    const avgRoas = channels.length > 0 ? channels.reduce((s, c) => s + c.roas, 0) / channels.length : 0;
    const recommended = channels.map(c => {
      const currentPct = totalBudget > 0 ? (c.spendUSD / totalBudget) * 100 : 0;
      const delta = c.roas > avgRoas * 1.2 ? 5 : c.roas < avgRoas * 0.8 ? -5 : 0;
      const recommendedPct = Math.max(0, Math.round((currentPct + delta) * 10) / 10);
      const expectedLift = Math.round(delta * (c.roas - avgRoas) * totalBudget / 100 * 10) / 10;
      return { channelId: c.channelId, channelName: c.channelName, currentPct: Math.round(currentPct * 10) / 10, recommendedPct, expectedRevenueLift: Math.max(0, expectedLift) };
    });

    const optimizationPotential = Math.round(recommended.reduce((s, r) => s + r.expectedRevenueLift, 0));

    const mixId = `mix-${Date.now()}-${++this.counter}`;
    const record: ChannelMixRecord = {
      mixId, period, totalBudgetUSD: totalBudget, totalRevenueUSD: totalRevenue,
      totalConversions, overallROAS, channelAllocations: allocations,
      recommendedAllocations: recommended, optimizationPotentialUSD: optimizationPotential,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Channel mix optimized', { period, overallROAS, optimizationPotential });
    return record;
  }

  getLatest(): ChannelMixRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

class ChannelFunnelAnalyzer {
  private funnels: ChannelFunnelRecord[] = [];
  private counter = 0;

  analyze(channelId: string, channelName: string, period: string, awareness: number, interest: number, consideration: number, intent: number, purchase: number): ChannelFunnelRecord {
    const awarenessToInterest = awareness > 0 ? Math.round((interest / awareness) * 100 * 100) / 100 : 0;
    const interestToConsideration = interest > 0 ? Math.round((consideration / interest) * 100 * 100) / 100 : 0;
    const considerationToIntent = consideration > 0 ? Math.round((intent / consideration) * 100 * 100) / 100 : 0;
    const intentToPurchase = intent > 0 ? Math.round((purchase / intent) * 100 * 100) / 100 : 0;
    const overall = awareness > 0 ? Math.round((purchase / awareness) * 100 * 100) / 100 : 0;

    const stages = [
      { name: 'awareness_to_interest', rate: awarenessToInterest },
      { name: 'interest_to_consideration', rate: interestToConsideration },
      { name: 'consideration_to_intent', rate: considerationToIntent },
      { name: 'intent_to_purchase', rate: intentToPurchase }
    ];
    const topDropOff = stages.reduce((min, s) => s.rate < min.rate ? s : min, stages[0]).name;

    const funnelId = `funnel-${Date.now()}-${++this.counter}`;
    const record: ChannelFunnelRecord = {
      funnelId, channelId, channelName, period, awareness, interest, consideration, intent, purchase,
      awarenessToInterestPct: awarenessToInterest, interestToConsiderationPct: interestToConsideration,
      considerationToIntentPct: considerationToIntent, intentToPurchasePct: intentToPurchase,
      overallFunnelConversionPct: overall, topDropOffStage: topDropOff, createdAt: Date.now()
    };
    this.funnels.push(record);
    return record;
  }

  getWeakestFunnels(limit = 3): ChannelFunnelRecord[] {
    return [...this.funnels].sort((a, b) => a.overallFunnelConversionPct - b.overallFunnelConversionPct).slice(0, limit);
  }
}

export const channelManager = new ChannelManager();
export const attributionEngine = new AttributionEngine();
export const channelMixOptimizer = new ChannelMixOptimizer();
export const channelFunnelAnalyzer = new ChannelFunnelAnalyzer();

export { ChannelRecord, AttributionRecord, ChannelMixRecord, ChannelFunnelRecord };
