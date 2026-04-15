/**
 * Phase 202: NPS & Satisfaction
 * NPS survey management, satisfaction score tracking, feedback categorization, trend analysis
 */

import { logger } from './logger';

interface NPSSurvey {
  surveyId: string;
  userId: string;
  score: number; // 0-10
  category: 'promoter' | 'passive' | 'detractor';
  comment: string;
  segment: string;
  triggeredBy: string;
  respondedAt: number;
}

interface SatisfactionScore {
  scoreId: string;
  userId: string;
  metric: 'csat' | 'ces' | 'product_rating';
  score: number;
  maxScore: number;
  normalizedScore: number; // 0-100
  context: string;
  recordedAt: number;
}

interface FeedbackCategory {
  categoryId: string;
  name: string;
  keywords: string[];
  sentimentBias: 'positive' | 'negative' | 'neutral';
  count: number;
  avgNPS: number;
}

interface NPSTrendPoint {
  period: string;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
  npsScore: number; // promoters% - detractors%
}

class NPSSurveyManager {
  private surveys: NPSSurvey[] = [];
  private counter = 0;

  record(userId: string, score: number, comment = '', segment = 'general', triggeredBy = 'periodic'): NPSSurvey {
    const clampedScore = Math.max(0, Math.min(10, Math.round(score)));
    const category: NPSSurvey['category'] = clampedScore >= 9 ? 'promoter' : clampedScore >= 7 ? 'passive' : 'detractor';
    const survey: NPSSurvey = {
      surveyId: `nps-${Date.now()}-${++this.counter}`,
      userId, score: clampedScore, category, comment, segment, triggeredBy,
      respondedAt: Date.now()
    };
    this.surveys.push(survey);
    logger.debug('NPS response recorded', { userId, score: clampedScore, category });
    return survey;
  }

  calculateNPS(segment?: string): number {
    const filtered = segment ? this.surveys.filter(s => s.segment === segment) : this.surveys;
    if (!filtered.length) return 0;
    const promoters = filtered.filter(s => s.category === 'promoter').length;
    const detractors = filtered.filter(s => s.category === 'detractor').length;
    return Math.round(((promoters - detractors) / filtered.length) * 100);
  }

  getDistribution(): Record<NPSSurvey['category'], number> {
    const dist = { promoter: 0, passive: 0, detractor: 0 };
    for (const s of this.surveys) dist[s.category]++;
    return dist;
  }

  getRecentComments(category?: NPSSurvey['category'], limit = 10): NPSSurvey[] {
    return this.surveys
      .filter(s => !category || s.category === category)
      .sort((a, b) => b.respondedAt - a.respondedAt)
      .slice(0, limit);
  }

  getResponseCount(): number {
    return this.surveys.length;
  }
}

class SatisfactionScoreTracker {
  private scores: SatisfactionScore[] = [];
  private counter = 0;

  record(userId: string, metric: SatisfactionScore['metric'], score: number, maxScore: number, context = ''): SatisfactionScore {
    const record: SatisfactionScore = {
      scoreId: `sat-${Date.now()}-${++this.counter}`,
      userId, metric, score, maxScore,
      normalizedScore: maxScore > 0 ? (score / maxScore) * 100 : 0,
      context, recordedAt: Date.now()
    };
    this.scores.push(record);
    return record;
  }

  getAvgScore(metric: SatisfactionScore['metric']): number {
    const filtered = this.scores.filter(s => s.metric === metric);
    if (!filtered.length) return 0;
    return filtered.reduce((sum, s) => sum + s.normalizedScore, 0) / filtered.length;
  }

  getCSAT(): number {
    const csat = this.scores.filter(s => s.metric === 'csat');
    if (!csat.length) return 0;
    const satisfied = csat.filter(s => s.normalizedScore >= 80).length;
    return (satisfied / csat.length) * 100;
  }

  getUserSatisfaction(userId: string): Record<SatisfactionScore['metric'], number> {
    const userScores = this.scores.filter(s => s.userId === userId);
    const result: Record<string, number> = {};
    for (const metric of ['csat', 'ces', 'product_rating'] as SatisfactionScore['metric'][]) {
      const metricScores = userScores.filter(s => s.metric === metric);
      result[metric] = metricScores.length ? metricScores.reduce((s, r) => s + r.normalizedScore, 0) / metricScores.length : 0;
    }
    return result as Record<SatisfactionScore['metric'], number>;
  }
}

class FeedbackCategorizor {
  private categories: Map<string, FeedbackCategory> = new Map();
  private counter = 0;

  defineCategory(name: string, keywords: string[], sentimentBias: FeedbackCategory['sentimentBias']): FeedbackCategory {
    const categoryId = `cat-${Date.now()}-${++this.counter}`;
    const category: FeedbackCategory = { categoryId, name, keywords, sentimentBias, count: 0, avgNPS: 0 };
    this.categories.set(name, category);
    return category;
  }

  categorize(comment: string, npsScore: number): string[] {
    const lower = comment.toLowerCase();
    const matched: string[] = [];
    for (const [name, cat] of this.categories.entries()) {
      if (cat.keywords.some(k => lower.includes(k.toLowerCase()))) {
        matched.push(name);
        const total = cat.count * cat.avgNPS + npsScore;
        cat.count++;
        cat.avgNPS = total / cat.count;
      }
    }
    return matched;
  }

  getTopCategories(limit = 5): FeedbackCategory[] {
    return Array.from(this.categories.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getNegativeCategories(): FeedbackCategory[] {
    return Array.from(this.categories.values())
      .filter(c => c.sentimentBias === 'negative' && c.count > 0)
      .sort((a, b) => b.count - a.count);
  }
}

class NPSTrendAnalyzer {
  private trends: NPSTrendPoint[] = [];

  record(period: string, surveys: NPSSurvey[]): NPSTrendPoint {
    const promoters = surveys.filter(s => s.category === 'promoter').length;
    const passives = surveys.filter(s => s.category === 'passive').length;
    const detractors = surveys.filter(s => s.category === 'detractor').length;
    const total = surveys.length;
    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const point: NPSTrendPoint = { period, promoters, passives, detractors, totalResponses: total, npsScore };
    const idx = this.trends.findIndex(t => t.period === period);
    if (idx >= 0) this.trends[idx] = point; else this.trends.push(point);
    logger.debug('NPS trend recorded', { period, npsScore, totalResponses: total });
    return point;
  }

  getTrend(): 'improving' | 'declining' | 'stable' {
    if (this.trends.length < 2) return 'stable';
    const prev = this.trends[this.trends.length - 2].npsScore;
    const curr = this.trends[this.trends.length - 1].npsScore;
    return curr - prev > 3 ? 'improving' : prev - curr > 3 ? 'declining' : 'stable';
  }

  getBenchmarkComparison(industryBenchmark: number): 'above' | 'below' | 'at' {
    const latest = this.trends[this.trends.length - 1];
    if (!latest) return 'below';
    const diff = latest.npsScore - industryBenchmark;
    return diff > 5 ? 'above' : diff < -5 ? 'below' : 'at';
  }

  getTrendPoints(): NPSTrendPoint[] {
    return this.trends;
  }
}

export const npsSurveyManager = new NPSSurveyManager();
export const satisfactionScoreTracker = new SatisfactionScoreTracker();
export const feedbackCategorizor = new FeedbackCategorizor();
export const npsTrendAnalyzer = new NPSTrendAnalyzer();

export { NPSSurvey, SatisfactionScore, FeedbackCategory, NPSTrendPoint };
