/**
 * Unit Tests — content-performance-analytics.ts singleton class managers
 *
 * - ContentAssetManager (create + filter by type/buyerStage)
 * - ContentEngagementTracker (record + composite engagementScore + getTopEngaged)
 * - ContentROIAnalyzer (analyze ROI + costPerLead + getTopROI)
 * - SEOPerformanceTracker (record + ctr + getAvgCTR)
 */

import { describe, it, expect } from 'vitest';
import {
  contentAssetManager,
  contentEngagementTracker,
  contentROIAnalyzer,
  seoPerformanceTracker,
} from '../content-performance-analytics';

describe('ContentAssetManager', () => {
  it('create — asset döner', () => {
    const a = contentAssetManager.create(
      'Best Şanlıurfa Cuisine Guide-1',
      'blog',
      'cuisine',
      'foodies',
      'awareness',
      'Author X',
      ['food', 'turkish'],
    );
    expect(a.title).toBe('Best Şanlıurfa Cuisine Guide-1');
    expect(a.type).toBe('blog');
    expect(a.buyerStage).toBe('awareness');
    expect(a.tags).toEqual(['food', 'turkish']);
    expect(a.assetId).toMatch(/^content-\d+-\d+$/);
  });

  it('create — tags default boş array', () => {
    const a = contentAssetManager.create('No Tags-2', 'video', 'topic', 'persona', 'consideration', 'Author');
    expect(a.tags).toEqual([]);
  });

  it('getByType — type filter', () => {
    const a = contentAssetManager.create('Whitepaper-3', 'whitepaper', 't', 'p', 'decision', 'Au');
    const wp = contentAssetManager.getByType('whitepaper');
    expect(wp.some((x) => x.assetId === a.assetId)).toBe(true);
    expect(wp.every((x) => x.type === 'whitepaper')).toBe(true);
  });

  it('getByStage — buyerStage filter', () => {
    const a = contentAssetManager.create('Decision-4', 'case_study', 't', 'p', 'decision', 'Au');
    const dec = contentAssetManager.getByStage('decision');
    expect(dec.some((x) => x.assetId === a.assetId)).toBe(true);
    expect(dec.every((x) => x.buyerStage === 'decision')).toBe(true);
  });

  it('getAsset — bilinmeyen → undefined', () => {
    expect(contentAssetManager.getAsset('non-existent')).toBeUndefined();
  });

  it('getAllAssets — array', () => {
    const all = contentAssetManager.getAllAssets();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });
});

describe('ContentEngagementTracker', () => {
  it('record — metric döner, engagementScore composite', () => {
    const m = contentEngagementTracker.record('eng-asset-1', '2026-Q1', 100, 80, 60, 50, 5, 10, 5);
    // engagementScore = (60/60)*10 + 50*0.4 + (5/100)*1000 + 5*2 = 10 + 20 + 50 + 10 = 90
    expect(m.engagementScore).toBeCloseTo(90, 1);
    expect(m.metricId).toMatch(/^contengage-\d+-\d+$/);
  });

  it('record — engagementScore clamp 0-100', () => {
    const m = contentEngagementTracker.record('eng-clamp', '2026-Q1', 10, 8, 600, 100, 100, 50, 100);
    // çok yüksek değerler → score > 100 ama clamp 100
    expect(m.engagementScore).toBeLessThanOrEqual(100);
    expect(m.engagementScore).toBeGreaterThanOrEqual(0);
  });

  it('record — views=0 → leads/views guard (max(1, 0) = 1)', () => {
    const m = contentEngagementTracker.record('eng-zero', '2026-Q1', 0, 0, 0, 0, 0, 0, 0);
    expect(m.engagementScore).toBe(0);
  });

  it('getLatest — son metric', () => {
    contentEngagementTracker.record('eng-latest', '2026-Q1', 100, 80, 60, 50, 5, 10, 5);
    const m2 = contentEngagementTracker.record('eng-latest', '2026-Q2', 200, 160, 70, 60, 8, 15, 10);
    expect(contentEngagementTracker.getLatest('eng-latest')?.metricId).toBe(m2.metricId);
  });

  it('getLatest — bilinmeyen → undefined', () => {
    expect(contentEngagementTracker.getLatest('non-existent')).toBeUndefined();
  });

  it('getTopEngaged — engagementScore desc + limit', () => {
    contentEngagementTracker.record('eng-top-1', '2026-Q1', 100, 80, 60, 70, 5, 10, 5);
    contentEngagementTracker.record('eng-top-2', '2026-Q1', 100, 80, 30, 30, 1, 2, 1);
    const top = contentEngagementTracker.getTopEngaged(20);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].engagementScore).toBeGreaterThanOrEqual(top[i].engagementScore);
    }
  });

  it('getTopEngaged — getLatest behavior (her asset için son metric)', () => {
    const ID = `eng-multi-${Date.now()}`;
    contentEngagementTracker.record(ID, 'Q1', 100, 50, 30, 50, 1, 1, 0);
    contentEngagementTracker.record(ID, 'Q2', 200, 100, 60, 80, 5, 5, 5); // daha yüksek score
    const top = contentEngagementTracker.getTopEngaged(50);
    const myEntry = top.find((m) => m.assetId === ID);
    // Sadece Q2 (son metric) görünmeli
    expect(myEntry?.period).toBe('Q2');
  });
});

