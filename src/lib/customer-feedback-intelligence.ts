/**
 * Phase 330: Customer Feedback Intelligence
 * Survey analytics, feedback categorization, sentiment trends, voice of customer
 */

import { logger } from './logger';

interface FeedbackRecord {
  feedbackId: string;
  customerId?: string;
  source: 'survey' | 'review' | 'support_ticket' | 'chat' | 'social' | 'interview' | 'nps';
  channel: string;
  rawText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;          // -1 to 1
  categories: string[];            // e.g. ['pricing', 'usability', 'support']
  primaryCategory: string;
  urgency: 'critical' | 'high' | 'normal' | 'low';
  productArea?: string;
  npsScore?: number;               // 0-10
  csatScore?: number;              // 1-5
  isActionable: boolean;
  assignedTeam?: string;
  status: 'new' | 'reviewed' | 'actioned' | 'closed';
  submittedAt: number;
  createdAt: number;
}

interface SurveyRecord {
  surveyId: string;
  surveyName: string;
  surveyType: 'nps' | 'csat' | 'ces' | 'product' | 'exit' | 'onboarding' | 'custom';
  targetSegment: string;
  responseCount: number;
  completionRatePct: number;
  avgNpsScore?: number;
  avgCsatScore?: number;
  avgCesScore?: number;            // Customer Effort Score (1-7, lower = better)
  npsCategory: 'excellent' | 'good' | 'needs_improvement' | 'poor';  // based on NPS
  promotersPct: number;            // NPS 9-10
  passivesPct: number;             // NPS 7-8
  detractorsPct: number;           // NPS 0-6
  topThemes: string[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  createdAt: number;
}

interface FeedbackThemeRecord {
  themeId: string;
  themeName: string;
  category: string;
  mentionCount: number;
  sentimentAvg: number;
  trendDirection: 'worsening' | 'stable' | 'improving';
  previousMentionCount: number;
  changePct: number;
  impactScore: number;             // weighted by frequency and urgency
  exampleQuotes: string[];
  affectedSegments: string[];
  recommendedAction: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  updatedAt: number;
}

interface VoiceOfCustomerRecord {
  vocId: string;
  period: string;
  totalFeedbackCount: number;
  overallSentimentScore: number;   // -1 to 1
  npsScore?: number;
  csatScore?: number;
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  criticalIssues: string[];
  emergingTrends: string[];
  segmentInsights: { segment: string; sentiment: number; topConcern: string }[];
  actionableInsightsCount: number;
  sentimentTrend: 'improving' | 'stable' | 'declining';
  generatedAt: number;
}

class FeedbackCollector {
  private feedbacks: FeedbackRecord[] = [];
  private counter = 0;

  submit(source: FeedbackRecord['source'], channel: string, rawText: string, sentimentScore: number, categories: string[], urgency: FeedbackRecord['urgency'], customerId?: string, npsScore?: number, csatScore?: number, productArea?: string): FeedbackRecord {
    const feedbackId = `fb-${Date.now()}-${++this.counter}`;
    const sentiment: FeedbackRecord['sentiment'] = sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral';
    const primaryCategory = categories[0] || 'general';
    const isActionable = urgency === 'critical' || urgency === 'high' || sentiment === 'negative';

    const record: FeedbackRecord = {
      feedbackId, customerId, source, channel, rawText, sentiment,
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
      categories, primaryCategory, urgency, productArea, npsScore, csatScore,
      isActionable, status: 'new', submittedAt: Date.now(), createdAt: Date.now()
    };
    this.feedbacks.push(record);
    logger.debug('Feedback submitted', { feedbackId, source, sentiment, urgency });
    return record;
  }

  markActioned(feedbackId: string, team: string): boolean {
    const fb = this.feedbacks.find(f => f.feedbackId === feedbackId);
    if (!fb) return false;
    fb.status = 'actioned';
    fb.assignedTeam = team;
    return true;
  }

  getCritical(): FeedbackRecord[] {
    return this.feedbacks.filter(f => f.urgency === 'critical' && f.status === 'new');
  }

  getByCategory(category: string): FeedbackRecord[] {
    return this.feedbacks.filter(f => f.categories.includes(category));
  }

  getSentimentAverage(): number {
    const all = this.feedbacks;
    return all.length > 0 ? Math.round(all.reduce((s, f) => s + f.sentimentScore, 0) / all.length * 100) / 100 : 0;
  }

