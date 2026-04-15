/**
 * Phase 217: Experience Scoring
 * CX score calculation, experience index management, moment of truth tracking, benchmarking
 */

import { logger } from './logger';

interface CXScore {
  scoreId: string;
  customerId: string;
  dimension: 'ease' | 'emotion' | 'effectiveness' | 'empathy' | 'resolution';
  score: number; // 0-100
  weight: number;
  context: string;
  recordedAt: number;
}

interface ExperienceIndex {
  indexId: string;
  customerId: string;
  period: string;
  compositeScore: number;
  dimensionScores: Record<string, number>;
  tier: 'excellent' | 'good' | 'average' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

interface MomentOfTruth {
  momentId: string;
  customerId: string;
  touchpoint: string;
  type: 'make_or_break' | 'high_impact' | 'standard';
  outcome: 'exceeded' | 'met' | 'failed';
  customerEmotion: 'delighted' | 'satisfied' | 'neutral' | 'frustrated' | 'angry';
  impactScore: number;
  occurredAt: number;
}

interface ExperienceBenchmark {
  benchmarkId: string;
  industry: string;
  metric: string;
  industryAvg: number;
  topQuartile: number;
  ourScore: number;
  gap: number;
  updatedAt: number;
}

class CXScoreCalculator {
  private scores: Map<string, CXScore[]> = new Map();
  private counter = 0;

  record(customerId: string, dimension: CXScore['dimension'], score: number, weight: number, context = ''): CXScore {
    const scoreId = `cxscore-${Date.now()}-${++this.counter}`;
    const record: CXScore = {
      scoreId, customerId, dimension,
      score: Math.max(0, Math.min(100, score)),
      weight: Math.max(0, Math.min(1, weight)),
      context, recordedAt: Date.now()
    };
    const existing = this.scores.get(customerId) || [];
    existing.push(record);
    this.scores.set(customerId, existing);
    return record;
  }

  calculateComposite(customerId: string): number {
    const scores = this.scores.get(customerId) || [];
    if (!scores.length) return 0;
    const recentByDimension = new Map<string, CXScore>();
    for (const s of scores) {
      const existing = recentByDimension.get(s.dimension);
      if (!existing || s.recordedAt > existing.recordedAt) recentByDimension.set(s.dimension, s);
    }
    const all = Array.from(recentByDimension.values());
    const totalWeight = all.reduce((s, r) => s + r.weight, 0);
    return totalWeight > 0 ? all.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight : 0;
  }

  getDimensionAvg(dimension: CXScore['dimension']): number {
    const all = Array.from(this.scores.values()).flat().filter(s => s.dimension === dimension);
    if (!all.length) return 0;
    return all.reduce((s, r) => s + r.score, 0) / all.length;
  }

  getCustomerScores(customerId: string): CXScore[] {
    return this.scores.get(customerId) || [];
  }
}

class ExperienceIndexManager {
  private indexes: Map<string, ExperienceIndex[]> = new Map();
  private counter = 0;

  calculate(customerId: string, period: string, dimensionScores: Record<string, number>): ExperienceIndex {
    const values = Object.values(dimensionScores);
    const compositeScore = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const tier: ExperienceIndex['tier'] =
      compositeScore >= 80 ? 'excellent' : compositeScore >= 60 ? 'good' : compositeScore >= 40 ? 'average' : 'poor';

    const history = this.indexes.get(customerId) || [];
    const prev = history[history.length - 1];
    const trend: ExperienceIndex['trend'] = prev
      ? (compositeScore - prev.compositeScore > 5 ? 'improving' : prev.compositeScore - compositeScore > 5 ? 'declining' : 'stable')
      : 'stable';

    const indexId = `expidx-${Date.now()}-${++this.counter}`;
    const index: ExperienceIndex = {
      indexId, customerId, period, compositeScore, dimensionScores, tier, trend, calculatedAt: Date.now()
    };
    history.push(index);
    this.indexes.set(customerId, history);
    logger.debug('Experience index calculated', { customerId, period, compositeScore: compositeScore.toFixed(1), tier });
    return index;
  }

  getLatest(customerId: string): ExperienceIndex | undefined {
    const history = this.indexes.get(customerId) || [];
    return history[history.length - 1];
  }

  getPoorExperienceCustomers(threshold = 40): string[] {
    return Array.from(this.indexes.entries())
      .filter(([, history]) => {
        const latest = history[history.length - 1];
        return latest && latest.compositeScore < threshold;
      })
      .map(([customerId]) => customerId);
  }

