/**
 * Phase 215: Voice of Customer
 * Feedback collection, VoC analysis, customer insight management, dashboard aggregation
 */

import { logger } from './logger';

interface CustomerFeedback {
  feedbackId: string;
  customerId: string;
  channel: 'email' | 'chat' | 'survey' | 'social' | 'call' | 'review';
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  score?: number;
  productArea: string;
  collectedAt: number;
}

interface VoCInsight {
  insightId: string;
  theme: string;
  frequency: number;
  avgSentimentScore: number;
  impactedCustomers: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sourceChannels: string[];
  exampleFeedbackIds: string[];
  discoveredAt: number;
}

interface CustomerInsight {
  insightRecordId: string;
  customerId: string;
  segment: string;
  painPoints: string[];
  delighters: string[];
  unmetNeeds: string[];
  overallSentiment: 'positive' | 'neutral' | 'negative';
  lastUpdated: number;
}

interface VoCDashboardSnapshot {
  snapshotId: string;
  period: string;
  totalFeedback: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  topThemes: Array<{ theme: string; count: number }>;
  avgScore: number;
  responseRate: number;
  capturedAt: number;
}

class FeedbackCollector {
  private feedbacks: Map<string, CustomerFeedback> = new Map();
  private counter = 0;

  collect(customerId: string, channel: CustomerFeedback['channel'], text: string, productArea: string, score?: number): CustomerFeedback {
    const feedbackId = `voc-${Date.now()}-${++this.counter}`;
    const sentiment = this._inferSentiment(text, score);
    const topics = this._extractTopics(text);
    const feedback: CustomerFeedback = {
      feedbackId, customerId, channel, text, sentiment, topics, score, productArea, collectedAt: Date.now()
    };
    this.feedbacks.set(feedbackId, feedback);
    logger.debug('Feedback collected', { feedbackId, customerId, channel, sentiment });
    return feedback;
  }

  private _inferSentiment(text: string, score?: number): CustomerFeedback['sentiment'] {
    if (score !== undefined) return score >= 7 ? 'positive' : score >= 4 ? 'neutral' : 'negative';
    const lower = text.toLowerCase();
    const positiveWords = ['great', 'love', 'excellent', 'amazing', 'perfect', 'easy'];
    const negativeWords = ['bad', 'terrible', 'hate', 'broken', 'slow', 'frustrating', 'awful'];
    const pos = positiveWords.filter(w => lower.includes(w)).length;
    const neg = negativeWords.filter(w => lower.includes(w)).length;
    return pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
  }

  private _extractTopics(text: string): string[] {
    const topicKeywords: Record<string, string[]> = {
      performance: ['slow', 'fast', 'speed', 'latency'],
      usability: ['easy', 'hard', 'confusing', 'intuitive', 'ux'],
      reliability: ['broken', 'crash', 'bug', 'error', 'down'],
      pricing: ['expensive', 'cheap', 'price', 'cost', 'value'],
      support: ['help', 'support', 'response', 'team', 'agent']
    };
    const lower = text.toLowerCase();
    return Object.entries(topicKeywords)
      .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
      .map(([topic]) => topic);
  }

  getFeedback(feedbackId: string): CustomerFeedback | undefined {
    return this.feedbacks.get(feedbackId);
  }

  getByChannel(channel: CustomerFeedback['channel']): CustomerFeedback[] {
    return Array.from(this.feedbacks.values()).filter(f => f.channel === channel);
  }

  getSentimentBreakdown(): { positive: number; neutral: number; negative: number } {
    const all = Array.from(this.feedbacks.values());
    return {
      positive: all.filter(f => f.sentiment === 'positive').length,
      neutral: all.filter(f => f.sentiment === 'neutral').length,
      negative: all.filter(f => f.sentiment === 'negative').length
    };
  }
}

class VoCAnalyzer {
  private insights: Map<string, VoCInsight> = new Map();
  private counter = 0;

  analyze(feedbacks: CustomerFeedback[]): VoCInsight[] {
    const themeMap = new Map<string, CustomerFeedback[]>();
    for (const fb of feedbacks) {
      for (const topic of fb.topics) {
        const existing = themeMap.get(topic) || [];
        existing.push(fb);
        themeMap.set(topic, existing);
      }
    }
    const results: VoCInsight[] = [];
    for (const [theme, themeFeedbacks] of themeMap.entries()) {
      const sentimentScores = themeFeedbacks.map(f => f.score ?? (f.sentiment === 'positive' ? 8 : f.sentiment === 'neutral' ? 5 : 2));
      const avgSentimentScore = sentimentScores.reduce((s, v) => s + v, 0) / sentimentScores.length;
      const uniqueCustomers = new Set(themeFeedbacks.map(f => f.customerId)).size;
      const priority: VoCInsight['priority'] =
        themeFeedbacks.length >= 10 && avgSentimentScore < 4 ? 'critical' :
          themeFeedbacks.length >= 5 ? 'high' : themeFeedbacks.length >= 3 ? 'medium' : 'low';

      const insightId = `insight-${Date.now()}-${++this.counter}`;
      const insight: VoCInsight = {
        insightId, theme, frequency: themeFeedbacks.length, avgSentimentScore,
        impactedCustomers: uniqueCustomers, priority,
        sourceChannels: [...new Set(themeFeedbacks.map(f => f.channel))],
        exampleFeedbackIds: themeFeedbacks.slice(0, 3).map(f => f.feedbackId),
        discoveredAt: Date.now()
      };
      this.insights.set(theme, insight);
      results.push(insight);
    }
    return results.sort((a, b) => b.frequency - a.frequency);
  }

