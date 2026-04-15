/**
 * Phase 325: Digital Asset Intelligence
 * Asset performance tracking, brand consistency, content ROI, asset lifecycle
 */

import { logger } from './logger';

interface DigitalAssetRecord {
  assetId: string;
  assetName: string;
  assetType: 'image' | 'video' | 'document' | 'template' | 'logo' | 'icon' | 'audio' | 'presentation';
  brand: string;
  campaign?: string;
  tags: string[];
  fileSizeMb: number;
  format: string;
  dimensions?: string;
  durationSeconds?: number;       // for video/audio
  createdBy: string;
  status: 'active' | 'archived' | 'expired' | 'draft';
  expiresAt?: number;
  usageCount: number;
  downloadCount: number;
  shareCount: number;
  performanceScore: number;       // 0-100 based on engagement
  brandAlignmentScore: number;    // 0-100 consistency with brand guidelines
  createdAt: number;
  lastUsedAt?: number;
}

interface AssetPerformanceRecord {
  performanceId: string;
  assetId: string;
  assetName: string;
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  engagementRate: number;
  revenueAttributedUSD: number;
  costToCreateUSD: number;
  roi: number;                    // revenue / cost
  channelBreakdown: { channel: string; impressions: number; conversions: number }[];
  audienceReach: number;
  sentimentScore: number;         // -1 to 1
  calculatedAt: number;
}

interface BrandConsistencyRecord {
  checkId: string;
  assetId: string;
  assetName: string;
  colorCompliancePct: number;     // % of colors matching brand palette
  fontCompliancePct: number;
  logoUsageCorrect: boolean;
  messagingAlignmentScore: number;
  overallScore: number;
  violations: string[];
  severity: 'compliant' | 'minor_violation' | 'major_violation';
  reviewedBy?: string;
  checkedAt: number;
}

interface AssetLifecycleRecord {
  lifecycleId: string;
  assetId: string;
  assetName: string;
  phase: 'creation' | 'review' | 'approved' | 'active' | 'refresh_needed' | 'retired';
  previousPhase?: string;
  daysInPhase: number;
  isOverdue: boolean;
  expectedRefreshDate?: number;
  retirementReason?: string;
  replacementAssetId?: string;
  phaseEnteredAt: number;
  updatedAt: number;
}

class DigitalAssetManager {
  private assets: Map<string, DigitalAssetRecord> = new Map();
  private counter = 0;

  register(name: string, type: DigitalAssetRecord['assetType'], brand: string, createdBy: string, fileSizeMb: number, format: string, tags: string[] = [], campaign?: string): DigitalAssetRecord {
    const assetId = `asset-${Date.now()}-${++this.counter}`;
    const record: DigitalAssetRecord = {
      assetId, assetName: name, assetType: type, brand, campaign, tags,
      fileSizeMb, format, createdBy, status: 'draft',
      usageCount: 0, downloadCount: 0, shareCount: 0,
      performanceScore: 0, brandAlignmentScore: 0,
      createdAt: Date.now()
    };
    this.assets.set(assetId, record);
    logger.debug('Digital asset registered', { assetId, name, type, brand });
    return record;
  }

  activate(assetId: string, brandScore: number): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.status = 'active';
    asset.brandAlignmentScore = brandScore;
    return true;
  }

  trackUsage(assetId: string, downloads = 0, shares = 0): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.usageCount++;
    asset.downloadCount += downloads;
    asset.shareCount += shares;
    asset.lastUsedAt = Date.now();
    return true;
  }

  updatePerformanceScore(assetId: string, score: number): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.performanceScore = Math.min(100, Math.max(0, score));
    return true;
  }

  getTopPerformers(limit = 5): DigitalAssetRecord[] {
    return Array.from(this.assets.values())
      .filter(a => a.status === 'active')
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getUnderused(dayThreshold = 60): DigitalAssetRecord[] {
    const cutoff = Date.now() - dayThreshold * 86400000;
    return Array.from(this.assets.values())
      .filter(a => a.status === 'active' && (!a.lastUsedAt || a.lastUsedAt < cutoff));
  }

  getExpiring(daysAhead = 30): DigitalAssetRecord[] {
    const future = Date.now() + daysAhead * 86400000;
    return Array.from(this.assets.values()).filter(a => a.expiresAt && a.expiresAt <= future);
  }

  getAll(): DigitalAssetRecord[] {
    return Array.from(this.assets.values());
  }

  getAsset(id: string): DigitalAssetRecord | undefined {
    return this.assets.get(id);
  }
}

class AssetPerformanceAnalyzer {
  private records: AssetPerformanceRecord[] = [];
  private counter = 0;

