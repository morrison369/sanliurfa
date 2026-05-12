/**
 * Unit Tests — content-optimization.ts singleton class managers
 *
 * - ContentScorer (composite formula: relevance + engagement + freshness + quality)
 * - ContentRecommender (segment boost + similarity scoring)
 * - ContentPerformanceTracker (impression/click/timeOnPage/share aggregation)
 * - ContentOptimizationSuggester (CTR/timeOnPage/shares threshold suggestions)
 */

import { describe, it, expect } from 'vitest';
import {
  contentScorer,
  contentRecommender,
  contentPerformanceTracker,
  contentOptimizationSuggester,
} from '../content-optimization';

describe('ContentScorer', () => {
  it('score — composite formula returns ContentScore', () => {
    const s = contentScorer.score('cs-1', 80, 10, 500, true);
    // freshness = 100 - 10*2 = 80
    // quality = min(100, 500/5 + 20) = 120 → 100
    // engagement = 80*0.6 + 100*0.4 = 88
    // overall = 80*0.35 + 88*0.3 + 80*0.2 + 100*0.15 = 28 + 26.4 + 16 + 15 = 85.4
    expect(s.contentId).toBe('cs-1');
    expect(s.relevanceScore).toBe(80);
    expect(s.freshnessScore).toBe(80);
    expect(s.qualityScore).toBe(100);
    expect(s.engagementScore).toBeCloseTo(88, 1);
    expect(s.overallScore).toBeCloseTo(85.4, 1);
  });

  it('score — freshnessScore floor 0 (eski içerik)', () => {
    const s = contentScorer.score('cs-old', 80, 100, 500, true);
    // freshness = max(0, 100 - 100*2) = max(0, -100) = 0
    expect(s.freshnessScore).toBe(0);
  });

  it('score — quality cap 100', () => {
    const s = contentScorer.score('cs-quality-cap', 50, 0, 10000, true);
    // quality = min(100, 10000/5 + 20) = min(100, 2020) = 100
    expect(s.qualityScore).toBe(100);
  });

  it('score — hasMedia=false → quality -20', () => {
    const s1 = contentScorer.score('cs-media-1', 50, 0, 100, true);
    const s2 = contentScorer.score('cs-media-2', 50, 0, 100, false);
    expect(s1.qualityScore).toBe(s2.qualityScore + 20);
  });

  it('getScore — bilinmeyen → undefined', () => {
    expect(contentScorer.getScore('non-existent')).toBeUndefined();
  });

  it('getTopContent — overallScore desc + limit', () => {
    contentScorer.score('cs-top-1', 95, 0, 1000, true);
    contentScorer.score('cs-top-2', 50, 50, 200, false);
    const top = contentScorer.getTopContent(20);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].overallScore).toBeGreaterThanOrEqual(top[i].overallScore);
    }
  });

  it('compareScores — winner + margin', () => {
    contentScorer.score('cs-cmp-A', 90, 0, 500, true);
    contentScorer.score('cs-cmp-B', 30, 50, 100, false);
    const result = contentScorer.compareScores('cs-cmp-A', 'cs-cmp-B');
    expect(result.winner).toBe('cs-cmp-A');
    expect(result.margin).toBeGreaterThan(0);
  });

  it('compareScores — eksik content → ilk argument winner default + margin 0', () => {
    const result = contentScorer.compareScores('non-existent', 'also-non-existent');
    expect(result.winner).toBe('non-existent');
    expect(result.margin).toBe(0);
  });
});

describe('ContentRecommender', () => {
  it('recommend — limit kadar item döner, score desc sıralı', () => {
    const scores: any[] = [
      { contentId: 'rec-1', overallScore: 50 },
      { contentId: 'rec-2', overallScore: 70 },
      { contentId: 'rec-3', overallScore: 30 },
    ];
    const recs = contentRecommender.recommend('user-1', [], scores, 2);
    expect(recs).toHaveLength(2);
    // Random boost var ama desc sıralı garantili
    expect(recs[0].overallScore).toBeGreaterThanOrEqual(recs[1].overallScore);
  });

  it('recommend — boş contentScores → boş array', () => {
    expect(contentRecommender.recommend('user-1', [], [], 10)).toEqual([]);
  });

  it('getSimilarContent — target hariç + similarity desc + limit', () => {
    const scores: any[] = [
      { contentId: 'sim-target', overallScore: 60 },
      { contentId: 'sim-1', overallScore: 65 },
      { contentId: 'sim-2', overallScore: 30 },
      { contentId: 'sim-3', overallScore: 90 },
    ];
    const similar = contentRecommender.getSimilarContent('sim-target', scores, 2);
    expect(similar).toHaveLength(2);
    // sim-target hariç tutulmalı
    expect(similar.every((s) => s.contentId !== 'sim-target')).toBe(true);
    // sim-1 (65) target (60)'a yakın → en üstte beklenir
    expect(similar[0].contentId).toBe('sim-1');
  });

  it('getSimilarContent — target yok → boş array', () => {
    const scores: any[] = [{ contentId: 'sim-x', overallScore: 60 }];
    expect(contentRecommender.getSimilarContent('non-existent', scores, 5)).toEqual([]);
  });
});

