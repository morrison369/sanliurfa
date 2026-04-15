/**
 * Phase 309: Service Knowledge Intelligence
 * KB article effectiveness, search gap analysis, knowledge contribution tracking, ROI
 */

import { logger } from './logger';

interface KBArticleRecord {
  articleId: string;
  title: string;
  category: string;
  subcategory: string;
  authorId: string;
  authorName: string;
  wordCount: number;
  tags: string[];
  publishedAt: number;
  lastUpdatedAt: number;
  viewCount: number;
  uniqueViewerCount: number;
  avgTimeOnPageSeconds: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  helpfulnessPct: number;
  searchAppearances: number;
  clickThroughRatePct: number;
  deflectionCount: number;
  linkedTicketCount: number;
  outdatedRisk: boolean;
  effectivenessScore: number;
  status: 'draft' | 'published' | 'under_review' | 'deprecated';
  createdAt: number;
}

interface SearchGapRecord {
  recordId: string;
  period: string;
  totalSearches: number;
  searchesWithResults: number;
  searchesWithNoResults: number;
  zeroResultRatePct: number;
  topSearchTerms: { term: string; count: number; hasResult: boolean }[];
  gapSearchTerms: { term: string; count: number }[];
  searchToDeflectionRatePct: number;
  calculatedAt: number;
}

interface KBGapRecord {
  gapId: string;
  topicArea: string;
  searchVolume: number;
  ticketVolume: number;
  estimatedDeflectionPotential: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedArticleTitle: string;
  estimatedCreationHours: number;
  estimatedROI: number;
  status: 'identified' | 'in_creation' | 'published' | 'rejected';
  identifiedAt: number;
}

interface KBContributionRecord {
  recordId: string;
  period: string;
  authorId: string;
  authorName: string;
  department: string;
  articlesCreated: number;
  articlesUpdated: number;
  totalViews: number;
  totalDeflections: number;
  avgEffectivenessScore: number;
  contributionScore: number;
  recordedAt: number;
}

class KBArticleManager {
  private articles: Map<string, KBArticleRecord> = new Map();
  private counter = 0;

  publish(title: string, category: string, subcategory: string, authorId: string, authorName: string, wordCount: number, tags: string[]): KBArticleRecord {
    const articleId = `kba-${Date.now()}-${++this.counter}`;
    const record: KBArticleRecord = {
      articleId, title, category, subcategory, authorId, authorName, wordCount, tags,
      publishedAt: Date.now(), lastUpdatedAt: Date.now(),
      viewCount: 0, uniqueViewerCount: 0, avgTimeOnPageSeconds: 0,
      helpfulVotes: 0, unhelpfulVotes: 0, helpfulnessPct: 0,
      searchAppearances: 0, clickThroughRatePct: 0, deflectionCount: 0,
      linkedTicketCount: 0, outdatedRisk: false, effectivenessScore: 50,
      status: 'published', createdAt: Date.now()
    };
    this.articles.set(articleId, record);
    logger.debug('KB article published', { articleId, title, category });
    return record;
  }

  recordEngagement(articleId: string, views: number, uniqueViewers: number, avgTimeSeconds: number, helpful: number, unhelpful: number, deflections: number, searchApps: number, ctr: number): boolean {
    const a = this.articles.get(articleId);
    if (!a) return false;
    a.viewCount += views;
    a.uniqueViewerCount += uniqueViewers;
    a.avgTimeOnPageSeconds = avgTimeSeconds;
    a.helpfulVotes += helpful;
    a.unhelpfulVotes += unhelpful;
    const totalVotes = a.helpfulVotes + a.unhelpfulVotes;
    a.helpfulnessPct = totalVotes > 0 ? Math.round((a.helpfulVotes / totalVotes) * 100) : 0;
    a.deflectionCount += deflections;
    a.searchAppearances += searchApps;
    a.clickThroughRatePct = ctr;
    a.outdatedRisk = (Date.now() - a.lastUpdatedAt) / 86400000 > 180;
    a.effectivenessScore = Math.round(
      a.helpfulnessPct * 0.35 + Math.min(100, a.deflectionCount * 5) * 0.3 +
      Math.min(100, ctr * 3) * 0.2 + Math.min(100, avgTimeSeconds / 2) * 0.15
    );
    return true;
  }

  getOutdatedArticles(): KBArticleRecord[] {
    return Array.from(this.articles.values()).filter(a => a.outdatedRisk && a.status === 'published');
  }

