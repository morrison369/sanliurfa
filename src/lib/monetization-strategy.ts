/**
 * Phase 196: Monetization Strategy
 * Monetization model evaluation, pricing strategy, revenue stream management, metrics tracking
 */

import { logger } from './logger';

interface MonetizationModel {
  modelId: string;
  name: string;
  type: 'subscription' | 'usage_based' | 'freemium' | 'marketplace' | 'licensing' | 'hybrid';
  description: string;
  estimatedARR: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  timeToRevenue: number; // days
  score: number; // 0-100
  createdAt: number;
}

interface PricingStrategy {
  strategyId: string;
  name: string;
  approach: 'value_based' | 'cost_plus' | 'competitive' | 'penetration' | 'skimming' | 'tiered';
  targetSegment: string;
  pricePoint: number;
  currency: string;
  rationale: string;
  expectedConversionRate: number;
  active: boolean;
  createdAt: number;
}

interface RevenueStream {
  streamId: string;
  name: string;
  type: 'recurring' | 'one_time' | 'transactional' | 'affiliate';
  monthlyRevenue: number;
  growthRatePct: number;
  marginPct: number;
  contributionPct: number; // % of total revenue
  status: 'active' | 'growing' | 'declining' | 'sunset';
  createdAt: number;
  updatedAt: number;
}

interface MonetizationMetric {
  metricId: string;
  period: string;
  arpu: number;
  arppu: number;
  conversionRate: number;
  paybackPeriodDays: number;
  revenuePerEmployee: number;
  grossMarginPct: number;
  capturedAt: number;
}

class MonetizationModelEvaluator {
  private models: Map<string, MonetizationModel> = new Map();
  private counter = 0;

  evaluate(name: string, type: MonetizationModel['type'], estimatedARR: number, complexity: MonetizationModel['implementationComplexity'], timeToRevenue: number, description = ''): MonetizationModel {
    const complexityPenalty: Record<MonetizationModel['implementationComplexity'], number> = { low: 0, medium: 15, high: 30 };
    const timeScore = Math.max(0, 100 - timeToRevenue / 3);
    const arrScore = Math.min(50, estimatedARR / 100000);
    const score = Math.max(0, Math.min(100, arrScore + timeScore - complexityPenalty[complexity]));

    const modelId = `model-${Date.now()}-${++this.counter}`;
    const model: MonetizationModel = {
      modelId, name, type, description, estimatedARR, implementationComplexity: complexity,
      timeToRevenue, score, createdAt: Date.now()
    };
    this.models.set(modelId, model);
    logger.debug('Monetization model evaluated', { modelId, name, type, score: score.toFixed(1) });
    return model;
  }

  recommend(limit = 3): MonetizationModel[] {
    return Array.from(this.models.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  compare(modelIdA: string, modelIdB: string): { winner: string; scoreDiff: number; reasoning: string } | undefined {
    const a = this.models.get(modelIdA);
    const b = this.models.get(modelIdB);
    if (!a || !b) return undefined;
    const winner = a.score >= b.score ? a.modelId : b.modelId;
    const reasoning = a.score >= b.score
      ? `${a.name} scores higher (${a.score.toFixed(1)} vs ${b.score.toFixed(1)})`
      : `${b.name} scores higher (${b.score.toFixed(1)} vs ${a.score.toFixed(1)})`;
    return { winner, scoreDiff: Math.abs(a.score - b.score), reasoning };
  }

  getByType(type: MonetizationModel['type']): MonetizationModel[] {
    return Array.from(this.models.values()).filter(m => m.type === type);
  }
}

class PricingStrategyAdvisor {
  private strategies: Map<string, PricingStrategy> = new Map();
  private counter = 0;

  define(name: string, approach: PricingStrategy['approach'], targetSegment: string, pricePoint: number, rationale: string, expectedConversionRate = 0.05): PricingStrategy {
    const strategyId = `strategy-${Date.now()}-${++this.counter}`;
    const strategy: PricingStrategy = {
      strategyId, name, approach, targetSegment, pricePoint,
      currency: 'USD', rationale, expectedConversionRate, active: true, createdAt: Date.now()
    };
    this.strategies.set(strategyId, strategy);
    logger.debug('Pricing strategy defined', { strategyId, name, approach, pricePoint });
    return strategy;
  }

  deactivate(strategyId: string): boolean {
    const s = this.strategies.get(strategyId);
    if (s) { s.active = false; return true; }
    return false;
  }

  estimateRevenue(strategyId: string, totalAddressableMarket: number): number {
    const s = this.strategies.get(strategyId);
    if (!s) return 0;
    return s.pricePoint * s.expectedConversionRate * totalAddressableMarket;
  }

  getActiveStrategies(): PricingStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.active);
  }