  getAll(): FeedbackRecord[] {
    return [...this.feedbacks];
  }
}

class SurveyAnalyzer {
  private surveys: SurveyRecord[] = [];
  private counter = 0;

  analyze(name: string, type: SurveyRecord['surveyType'], segment: string, responses: { nps?: number; csat?: number; ces?: number; text: string; sentiment: number }[], completionRatePct: number): SurveyRecord {
    const surveyId = `survey-${Date.now()}-${++this.counter}`;
    const npsResponses = responses.filter(r => r.nps !== undefined);
    const csatResponses = responses.filter(r => r.csat !== undefined);
    const cesResponses = responses.filter(r => r.ces !== undefined);

    const avgNps = npsResponses.length > 0 ? Math.round(npsResponses.reduce((s, r) => s + (r.nps || 0), 0) / npsResponses.length * 10) / 10 : undefined;
    const avgCsat = csatResponses.length > 0 ? Math.round(csatResponses.reduce((s, r) => s + (r.csat || 0), 0) / csatResponses.length * 10) / 10 : undefined;
    const avgCes = cesResponses.length > 0 ? Math.round(cesResponses.reduce((s, r) => s + (r.ces || 0), 0) / cesResponses.length * 10) / 10 : undefined;

    const promoters = npsResponses.filter(r => (r.nps || 0) >= 9).length;
    const passives = npsResponses.filter(r => (r.nps || 0) >= 7 && (r.nps || 0) <= 8).length;
    const detractors = npsResponses.filter(r => (r.nps || 0) <= 6).length;
    const total = npsResponses.length || 1;

    const npsNetScore = avgNps !== undefined ? Math.round(promoters / total * 100) - Math.round(detractors / total * 100) : 0;
    const npsCategory: SurveyRecord['npsCategory'] =
      npsNetScore >= 50 ? 'excellent' : npsNetScore >= 20 ? 'good' : npsNetScore >= 0 ? 'needs_improvement' : 'poor';

    const posCount = responses.filter(r => r.sentiment > 0.2).length;
    const negCount = responses.filter(r => r.sentiment < -0.2).length;
    const n = responses.length || 1;

    const record: SurveyRecord = {
      surveyId, surveyName: name, surveyType: type, targetSegment: segment,
      responseCount: responses.length, completionRatePct,
      avgNpsScore: avgNps, avgCsatScore: avgCsat, avgCesScore: avgCes, npsCategory,
      promotersPct: Math.round((promoters / total) * 100 * 10) / 10,
      passivesPct: Math.round((passives / total) * 100 * 10) / 10,
      detractorsPct: Math.round((detractors / total) * 100 * 10) / 10,
      topThemes: [],
      sentimentBreakdown: {
        positive: Math.round((posCount / n) * 100 * 10) / 10,
        neutral: Math.round(((n - posCount - negCount) / n) * 100 * 10) / 10,
        negative: Math.round((negCount / n) * 100 * 10) / 10
      },
      createdAt: Date.now()
    };
    this.surveys.push(record);
    logger.debug('Survey analyzed', { surveyId, name, responseCount: responses.length, npsCategory });
    return record;
  }

  getLatest(): SurveyRecord | undefined {
    return this.surveys[this.surveys.length - 1];
  }

  getAll(): SurveyRecord[] {
    return [...this.surveys];
  }
}

class FeedbackThemeEngine {
  private themes: Map<string, FeedbackThemeRecord> = new Map();
  private counter = 0;