  getTopEffectiveArticles(limit = 5): KBArticleRecord[] {
    return Array.from(this.articles.values())
      .filter(a => a.status === 'published')
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, limit);
  }

  getTotalDeflections(): number {
    return Array.from(this.articles.values()).reduce((s, a) => s + a.deflectionCount, 0);
  }

  getArticle(id: string): KBArticleRecord | undefined {
    return this.articles.get(id);
  }
}

class SearchGapAnalyzer {
  private records: SearchGapRecord[] = [];
  private counter = 0;

  analyze(period: string, total: number, withResults: number, topTerms: { term: string; count: number; hasResult: boolean }[]): SearchGapRecord {
    const noResults = total - withResults;
    const gapTerms = topTerms.filter(t => !t.hasResult).map(({ term, count }) => ({ term, count }));
    const recordId = `srchgap-${Date.now()}-${++this.counter}`;
    const record: SearchGapRecord = {
      recordId, period, totalSearches: total, searchesWithResults: withResults,
      searchesWithNoResults: noResults,
      zeroResultRatePct: total > 0 ? Math.round((noResults / total) * 100 * 10) / 10 : 0,
      topSearchTerms: topTerms.sort((a, b) => b.count - a.count).slice(0, 10),
      gapSearchTerms: gapTerms.slice(0, 10),
      searchToDeflectionRatePct: total > 0 ? Math.round((withResults * 0.3 / total) * 100) : 0,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Search gap analyzed', { period, zeroResultRate: record.zeroResultRatePct });
    return record;
  }

  getLatest(): SearchGapRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getZeroResultTrend(): number[] {
    return this.records.map(r => r.zeroResultRatePct);
  }
}

class KBGapAnalyzer {
  private gaps: KBGapRecord[] = [];
  private counter = 0;

  identify(topic: string, searchVol: number, ticketVol: number, avgTicketCostUSD: number, creationHours: number): KBGapRecord {
    const deflectionPotential = Math.min(ticketVol, searchVol * 0.3);
    const estimatedROI = deflectionPotential * avgTicketCostUSD;
    const priority: KBGapRecord['priority'] =
      estimatedROI >= 50000 ? 'critical' :
      estimatedROI >= 20000 ? 'high' :
      estimatedROI >= 5000 ? 'medium' : 'low';

    const gapId = `kbgap-${Date.now()}-${++this.counter}`;
    const record: KBGapRecord = {
      gapId, topicArea: topic, searchVolume: searchVol, ticketVolume: ticketVol,
      estimatedDeflectionPotential: Math.round(deflectionPotential), priority,
      suggestedArticleTitle: `How to: ${topic}`, estimatedCreationHours: creationHours,
      estimatedROI: Math.round(estimatedROI), status: 'identified',
      identifiedAt: Date.now()
    };
    this.gaps.push(record);
    return record;
  }

  getCriticalGaps(): KBGapRecord[] {
    return this.gaps.filter(g => g.priority === 'critical' || g.priority === 'high')
      .sort((a, b) => b.estimatedROI - a.estimatedROI);
  }

  getTotalROIPotential(): number {
    return this.gaps.filter(g => g.status === 'identified').reduce((s, g) => s + g.estimatedROI, 0);
  }
}

class KBContributionTracker {
  private records: KBContributionRecord[] = [];
  private counter = 0;

  track(period: string, authorId: string, authorName: string, department: string, created: number, updated: number, views: number, deflections: number, avgEffectiveness: number): KBContributionRecord {
    const contributionScore = created * 30 + updated * 10 + Math.min(50, deflections / 2);
    const recordId = `kbcontrib-${Date.now()}-${++this.counter}`;
    const record: KBContributionRecord = {
      recordId, period, authorId, authorName, department,
      articlesCreated: created, articlesUpdated: updated, totalViews: views,
      totalDeflections: deflections, avgEffectivenessScore: avgEffectiveness,
      contributionScore: Math.round(contributionScore), recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopContributors(period: string, limit = 5): KBContributionRecord[] {
    return this.records.filter(r => r.period === period)
      .sort((a, b) => b.contributionScore - a.contributionScore)
      .slice(0, limit);
  }

  getTotalDeflectionsByPeriod(period: string): number {
    return this.records.filter(r => r.period === period).reduce((s, r) => s + r.totalDeflections, 0);
  }
}

export const kbArticleManager = new KBArticleManager();
export const searchGapAnalyzer = new SearchGapAnalyzer();
export const kbGapAnalyzer = new KBGapAnalyzer();
export const kbContributionTracker = new KBContributionTracker();

export { KBArticleRecord, SearchGapRecord, KBGapRecord, KBContributionRecord };