describe('ContentPerformanceTracker', () => {
  it('recordImpression — views++ (lazy create perf)', () => {
    contentPerformanceTracker.recordImpression('cp-imp-1');
    contentPerformanceTracker.recordImpression('cp-imp-1');
    expect(contentPerformanceTracker.getPerformance('cp-imp-1')?.views).toBe(2);
  });

  it('recordClick — clicks++ + ctr update', () => {
    contentPerformanceTracker.recordImpression('cp-click-1');
    contentPerformanceTracker.recordImpression('cp-click-1');
    contentPerformanceTracker.recordImpression('cp-click-1');
    contentPerformanceTracker.recordImpression('cp-click-1');
    contentPerformanceTracker.recordClick('cp-click-1');
    const perf = contentPerformanceTracker.getPerformance('cp-click-1');
    expect(perf?.clicks).toBe(1);
    expect(perf?.ctr).toBe(25); // 1/4*100
  });

  it('recordTimeOnPage — running average', () => {
    contentPerformanceTracker.recordImpression('cp-time-1');
    contentPerformanceTracker.recordTimeOnPage('cp-time-1', 1000);
    expect(contentPerformanceTracker.getPerformance('cp-time-1')?.timeOnPageMs).toBe(1000);
  });

  it('recordShare — shares++ + engagementRate update', () => {
    contentPerformanceTracker.recordImpression('cp-share-1');
    contentPerformanceTracker.recordImpression('cp-share-1');
    contentPerformanceTracker.recordClick('cp-share-1');
    contentPerformanceTracker.recordShare('cp-share-1');
    const perf = contentPerformanceTracker.getPerformance('cp-share-1');
    expect(perf?.shares).toBe(1);
    expect(perf?.engagementRate).toBe(100); // (1+1)/2*100
  });

  it('getPerformance — bilinmeyen → undefined', () => {
    expect(contentPerformanceTracker.getPerformance('non-existent')).toBeUndefined();
  });

  it('getTopPerforming — metric desc sıralı + limit', () => {
    for (let i = 0; i < 5; i++) {
      const ID = `cp-top-${i}-${Date.now()}`;
      for (let j = 0; j < i + 1; j++) {
        contentPerformanceTracker.recordImpression(ID);
      }
    }
    const top = contentPerformanceTracker.getTopPerforming('views', 3);
    expect(top).toHaveLength(3);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].views).toBeGreaterThanOrEqual(top[i].views);
    }
  });
});

describe('ContentOptimizationSuggester', () => {
  it('generateSuggestions — düşük CTR → "title" suggestion (high priority)', () => {
    const perf: any = { contentId: 'opt-1', views: 100, clicks: 1, timeOnPageMs: 60000, shares: 10, ctr: 1, engagementRate: 1, updatedAt: Date.now() };
    const suggestions = contentOptimizationSuggester.generateSuggestions('opt-1', perf);
    const titleSuggestion = suggestions.find((s) => s.type === 'title');
    expect(titleSuggestion).toBeDefined();
    expect(titleSuggestion?.priority).toBe('high');
  });

  it('generateSuggestions — düşük timeOnPage (< 30s) → "layout" suggestion', () => {
    const perf: any = { contentId: 'opt-2', views: 100, clicks: 5, timeOnPageMs: 10000, shares: 10, ctr: 5, engagementRate: 15, updatedAt: Date.now() };
    const suggestions = contentOptimizationSuggester.generateSuggestions('opt-2', perf);
    expect(suggestions.some((s) => s.type === 'layout')).toBe(true);
  });

  it('generateSuggestions — az share → "cta" suggestion (low priority)', () => {
    const perf: any = { contentId: 'opt-3', views: 100, clicks: 5, timeOnPageMs: 60000, shares: 2, ctr: 5, engagementRate: 7, updatedAt: Date.now() };
    const suggestions = contentOptimizationSuggester.generateSuggestions('opt-3', perf);
    const ctaSuggestion = suggestions.find((s) => s.type === 'cta');
    expect(ctaSuggestion).toBeDefined();
    expect(ctaSuggestion?.priority).toBe('low');
  });

  it('generateSuggestions — sağlıklı performans → boş suggestions', () => {
    const perf: any = { contentId: 'opt-good', views: 100, clicks: 10, timeOnPageMs: 60000, shares: 10, ctr: 10, engagementRate: 20, updatedAt: Date.now() };
    expect(contentOptimizationSuggester.generateSuggestions('opt-good', perf)).toEqual([]);
  });

  it('generateSuggestions — multiple problems → multiple suggestions', () => {
    const perf: any = { contentId: 'opt-multi', views: 100, clicks: 1, timeOnPageMs: 10000, shares: 2, ctr: 1, engagementRate: 3, updatedAt: Date.now() };
    const suggestions = contentOptimizationSuggester.generateSuggestions('opt-multi', perf);
    expect(suggestions).toHaveLength(3); // title + layout + cta
  });

  it('getSuggestions — append edilir (multiple call → cumulative)', () => {
    const perf: any = { contentId: 'opt-cumul', views: 100, clicks: 1, timeOnPageMs: 60000, shares: 10, ctr: 1, engagementRate: 1, updatedAt: Date.now() };
    contentOptimizationSuggester.generateSuggestions('opt-cumul', perf);
    contentOptimizationSuggester.generateSuggestions('opt-cumul', perf);
    expect(contentOptimizationSuggester.getSuggestions('opt-cumul').length).toBeGreaterThanOrEqual(2);
  });

  it('getSuggestions — bilinmeyen → boş', () => {
    expect(contentOptimizationSuggester.getSuggestions('non-existent')).toEqual([]);
  });

  it('getHighPrioritySuggestions — high priority filter', () => {
    const high = contentOptimizationSuggester.getHighPrioritySuggestions();
    expect(high.every((s) => s.priority === 'high')).toBe(true);
  });
});