  getInsight(theme: string): VoCInsight | undefined {
    return this.insights.get(theme);
  }

  getCriticalInsights(): VoCInsight[] {
    return Array.from(this.insights.values()).filter(i => i.priority === 'critical' || i.priority === 'high');
  }
}

class CustomerInsightManager {
  private insights: Map<string, CustomerInsight> = new Map();
  private counter = 0;

  upsert(customerId: string, segment: string, painPoints: string[], delighters: string[], unmetNeeds: string[]): CustomerInsight {
    const existing = this.insights.get(customerId);
    const allPainPoints = [...new Set([...(existing?.painPoints || []), ...painPoints])];
    const allDelighters = [...new Set([...(existing?.delighters || []), ...delighters])];
    const allUnmetNeeds = [...new Set([...(existing?.unmetNeeds || []), ...unmetNeeds])];
    const overallSentiment: CustomerInsight['overallSentiment'] =
      allDelighters.length > allPainPoints.length ? 'positive' :
        allPainPoints.length > allDelighters.length ? 'negative' : 'neutral';

    const insight: CustomerInsight = {
      insightRecordId: existing?.insightRecordId || `cinsight-${Date.now()}-${++this.counter}`,
      customerId, segment, painPoints: allPainPoints, delighters: allDelighters,
      unmetNeeds: allUnmetNeeds, overallSentiment, lastUpdated: Date.now()
    };
    this.insights.set(customerId, insight);
    return insight;
  }

  getInsight(customerId: string): CustomerInsight | undefined {
    return this.insights.get(customerId);
  }

  getSegmentInsights(segment: string): CustomerInsight[] {
    return Array.from(this.insights.values()).filter(i => i.segment === segment);
  }

  getTopPainPoints(limit = 5): Array<{ painPoint: string; frequency: number }> {
    const map = new Map<string, number>();
    for (const insight of this.insights.values()) {
      for (const pp of insight.painPoints) map.set(pp, (map.get(pp) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([painPoint, frequency]) => ({ painPoint, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }
}

class VoCDashboardAggregator {
  private snapshots: VoCDashboardSnapshot[] = [];
  private counter = 0;

  aggregate(period: string, feedbacks: CustomerFeedback[], totalSurveyed: number): VoCDashboardSnapshot {
    const breakdown = { positive: 0, neutral: 0, negative: 0 };
    const themeCount = new Map<string, number>();
    let scoreSum = 0, scoreCount = 0;
    for (const fb of feedbacks) {
      breakdown[fb.sentiment]++;
      for (const t of fb.topics) themeCount.set(t, (themeCount.get(t) || 0) + 1);
      if (fb.score !== undefined) { scoreSum += fb.score; scoreCount++; }
    }
    const topThemes = Array.from(themeCount.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    const snapshot: VoCDashboardSnapshot = {
      snapshotId: `vocdash-${Date.now()}-${++this.counter}`,
      period, totalFeedback: feedbacks.length, sentimentBreakdown: breakdown,
      topThemes, avgScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
      responseRate: totalSurveyed > 0 ? (feedbacks.length / totalSurveyed) * 100 : 0,
      capturedAt: Date.now()
    };
    this.snapshots.push(snapshot);
    logger.debug('VoC dashboard aggregated', { period, totalFeedback: feedbacks.length });
    return snapshot;
  }

  getLatest(): VoCDashboardSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getSentimentTrend(): 'improving' | 'declining' | 'stable' {
    if (this.snapshots.length < 2) return 'stable';
    const prev = this.snapshots[this.snapshots.length - 2];
    const curr = this.snapshots[this.snapshots.length - 1];
    const prevPos = prev.totalFeedback > 0 ? prev.sentimentBreakdown.positive / prev.totalFeedback : 0;
    const currPos = curr.totalFeedback > 0 ? curr.sentimentBreakdown.positive / curr.totalFeedback : 0;
    return currPos - prevPos > 0.05 ? 'improving' : prevPos - currPos > 0.05 ? 'declining' : 'stable';
  }
}

export const feedbackCollector = new FeedbackCollector();
export const vocAnalyzer = new VoCAnalyzer();
export const customerInsightManager = new CustomerInsightManager();
export const vocDashboardAggregator = new VoCDashboardAggregator();

export { CustomerFeedback, VoCInsight, CustomerInsight, VoCDashboardSnapshot };