  getAvgScore(): number {
    const all = Array.from(this.indexes.values())
      .map(h => h[h.length - 1])
      .filter(Boolean) as ExperienceIndex[];
    if (!all.length) return 0;
    return all.reduce((s, i) => s + i.compositeScore, 0) / all.length;
  }
}

class MomentOfTruthTracker {
  private moments: MomentOfTruth[] = [];
  private counter = 0;

  record(customerId: string, touchpoint: string, type: MomentOfTruth['type'], outcome: MomentOfTruth['outcome'], emotion: MomentOfTruth['customerEmotion']): MomentOfTruth {
    const impactMap: Record<MomentOfTruth['type'], number> = { make_or_break: 10, high_impact: 6, standard: 3 };
    const outcomeMultiplier: Record<MomentOfTruth['outcome'], number> = { exceeded: 1.5, met: 1, failed: -1.5 };
    const momentId = `mot-${Date.now()}-${++this.counter}`;
    const moment: MomentOfTruth = {
      momentId, customerId, touchpoint, type, outcome, customerEmotion: emotion,
      impactScore: impactMap[type] * outcomeMultiplier[outcome],
      occurredAt: Date.now()
    };
    this.moments.push(moment);
    logger.debug('Moment of truth recorded', { momentId, touchpoint, type, outcome, impactScore: moment.impactScore });
    return moment;
  }

  getCustomerMoments(customerId: string): MomentOfTruth[] {
    return this.moments.filter(m => m.customerId === customerId);
  }

  getCumulativeImpact(customerId: string): number {
    return this.getCustomerMoments(customerId).reduce((s, m) => s + m.impactScore, 0);
  }

  getFailedMoments(type?: MomentOfTruth['type']): MomentOfTruth[] {
    return this.moments.filter(m => m.outcome === 'failed' && (!type || m.type === type));
  }

  getTouchpointPerformance(): Record<string, { total: number; successRate: number }> {
    const result: Record<string, { total: number; successes: number }> = {};
    for (const m of this.moments) {
      if (!result[m.touchpoint]) result[m.touchpoint] = { total: 0, successes: 0 };
      result[m.touchpoint].total++;
      if (m.outcome !== 'failed') result[m.touchpoint].successes++;
    }
    return Object.fromEntries(Object.entries(result).map(([tp, { total, successes }]) => [
      tp, { total, successRate: total > 0 ? (successes / total) * 100 : 0 }
    ]));
  }
}

class ExperienceBenchmarker {
  private benchmarks: Map<string, ExperienceBenchmark> = new Map();
  private counter = 0;

  setBenchmark(industry: string, metric: string, industryAvg: number, topQuartile: number, ourScore: number): ExperienceBenchmark {
    const benchmarkId = `bench-${Date.now()}-${++this.counter}`;
    const benchmark: ExperienceBenchmark = {
      benchmarkId, industry, metric, industryAvg, topQuartile, ourScore,
      gap: ourScore - industryAvg, updatedAt: Date.now()
    };
    this.benchmarks.set(`${industry}:${metric}`, benchmark);
    logger.debug('Benchmark set', { metric, ourScore, industryAvg, gap: benchmark.gap });
    return benchmark;
  }

  getGapAnalysis(industry: string): Array<{ metric: string; gap: number; status: 'leader' | 'on_par' | 'lagging' }> {
    return Array.from(this.benchmarks.values())
      .filter(b => b.industry === industry)
      .map(b => ({
        metric: b.metric,
        gap: b.gap,
        status: b.ourScore >= b.topQuartile ? 'leader' : b.ourScore >= b.industryAvg ? 'on_par' : 'lagging'
      }));
  }

  getLeadingMetrics(industry: string): ExperienceBenchmark[] {
    return Array.from(this.benchmarks.values())
      .filter(b => b.industry === industry && b.ourScore >= b.topQuartile);
  }

  getBenchmark(industry: string, metric: string): ExperienceBenchmark | undefined {
    return this.benchmarks.get(`${industry}:${metric}`);
  }
}

export const cxScoreCalculator = new CXScoreCalculator();
export const experienceIndexManager = new ExperienceIndexManager();
export const momentOfTruthTracker = new MomentOfTruthTracker();
export const experienceBenchmarker = new ExperienceBenchmarker();

export { CXScore, ExperienceIndex, MomentOfTruth, ExperienceBenchmark };