  analyze(assetId: string, assetName: string, period: string, impressions: number, clicks: number, conversions: number, revenueAttributed: number, costToCreate: number, channelBreakdown: AssetPerformanceRecord['channelBreakdown'], audienceReach: number, sentimentScore: number): AssetPerformanceRecord {
    const performanceId = `assetperf-${Date.now()}-${++this.counter}`;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 100 * 100) / 100 : 0;
    const convRate = clicks > 0 ? Math.round((conversions / clicks) * 100 * 100) / 100 : 0;
    const engagementRate = impressions > 0 ? Math.round(((clicks + conversions) / impressions) * 100 * 100) / 100 : 0;
    const roi = costToCreate > 0 ? Math.round((revenueAttributed / costToCreate) * 100) / 100 : 0;

    const record: AssetPerformanceRecord = {
      performanceId, assetId, assetName, period, impressions, clicks, conversions,
      ctr, conversionRate: convRate, engagementRate, revenueAttributedUSD: revenueAttributed,
      costToCreateUSD: costToCreate, roi, channelBreakdown, audienceReach,
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore)), calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopROI(limit = 5): AssetPerformanceRecord[] {
    return [...this.records].sort((a, b) => b.roi - a.roi).slice(0, limit);
  }

  getTotalAttributedRevenue(): number {
    return this.records.reduce((s, r) => s + r.revenueAttributedUSD, 0);
  }
}

class BrandConsistencyChecker {
  private checks: BrandConsistencyRecord[] = [];
  private counter = 0;

  check(assetId: string, assetName: string, colorCompliance: number, fontCompliance: number, logoCorrect: boolean, messagingScore: number, violations: string[], reviewer?: string): BrandConsistencyRecord {
    const checkId = `brandcheck-${Date.now()}-${++this.counter}`;
    const overall = Math.round(colorCompliance * 0.3 + fontCompliance * 0.2 + (logoCorrect ? 100 : 0) * 0.2 + messagingScore * 0.3);
    const severity: BrandConsistencyRecord['severity'] =
      overall >= 85 ? 'compliant' : overall >= 65 ? 'minor_violation' : 'major_violation';

    const record: BrandConsistencyRecord = {
      checkId, assetId, assetName, colorCompliancePct: colorCompliance,
      fontCompliancePct: fontCompliance, logoUsageCorrect: logoCorrect,
      messagingAlignmentScore: messagingScore, overallScore: overall,
      violations, severity, reviewedBy: reviewer, checkedAt: Date.now()
    };
    this.checks.push(record);
    logger.debug('Brand consistency checked', { checkId, assetId, overall, severity });
    return record;
  }

  getMajorViolations(): BrandConsistencyRecord[] {
    return this.checks.filter(c => c.severity === 'major_violation');
  }

  getAverageBrandScore(): number {
    const all = this.checks;
    return all.length > 0 ? Math.round(all.reduce((s, c) => s + c.overallScore, 0) / all.length * 10) / 10 : 0;
  }
}

class AssetLifecycleManager {
  private lifecycles: Map<string, AssetLifecycleRecord> = new Map();
  private counter = 0;

  setPhase(assetId: string, assetName: string, phase: AssetLifecycleRecord['phase'], expectedRefreshDate?: number): AssetLifecycleRecord {
    const lifecycleId = `assetlc-${Date.now()}-${++this.counter}`;
    const existing = this.lifecycles.get(assetId);
    const isOverdue = expectedRefreshDate ? Date.now() > expectedRefreshDate : false;
    const record: AssetLifecycleRecord = {
      lifecycleId, assetId, assetName, phase, previousPhase: existing?.phase,
      daysInPhase: existing?.phase === phase ? Math.floor((Date.now() - (existing?.phaseEnteredAt || Date.now())) / 86400000) : 0,
      isOverdue, expectedRefreshDate, phaseEnteredAt: Date.now(), updatedAt: Date.now()
    };
    this.lifecycles.set(assetId, record);
    return record;
  }

  getRefreshNeeded(): AssetLifecycleRecord[] {
    return Array.from(this.lifecycles.values()).filter(l => l.phase === 'refresh_needed' || l.isOverdue);
  }

  getAll(): AssetLifecycleRecord[] {
    return Array.from(this.lifecycles.values());
  }
}

export const digitalAssetManager = new DigitalAssetManager();
export const assetPerformanceAnalyzer = new AssetPerformanceAnalyzer();
export const brandConsistencyChecker = new BrandConsistencyChecker();
export const assetLifecycleManager = new AssetLifecycleManager();

export { DigitalAssetRecord, AssetPerformanceRecord, BrandConsistencyRecord, AssetLifecycleRecord };