describe('ContentROIAnalyzer', () => {
  it('analyze — ROI = (revenue - totalCost) / totalCost * 100', () => {
    const r = contentROIAnalyzer.analyze('roi-1', '2026-Q1', 5000, 2000, 50, 30, 35000);
    // totalCost = 7000, ROI = (35000 - 7000) / 7000 * 100 = 400
    expect(r.roi).toBe(400);
    expect(r.costPerLead).toBe(140); // 7000 / 50
  });

  it('analyze — totalCost=0 → roi 0 (NaN guard)', () => {
    const r = contentROIAnalyzer.analyze('roi-zero', '2026-Q1', 0, 0, 0, 0, 1000);
    expect(r.roi).toBe(0);
    expect(r.costPerLead).toBe(0);
  });

  it('analyze — leadsGenerated=0 → costPerLead 0', () => {
    const r = contentROIAnalyzer.analyze('roi-noleads', '2026-Q1', 1000, 500, 0, 0, 0);
    expect(r.costPerLead).toBe(0);
  });

  it('getTopROI — roi desc + limit', () => {
    const top = contentROIAnalyzer.getTopROI(20);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].roi).toBeGreaterThanOrEqual(top[i].roi);
    }
  });

  it('getTotalPipelineInfluenced — sum', () => {
    const total = contentROIAnalyzer.getTotalPipelineInfluenced();
    expect(total).toBeGreaterThanOrEqual(0);
    expect(typeof total).toBe('number');
  });
});

describe('SEOPerformanceTracker', () => {
  it('record — metric döner, ctr = clicks / impressions * 100', () => {
    const m = seoPerformanceTracker.record('seo-1', '2026-Q1', 200, 10000, 5.5, ['kw1', 'kw2'], 12);
    expect(m.organicClicks).toBe(200);
    expect(m.impressions).toBe(10000);
    expect(m.ctr).toBe(2); // 200/10000*100
    expect(m.avgPosition).toBe(5.5);
    expect(m.targetKeywords).toEqual(['kw1', 'kw2']);
    expect(m.rankingKeywords).toBe(12);
    expect(m.seoId).toMatch(/^seoperfm-\d+-\d+$/);
  });

  it('record — impressions=0 → ctr 0 (NaN guard)', () => {
    const m = seoPerformanceTracker.record('seo-zero', '2026-Q1', 0, 0, 0, [], 0);
    expect(m.ctr).toBe(0);
  });

  it('getTopOrganicAssets — organicClicks desc + getLatest behavior', () => {
    seoPerformanceTracker.record('seo-top-1', '2026-Q1', 1000, 50000, 3, [], 10);
    seoPerformanceTracker.record('seo-top-2', '2026-Q1', 50, 5000, 8, [], 1);
    const top = seoPerformanceTracker.getTopOrganicAssets(20);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].organicClicks).toBeGreaterThanOrEqual(top[i].organicClicks);
    }
  });

  it('getAvgCTR — ortalama ctr', () => {
    const avg = seoPerformanceTracker.getAvgCTR();
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(typeof avg).toBe('number');
  });

  it('getTopOrganicAssets — son metric per asset (latest behavior)', () => {
    const ID = `seo-multi-${Date.now()}`;
    seoPerformanceTracker.record(ID, 'Q1', 100, 1000, 5, [], 5);
    seoPerformanceTracker.record(ID, 'Q2', 500, 5000, 3, [], 10);
    const top = seoPerformanceTracker.getTopOrganicAssets(50);
    const myEntry = top.find((m) => m.assetId === ID);
    expect(myEntry?.period).toBe('Q2');
  });
});