  upsert(themeName: string, category: string, feedbacks: FeedbackRecord[]): FeedbackThemeRecord {
    const existing = this.themes.get(themeName);
    const themeId = existing?.themeId || `theme-${Date.now()}-${++this.counter}`;
    const relevant = feedbacks.filter(f => f.categories.includes(category) || f.primaryCategory === category);
    const mentionCount = relevant.length;
    const sentimentAvg = mentionCount > 0 ? Math.round(relevant.reduce((s, f) => s + f.sentimentScore, 0) / mentionCount * 100) / 100 : 0;
    const prevCount = existing?.mentionCount || 0;
    const changePct = prevCount > 0 ? Math.round(((mentionCount - prevCount) / prevCount) * 100 * 10) / 10 : 0;
    const trend: FeedbackThemeRecord['trendDirection'] =
      changePct < -10 ? 'improving' : changePct > 10 ? 'worsening' : 'stable';
    const urgentCount = relevant.filter(f => f.urgency === 'critical' || f.urgency === 'high').length;
    const impactScore = Math.min(100, Math.round(mentionCount * 0.5 + urgentCount * 5 + Math.abs(sentimentAvg) * 20));
    const priority: FeedbackThemeRecord['priority'] = impactScore >= 75 ? 'urgent' : impactScore >= 50 ? 'high' : impactScore >= 25 ? 'medium' : 'low';
    const exampleQuotes = relevant.slice(0, 3).map(f => f.rawText.substring(0, 100));
    const segments = [...new Set(relevant.map(f => f.channel))].slice(0, 3);

    const record: FeedbackThemeRecord = {
      themeId, themeName, category, mentionCount, sentimentAvg,
      trendDirection: trend, previousMentionCount: prevCount, changePct,
      impactScore, exampleQuotes, affectedSegments: segments,
      recommendedAction: impactScore >= 75 ? `Escalate ${themeName} to product team immediately` : `Review ${themeName} feedback in next sprint`,
      priority, updatedAt: Date.now()
    };
    this.themes.set(themeName, record);
    return record;
  }

  getTopThemes(limit = 5): FeedbackThemeRecord[] {
    return Array.from(this.themes.values()).sort((a, b) => b.impactScore - a.impactScore).slice(0, limit);
  }

  getWorsening(): FeedbackThemeRecord[] {
    return Array.from(this.themes.values()).filter(t => t.trendDirection === 'worsening');
  }
}

class VoiceOfCustomerEngine {
  private vocs: VoiceOfCustomerRecord[] = [];
  private counter = 0;

  generate(period: string, feedbacks: FeedbackRecord[], surveys: SurveyRecord[], themes: FeedbackThemeRecord[]): VoiceOfCustomerRecord {
    const vocId = `voc-${Date.now()}-${++this.counter}`;
    const totalCount = feedbacks.length;
    const overallSentiment = totalCount > 0 ? Math.round(feedbacks.reduce((s, f) => s + f.sentimentScore, 0) / totalCount * 100) / 100 : 0;

    const latestSurvey = surveys[surveys.length - 1];
    const posThemes = themes.filter(t => t.sentimentAvg > 0.2).sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 3).map(t => t.themeName);
    const negThemes = themes.filter(t => t.sentimentAvg < -0.2).sort((a, b) => b.impactScore - a.impactScore).slice(0, 3).map(t => t.themeName);
    const critical = feedbacks.filter(f => f.urgency === 'critical').map(f => f.primaryCategory).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    const emerging = themes.filter(t => t.changePct > 20).map(t => t.themeName).slice(0, 3);
    const actionableCount = feedbacks.filter(f => f.isActionable).length;

    const prev = this.vocs[this.vocs.length - 1];
    const sentimentTrend: VoiceOfCustomerRecord['sentimentTrend'] = prev
      ? (overallSentiment > prev.overallSentimentScore + 0.05 ? 'improving' : overallSentiment < prev.overallSentimentScore - 0.05 ? 'declining' : 'stable')
      : 'stable';

    const record: VoiceOfCustomerRecord = {
      vocId, period, totalFeedbackCount: totalCount, overallSentimentScore: overallSentiment,
      npsScore: latestSurvey?.avgNpsScore, csatScore: latestSurvey?.avgCsatScore,
      topPositiveThemes: posThemes, topNegativeThemes: negThemes,
      criticalIssues: critical, emergingTrends: emerging,
      segmentInsights: [], actionableInsightsCount: actionableCount,
      sentimentTrend, generatedAt: Date.now()
    };
    this.vocs.push(record);
    logger.debug('VoC generated', { vocId, period, overallSentiment, sentimentTrend });
    return record;
  }

  getLatest(): VoiceOfCustomerRecord | undefined {
    return this.vocs[this.vocs.length - 1];
  }
}

export const feedbackCollector = new FeedbackCollector();
export const surveyAnalyzer = new SurveyAnalyzer();
export const feedbackThemeEngine = new FeedbackThemeEngine();
export const voiceOfCustomerEngine = new VoiceOfCustomerEngine();

export { FeedbackRecord, SurveyRecord, FeedbackThemeRecord, VoiceOfCustomerRecord };
