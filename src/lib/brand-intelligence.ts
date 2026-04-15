/**
 * Phase 244: Brand Intelligence
 * Brand health tracking, share of voice, sentiment monitoring, brand equity measurement
 */

import { logger } from './logger';

interface BrandHealthMetric {
  metricId: string;
  period: string;
  awareness: number;         // 0-100 % aware
  consideration: number;     // 0-100 % would consider
  preference: number;        // 0-100 % prefer over competitors
  netPromoterScore: number;  // -100 to 100
  brandStrengthIndex: number; // composite 0-100
  capturedAt: number;
}

interface ShareOfVoice {
  sovId: string;
  period: string;
  channel: 'social' | 'search' | 'pr' | 'review' | 'paid';
  totalMentions: number;
  ourMentions: number;
  sovPct: number;
  topCompetitorSov: Record<string, number>;
  capturedAt: number;
}

interface BrandSentimentRecord {
  sentimentId: string;
  period: string;
  channel: string;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  totalMentions: number;
  sentimentScore: number;  // weighted: pos*1 + neu*0 + neg*-1
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  capturedAt: number;
}

interface BrandEquityScore {
  equityId: string;
  period: string;
  awareness: number;
  loyalty: number;
  perceivedQuality: number;
  brandAssociations: number;
  proprietaryAssets: number;
  overallEquity: number;  // weighted composite
  vsCompetitor: number;   // gap vs primary competitor
  capturedAt: number;
}

class BrandHealthTracker {
  private metrics: BrandHealthMetric[] = [];
  private counter = 0;

  record(period: string, awareness: number, consideration: number, preference: number, nps: number): BrandHealthMetric {
    const brandStrengthIndex = awareness * 0.25 + consideration * 0.25 + preference * 0.3 + Math.max(0, (nps + 100) / 2) * 0.2;
    const metricId = `brandhealth-${Date.now()}-${++this.counter}`;
    const metric: BrandHealthMetric = {
      metricId, period, awareness, consideration, preference,
      netPromoterScore: nps,
      brandStrengthIndex: Math.max(0, Math.min(100, brandStrengthIndex)), capturedAt: Date.now()
    };
    this.metrics.push(metric);
    logger.debug('Brand health recorded', { period, brandStrengthIndex });
    return metric;
  }

  getLatest(): BrandHealthMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.metrics.length < 2) return 'stable';
    const prev = this.metrics[this.metrics.length - 2];
    const curr = this.metrics[this.metrics.length - 1];
    const diff = curr.brandStrengthIndex - prev.brandStrengthIndex;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }

  getAllMetrics(): BrandHealthMetric[] {
    return [...this.metrics];
  }
}

class ShareOfVoiceTracker {
  private records: Map<string, ShareOfVoice[]> = new Map();
  private counter = 0;

  record(period: string, channel: ShareOfVoice['channel'], totalMentions: number, ourMentions: number, competitorMentions: Record<string, number>): ShareOfVoice {
    const sovId = `sov-${Date.now()}-${++this.counter}`;
    const topCompetitorSov: Record<string, number> = {};
    for (const [comp, mentions] of Object.entries(competitorMentions)) {
      topCompetitorSov[comp] = totalMentions > 0 ? (mentions / totalMentions) * 100 : 0;
    }
    const record: ShareOfVoice = {
      sovId, period, channel, totalMentions, ourMentions,
      sovPct: totalMentions > 0 ? (ourMentions / totalMentions) * 100 : 0,
      topCompetitorSov, capturedAt: Date.now()
    };
    const existing = this.records.get(channel) || [];
    existing.push(record);
    this.records.set(channel, existing);
    return record;
  }

  getOverallSOV(period: string): number {
    const periodRecords = Array.from(this.records.values())
      .flat().filter(r => r.period === period);
    if (!periodRecords.length) return 0;
    const totalMentions = periodRecords.reduce((s, r) => s + r.totalMentions, 0);
    const ourMentions = periodRecords.reduce((s, r) => s + r.ourMentions, 0);
    return totalMentions > 0 ? (ourMentions / totalMentions) * 100 : 0;
  }

  getLatest(channel: ShareOfVoice['channel']): ShareOfVoice | undefined {
    const history = this.records.get(channel) || [];
    return history[history.length - 1];
  }
}

class BrandSentimentMonitor {
  private records: BrandSentimentRecord[] = [];
  private counter = 0;

  record(period: string, channel: string, positivePct: number, neutralPct: number, negativePct: number, totalMentions: number, positiveThemes: string[], negativeThemes: string[]): BrandSentimentRecord {
    const sentimentScore = (positivePct - negativePct) / 100;
    const sentimentId = `brandsent-${Date.now()}-${++this.counter}`;
    const record: BrandSentimentRecord = {
      sentimentId, period, channel, positivePct, neutralPct, negativePct,
      totalMentions, sentimentScore, topPositiveThemes: positiveThemes,
      topNegativeThemes: negativeThemes, capturedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getOverallSentiment(period: string): number {
    const periodRecords = this.records.filter(r => r.period === period);
    if (!periodRecords.length) return 0;
    const total = periodRecords.reduce((s, r) => s + r.totalMentions, 0);
    if (!total) return 0;
    return periodRecords.reduce((s, r) => s + r.sentimentScore * r.totalMentions, 0) / total;
  }

  getNegativeChannels(threshold = -0.1): BrandSentimentRecord[] {
    const latestByChannel = new Map<string, BrandSentimentRecord>();
    for (const r of this.records) {
      const existing = latestByChannel.get(r.channel);
      if (!existing || r.capturedAt > existing.capturedAt) latestByChannel.set(r.channel, r);
    }
    return Array.from(latestByChannel.values()).filter(r => r.sentimentScore < threshold);
  }
}

class BrandEquityMeasurer {
  private scores: BrandEquityScore[] = [];
  private counter = 0;

  measure(period: string, awareness: number, loyalty: number, perceivedQuality: number, associations: number, proprietaryAssets: number, competitorEquity: number): BrandEquityScore {
    const overallEquity = awareness * 0.2 + loyalty * 0.25 + perceivedQuality * 0.25 + associations * 0.15 + proprietaryAssets * 0.15;
    const equityId = `brandequity-${Date.now()}-${++this.counter}`;
    const score: BrandEquityScore = {
      equityId, period, awareness, loyalty, perceivedQuality,
      brandAssociations: associations, proprietaryAssets,
      overallEquity: Math.max(0, Math.min(100, overallEquity)),
      vsCompetitor: overallEquity - competitorEquity, capturedAt: Date.now()
    };
    this.scores.push(score);
    logger.debug('Brand equity measured', { period, overallEquity, vsCompetitor: score.vsCompetitor });
    return score;
  }

  getLatest(): BrandEquityScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getEquityTrend(): 'improving' | 'stable' | 'declining' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallEquity - this.scores[this.scores.length - 2].overallEquity;
    return diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable';
  }
}

export const brandHealthTracker = new BrandHealthTracker();
export const shareOfVoiceTracker = new ShareOfVoiceTracker();
export const brandSentimentMonitor = new BrandSentimentMonitor();
export const brandEquityMeasurer = new BrandEquityMeasurer();

export { BrandHealthMetric, ShareOfVoice, BrandSentimentRecord, BrandEquityScore };
