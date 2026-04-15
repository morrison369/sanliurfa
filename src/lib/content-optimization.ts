/**
 * Phase 176: Content Optimization
 * Content scoring, recommendation, performance tracking, optimization suggestions
 */

import { logger } from './logger';

interface ContentScore {
  contentId: string;
  relevanceScore: number;
  engagementScore: number;
  freshnessScore: number;
  qualityScore: number;
  overallScore: number;
  scoredAt: number;
}

interface ContentPerformance {
  contentId: string;
  views: number;
  clicks: number;
  timeOnPageMs: number;
  shares: number;
  ctr: number;
  engagementRate: number;
  updatedAt: number;
}

interface OptimizationSuggestion {
  suggestionId: string;
  contentId: string;
  type: 'title' | 'cta' | 'image' | 'layout' | 'timing' | 'targeting';
  description: string;
  expectedImpact: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

class ContentScorer {
  private scores: Map<string, ContentScore> = new Map();

  score(contentId: string, relevance: number, freshnessDaysOld: number, wordCount: number, hasMedia: boolean): ContentScore {
    const freshnessScore = Math.max(0, 100 - freshnessDaysOld * 2);
    const qualityScore = Math.min(100, (wordCount / 5) + (hasMedia ? 20 : 0));
    const engagementScore = (relevance * 0.6 + qualityScore * 0.4);
    const overallScore = (relevance * 0.35 + engagementScore * 0.3 + freshnessScore * 0.2 + qualityScore * 0.15);

    const contentScore: ContentScore = {
      contentId,
      relevanceScore: relevance,
      engagementScore,
      freshnessScore,
      qualityScore,
      overallScore,
      scoredAt: Date.now()
    };

    this.scores.set(contentId, contentScore);
    logger.debug('Content scored', { contentId, overallScore: overallScore.toFixed(1) });
    return contentScore;
  }

  getScore(contentId: string): ContentScore | undefined {
    return this.scores.get(contentId);
  }

  getTopContent(limit: number): ContentScore[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  compareScores(contentIdA: string, contentIdB: string): { winner: string; margin: number } {
    const a = this.scores.get(contentIdA);
    const b = this.scores.get(contentIdB);
    if (!a || !b) return { winner: contentIdA, margin: 0 };
    return {
      winner: a.overallScore >= b.overallScore ? contentIdA : contentIdB,
      margin: Math.abs(a.overallScore - b.overallScore)
    };
  }
}

class ContentRecommender {
  recommend(userId: string, userSegments: string[], contentScores: ContentScore[], limit: number): ContentScore[] {
    // Boost scores for content matching user segments — simplified collaborative filter
    const boosted = contentScores.map(cs => ({
      ...cs,
      overallScore: cs.overallScore + (Math.random() * 10) // Simulate segment affinity
    }));

    const recs = boosted
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);

    logger.debug('Content recommended', { userId, count: recs.length });
    return recs;
  }

  getSimilarContent(contentId: string, allScores: ContentScore[], limit: number): ContentScore[] {
    const target = allScores.find(cs => cs.contentId === contentId);
    if (!target) return [];

    return allScores
      .filter(cs => cs.contentId !== contentId)
      .map(cs => ({
        ...cs,
        similarity: 1 - Math.abs(cs.overallScore - target.overallScore) / 100
      }))
      .sort((a, b) => (b as any).similarity - (a as any).similarity)
      .slice(0, limit);
  }
}

class ContentPerformanceTracker {
  private performances: Map<string, ContentPerformance> = new Map();

  recordImpression(contentId: string): void {
    const perf = this.getOrCreate(contentId);
    perf.views++;
    perf.updatedAt = Date.now();
  }

  recordClick(contentId: string): void {
    const perf = this.getOrCreate(contentId);
    perf.clicks++;
    perf.ctr = perf.views > 0 ? (perf.clicks / perf.views) * 100 : 0;
    perf.updatedAt = Date.now();
  }

  recordTimeOnPage(contentId: string, timeMs: number): void {
    const perf = this.getOrCreate(contentId);
    perf.timeOnPageMs = perf.views > 1
      ? (perf.timeOnPageMs * (perf.views - 1) + timeMs) / perf.views
      : timeMs;
    perf.updatedAt = Date.now();
  }

  recordShare(contentId: string): void {
    const perf = this.getOrCreate(contentId);
    perf.shares++;
    perf.engagementRate = perf.views > 0 ? ((perf.clicks + perf.shares) / perf.views) * 100 : 0;
    perf.updatedAt = Date.now();
  }

  private getOrCreate(contentId: string): ContentPerformance {
    if (!this.performances.has(contentId)) {
      this.performances.set(contentId, {
        contentId, views: 0, clicks: 0, timeOnPageMs: 0,
        shares: 0, ctr: 0, engagementRate: 0, updatedAt: Date.now()
      });
    }
    return this.performances.get(contentId)!;
  }

  getPerformance(contentId: string): ContentPerformance | undefined {
    return this.performances.get(contentId);
  }

  getTopPerforming(metric: keyof ContentPerformance, limit: number): ContentPerformance[] {
    return Array.from(this.performances.values())
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .slice(0, limit);
  }
}

class ContentOptimizationSuggester {
  private suggestions: Map<string, OptimizationSuggestion[]> = new Map();
  private counter = 0;

  generateSuggestions(contentId: string, performance: ContentPerformance): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (performance.ctr < 2) {
      suggestions.push(this.createSuggestion(contentId, 'title', 'CTR below 2% — test stronger headline', 'Increase CTR by 20-40%', 'high'));
    }
    if (performance.timeOnPageMs < 30000) {
      suggestions.push(this.createSuggestion(contentId, 'layout', 'Low time-on-page — improve content structure', 'Increase engagement by 15-25%', 'medium'));
    }
    if (performance.shares < 5) {
      suggestions.push(this.createSuggestion(contentId, 'cta', 'Few shares — add social sharing prompt', 'Increase viral reach by 10%', 'low'));
    }

    const existing = this.suggestions.get(contentId) || [];
    this.suggestions.set(contentId, [...existing, ...suggestions]);

    return suggestions;
  }

  private createSuggestion(contentId: string, type: OptimizationSuggestion['type'], description: string, expectedImpact: string, priority: OptimizationSuggestion['priority']): OptimizationSuggestion {
    return {
      suggestionId: `suggestion-${Date.now()}-${++this.counter}`,
      contentId, type, description, expectedImpact, priority, createdAt: Date.now()
    };
  }

  getSuggestions(contentId: string): OptimizationSuggestion[] {
    return this.suggestions.get(contentId) || [];
  }

  getHighPrioritySuggestions(): OptimizationSuggestion[] {
    return Array.from(this.suggestions.values()).flat().filter(s => s.priority === 'high');
  }
}

export const contentScorer = new ContentScorer();
export const contentRecommender = new ContentRecommender();
export const contentPerformanceTracker = new ContentPerformanceTracker();
export const contentOptimizationSuggester = new ContentOptimizationSuggester();

export { ContentScore, ContentPerformance, OptimizationSuggestion };