  getByApproach(approach: PricingStrategy['approach']): PricingStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.approach === approach);
  }
}

class RevenueStreamManager {
  private streams: Map<string, RevenueStream> = new Map();
  private counter = 0;

  add(name: string, type: RevenueStream['type'], monthlyRevenue: number, growthRatePct: number, marginPct: number): RevenueStream {
    const streamId = `stream-${Date.now()}-${++this.counter}`;
    const stream: RevenueStream = {
      streamId, name, type, monthlyRevenue, growthRatePct, marginPct,
      contributionPct: 0, status: growthRatePct > 5 ? 'growing' : growthRatePct < -5 ? 'declining' : 'active',
      createdAt: Date.now(), updatedAt: Date.now()
    };
    this.streams.set(streamId, stream);
    this._recalculateContributions();
    logger.debug('Revenue stream added', { streamId, name, type, monthlyRevenue });
    return stream;
  }

  update(streamId: string, monthlyRevenue: number, growthRatePct: number): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    stream.monthlyRevenue = monthlyRevenue;
    stream.growthRatePct = growthRatePct;
    stream.status = growthRatePct > 5 ? 'growing' : growthRatePct < -5 ? 'declining' : 'active';
    stream.updatedAt = Date.now();
    this._recalculateContributions();
    return true;
  }

  private _recalculateContributions(): void {
    const total = Array.from(this.streams.values()).reduce((s, r) => s + r.monthlyRevenue, 0);
    for (const stream of this.streams.values()) {
      stream.contributionPct = total > 0 ? (stream.monthlyRevenue / total) * 100 : 0;
    }
  }

  getTotalMonthlyRevenue(): number {
    return Array.from(this.streams.values()).reduce((s, r) => s + r.monthlyRevenue, 0);
  }

  getDiversificationScore(): number {
    const streams = Array.from(this.streams.values()).filter(s => s.status !== 'sunset');
    if (!streams.length) return 0;
    const hhi = streams.reduce((s, r) => s + Math.pow(r.contributionPct / 100, 2), 0);
    return Math.max(0, (1 - hhi) * 100); // 0=monopoly, 100=perfectly diverse
  }

  getStreams(): RevenueStream[] {
    return Array.from(this.streams.values());
  }
}

class MonetizationMetricsTracker {
  private metrics: MonetizationMetric[] = [];
  private counter = 0;

  record(period: string, totalRevenue: number, payingCustomers: number, totalUsers: number, cac: number, grossMarginPct: number, employeeCount: number): MonetizationMetric {
    const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;
    const arppu = payingCustomers > 0 ? totalRevenue / payingCustomers : 0;
    const conversionRate = totalUsers > 0 ? payingCustomers / totalUsers : 0;
    const paybackPeriodDays = arppu > 0 ? (cac / (arppu / 30)) : 0;
    const revenuePerEmployee = employeeCount > 0 ? totalRevenue / employeeCount : 0;

    const metric: MonetizationMetric = {
      metricId: `metric-${Date.now()}-${++this.counter}`,
      period, arpu, arppu, conversionRate, paybackPeriodDays,
      revenuePerEmployee, grossMarginPct, capturedAt: Date.now()
    };
    this.metrics.push(metric);
    logger.debug('Monetization metrics recorded', { period, arpu: arpu.toFixed(2), conversionRate: (conversionRate * 100).toFixed(1) });
    return metric;
  }

  getLatest(): MonetizationMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getTrend(field: keyof Pick<MonetizationMetric, 'arpu' | 'arppu' | 'conversionRate' | 'grossMarginPct'>): 'improving' | 'declining' | 'stable' {
    if (this.metrics.length < 2) return 'stable';
    const prev = this.metrics[this.metrics.length - 2][field] as number;
    const curr = this.metrics[this.metrics.length - 1][field] as number;
    const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return changePct > 3 ? 'improving' : changePct < -3 ? 'declining' : 'stable';
  }

  getMetrics(): MonetizationMetric[] {
    return this.metrics;
  }
}

export const monetizationModelEvaluator = new MonetizationModelEvaluator();
export const pricingStrategyAdvisor = new PricingStrategyAdvisor();
export const revenueStreamManager = new RevenueStreamManager();
export const monetizationMetricsTracker = new MonetizationMetricsTracker();

export { MonetizationModel, PricingStrategy, RevenueStream, MonetizationMetric };
