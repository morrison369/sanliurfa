/**
 * Phase 241: Content Performance Analytics
 * Content asset tracking, engagement metrics, content ROI, SEO performance
 */

import { logger } from './logger';

interface ContentAsset {
  assetId: string;
  title: string;
  type: 'blog' | 'whitepaper' | 'video' | 'webinar' | 'case_study' | 'ebook' | 'infographic' | 'email';
  topic: string;
  targetPersona: string;
  buyerStage: 'awareness' | 'consideration' | 'decision';
  publishedAt: number;
  author: string;
  tags: string[];
  createdAt: number;
}

interface ContentEngagementMetric {
  metricId: string;
  assetId: string;
  period: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPageSec: number;
  scrollDepthPct: number;
  shares: number;
  downloads: number;
  leads: number;
  engagementScore: number;  // composite
  capturedAt: number;
}

interface ContentROI {
  roiId: string;
  assetId: string;
  period: string;
  productionCost: number;
  promotionCost: number;
  leadsGenerated: number;
  pipelineInfluenced: number;
  revenueAttributed: number;
  roi: number;
  costPerLead: number;
  calculatedAt: number;
}

interface SEOPerformanceMetric {
  seoId: string;
  assetId: string;
  period: string;
  organicClicks: number;
  impressions: number;
  ctr: number;         // click-through rate %
  avgPosition: number;
  targetKeywords: string[];
  rankingKeywords: number;
  capturedAt: number;
}

class ContentAssetManager {
  private assets: Map<string, ContentAsset> = new Map();
  private counter = 0;

  create(title: string, type: ContentAsset['type'], topic: string, targetPersona: string, buyerStage: ContentAsset['buyerStage'], author: string, tags: string[] = []): ContentAsset {
    const assetId = `content-${Date.now()}-${++this.counter}`;
    const asset: ContentAsset = {
      assetId, title, type, topic, targetPersona, buyerStage,
      publishedAt: Date.now(), author, tags, createdAt: Date.now()
    };
    this.assets.set(assetId, asset);
    logger.debug('Content asset created', { assetId, title, type, buyerStage });
    return asset;
  }

  getByType(type: ContentAsset['type']): ContentAsset[] {
    return Array.from(this.assets.values()).filter(a => a.type === type);
  }

  getByStage(stage: ContentAsset['buyerStage']): ContentAsset[] {
    return Array.from(this.assets.values()).filter(a => a.buyerStage === stage);
  }

  getAsset(assetId: string): ContentAsset | undefined {
    return this.assets.get(assetId);
  }

  getAllAssets(): ContentAsset[] {
    return Array.from(this.assets.values());
  }
}

class ContentEngagementTracker {
  private metrics: Map<string, ContentEngagementMetric[]> = new Map();
  private counter = 0;

  record(assetId: string, period: string, views: number, uniqueVisitors: number, avgTimeSec: number, scrollDepth: number, shares: number, downloads: number, leads: number): ContentEngagementMetric {
    const engagementScore =
      Math.min(100, (avgTimeSec / 60) * 10 + scrollDepth * 0.4 + (leads / Math.max(1, views)) * 1000 + shares * 2);
    const metricId = `contengage-${Date.now()}-${++this.counter}`;
    const metric: ContentEngagementMetric = {
      metricId, assetId, period, views, uniqueVisitors, avgTimeOnPageSec: avgTimeSec,
      scrollDepthPct: scrollDepth, shares, downloads, leads,
      engagementScore: Math.max(0, Math.min(100, engagementScore)), capturedAt: Date.now()
    };
    const existing = this.metrics.get(assetId) || [];
    existing.push(metric);
    this.metrics.set(assetId, existing);
    return metric;
  }

  getTopEngaged(limit = 5): ContentEngagementMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is ContentEngagementMetric => !!m)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }

  getLatest(assetId: string): ContentEngagementMetric | undefined {
    const history = this.metrics.get(assetId) || [];
    return history[history.length - 1];
  }
}

class ContentROIAnalyzer {
  private records: Map<string, ContentROI> = new Map();
  private counter = 0;

  analyze(assetId: string, period: string, productionCost: number, promotionCost: number, leadsGenerated: number, pipelineInfluenced: number, revenueAttributed: number): ContentROI {
    const totalCost = productionCost + promotionCost;
    const roi = totalCost > 0 ? ((revenueAttributed - totalCost) / totalCost) * 100 : 0;
    const costPerLead = leadsGenerated > 0 ? totalCost / leadsGenerated : 0;
    const roiId = `controi-${Date.now()}-${++this.counter}`;
    const record: ContentROI = {
      roiId, assetId, period, productionCost, promotionCost, leadsGenerated,
      pipelineInfluenced, revenueAttributed, roi, costPerLead, calculatedAt: Date.now()
    };
    this.records.set(assetId, record);
    return record;
  }

  getTopROI(limit = 5): ContentROI[] {
    return Array.from(this.records.values()).sort((a, b) => b.roi - a.roi).slice(0, limit);
  }

  getTotalPipelineInfluenced(): number {
    return Array.from(this.records.values()).reduce((s, r) => s + r.pipelineInfluenced, 0);
  }
}

class SEOPerformanceTracker {
  private metrics: Map<string, SEOPerformanceMetric[]> = new Map();
  private counter = 0;

  record(assetId: string, period: string, clicks: number, impressions: number, avgPosition: number, targetKeywords: string[], rankingKeywords: number): SEOPerformanceMetric {
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const seoId = `seoperfm-${Date.now()}-${++this.counter}`;
    const metric: SEOPerformanceMetric = {
      seoId, assetId, period, organicClicks: clicks, impressions, ctr,
      avgPosition, targetKeywords, rankingKeywords, capturedAt: Date.now()
    };
    const existing = this.metrics.get(assetId) || [];
    existing.push(metric);
    this.metrics.set(assetId, existing);
    return metric;
  }

  getTopOrganicAssets(limit = 5): SEOPerformanceMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is SEOPerformanceMetric => !!m)
      .sort((a, b) => b.organicClicks - a.organicClicks)
      .slice(0, limit);
  }

  getAvgCTR(): number {
    const all = Array.from(this.metrics.values()).map(h => h[h.length - 1]).filter((m): m is SEOPerformanceMetric => !!m);
    if (!all.length) return 0;
    return all.reduce((s, m) => s + m.ctr, 0) / all.length;
  }
}

export const contentAssetManager = new ContentAssetManager();
export const contentEngagementTracker = new ContentEngagementTracker();
export const contentROIAnalyzer = new ContentROIAnalyzer();
export const seoPerformanceTracker = new SEOPerformanceTracker();

export type {ContentAsset, ContentEngagementMetric, ContentROI, SEOPerformanceMetric};