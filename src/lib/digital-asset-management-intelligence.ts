/**
 * Phase 290: Digital Asset Management Intelligence
 * Asset lifecycle, usage analytics, rights management, content performance
 */

import { logger } from './logger';

interface DigitalAssetRecord {
  assetId: string;
  title: string;
  assetType: 'image' | 'video' | 'audio' | 'document' | 'template' | 'brand_element' | 'presentation' | 'infographic';
  format: string;
  sizeBytes: number;
  createdBy: string;
  department: string;
  tags: string[];
  usageRightsType: 'owned' | 'licensed' | 'stock' | 'user_generated' | 'partner';
  licenseExpiryDate?: number;
  downloadCount: number;
  viewCount: number;
  usedInCampaignCount: number;
  performanceScore: number;     // 0-100 based on engagement
  status: 'active' | 'archived' | 'expired' | 'pending_approval';
  createdAt: number;
  lastUsedAt?: number;
}

interface AssetRightsRecord {
  rightsId: string;
  assetId: string;
  licensorName: string;
  licenseType: 'exclusive' | 'non_exclusive' | 'royalty_free' | 'rights_managed';
  usageScope: string[];        // web, print, social, broadcast
  territories: string[];
  startDate: number;
  endDate: number;
  licenseFeeUSD: number;
  renewalCost: number;
  restrictions: string[];
  status: 'active' | 'expired' | 'pending_renewal';
  createdAt: number;
}

interface AssetUsageAnalyticsRecord {
  recordId: string;
  period: string;
  totalAssets: number;
  activeAssets: number;
  unusedAssets: number;         // not used in 90+ days
  expiringAssets: number;       // rights expiring in 30 days
  totalDownloads: number;
  totalViews: number;
  topUsedAssets: string[];      // assetIds
  avgAssetLifespanDays: number;
  storageUsedGB: number;
  storageOptimizationPotentialGB: number;
  calculatedAt: number;
}

interface ContentPerformanceRecord {
  recordId: string;
  assetId: string;
  campaignId: string;
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;                  // click-through rate %
  conversionRate: number;
  engagementScore: number;      // 0-100
  revenueAttributed: number;
  costPerConversion: number;
  recordedAt: number;
}

class DigitalAssetManager {
  private assets: Map<string, DigitalAssetRecord> = new Map();
  private counter = 0;

  register(title: string, type: DigitalAssetRecord['assetType'], format: string, sizeBytes: number, createdBy: string, department: string, tags: string[], rightsType: DigitalAssetRecord['usageRightsType'], licenseExpiry?: number): DigitalAssetRecord {
    const assetId = `asset-${Date.now()}-${++this.counter}`;
    const asset: DigitalAssetRecord = {
      assetId, title, assetType: type, format, sizeBytes, createdBy, department, tags,
      usageRightsType: rightsType, licenseExpiryDate: licenseExpiry, downloadCount: 0,
      viewCount: 0, usedInCampaignCount: 0, performanceScore: 0,
      status: 'active', createdAt: Date.now()
    };
    this.assets.set(assetId, asset);
    logger.debug('Digital asset registered', { assetId, title, type });
    return asset;
  }

  recordUsage(assetId: string, usageType: 'view' | 'download' | 'campaign'): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    if (usageType === 'view') asset.viewCount++;
    else if (usageType === 'download') asset.downloadCount++;
    else asset.usedInCampaignCount++;
    asset.lastUsedAt = Date.now();
    asset.performanceScore = Math.min(100,
      asset.viewCount * 0.1 + asset.downloadCount * 0.5 + asset.usedInCampaignCount * 2
    );
    return true;
  }

  getExpiringRights(days = 30): DigitalAssetRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.assets.values())
      .filter(a => a.licenseExpiryDate && a.licenseExpiryDate <= horizon && a.status === 'active')
      .sort((a, b) => (a.licenseExpiryDate || 0) - (b.licenseExpiryDate || 0));
  }

  getUnusedAssets(days = 90): DigitalAssetRecord[] {
    const threshold = Date.now() - days * 86400000;
    return Array.from(this.assets.values())
      .filter(a => a.status === 'active' && (!a.lastUsedAt || a.lastUsedAt < threshold));
  }

  getTopPerforming(limit = 10): DigitalAssetRecord[] {
    return Array.from(this.assets.values())
      .filter(a => a.status === 'active')
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getAsset(assetId: string): DigitalAssetRecord | undefined {
    return this.assets.get(assetId);
  }
}

class AssetRightsManager {
  private rights: Map<string, AssetRightsRecord[]> = new Map();
  private counter = 0;

  register(assetId: string, licensor: string, type: AssetRightsRecord['licenseType'], scope: string[], territories: string[], startDate: number, endDate: number, fee: number, renewalCost: number, restrictions: string[]): AssetRightsRecord {
    const rightsId = `rights-${Date.now()}-${++this.counter}`;
    const record: AssetRightsRecord = {
      rightsId, assetId, licensorName: licensor, licenseType: type, usageScope: scope,
      territories, startDate, endDate, licenseFeeUSD: fee, renewalCost, restrictions,
      status: endDate > Date.now() ? 'active' : 'expired', createdAt: Date.now()
    };
    const existing = this.rights.get(assetId) || [];
    existing.push(record);
    this.rights.set(assetId, existing);
    return record;
  }

  getExpiringRights(days = 60): AssetRightsRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.rights.values())
      .flat()
      .filter(r => r.status === 'active' && r.endDate <= horizon)
      .sort((a, b) => a.endDate - b.endDate);
  }

  getTotalLicenseCost(): number {
    return Array.from(this.rights.values()).flat().reduce((s, r) => s + r.licenseFeeUSD, 0);
  }

  getActiveRights(assetId: string): AssetRightsRecord | undefined {
    return (this.rights.get(assetId) || []).find(r => r.status === 'active');
  }
}

class AssetUsageAnalyzer {
  private records: AssetUsageAnalyticsRecord[] = [];
  private counter = 0;

  analyze(period: string, assets: DigitalAssetRecord[]): AssetUsageAnalyticsRecord {
    const active = assets.filter(a => a.status === 'active');
    const unused = assets.filter(a => {
      const threshold = Date.now() - 90 * 86400000;
      return a.status === 'active' && (!a.lastUsedAt || a.lastUsedAt < threshold);
    });
    const expiring = assets.filter(a => {
      const horizon = Date.now() + 30 * 86400000;
      return a.licenseExpiryDate && a.licenseExpiryDate <= horizon;
    });
    const totalStorageGB = assets.reduce((s, a) => s + a.sizeBytes, 0) / (1024 ** 3);
    const top = [...active].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5).map(a => a.assetId);

    const recordId = `assetusage-${Date.now()}-${++this.counter}`;
    const record: AssetUsageAnalyticsRecord = {
      recordId, period, totalAssets: assets.length, activeAssets: active.length,
      unusedAssets: unused.length, expiringAssets: expiring.length,
      totalDownloads: assets.reduce((s, a) => s + a.downloadCount, 0),
      totalViews: assets.reduce((s, a) => s + a.viewCount, 0),
      topUsedAssets: top, avgAssetLifespanDays: 365, // simplified
      storageUsedGB: totalStorageGB,
      storageOptimizationPotentialGB: unused.reduce((s, a) => s + a.sizeBytes, 0) / (1024 ** 3),
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): AssetUsageAnalyticsRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

class ContentPerformanceTracker {
  private records: ContentPerformanceRecord[] = [];
  private counter = 0;

  record(assetId: string, campaignId: string, channel: string, impressions: number, clicks: number, conversions: number, revenueAttributed: number, campaignCost: number): ContentPerformanceRecord {
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const engagementScore = Math.min(100, ctr * 10 + convRate * 5);
    const costPerConv = conversions > 0 ? campaignCost / conversions : 0;

    const recordId = `contentperf-${Date.now()}-${++this.counter}`;
    const record: ContentPerformanceRecord = {
      recordId, assetId, campaignId, channel, impressions, clicks, conversions,
      ctr, conversionRate: convRate, engagementScore, revenueAttributed, costPerConversion: costPerConv,
      recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopAssetsByRevenue(limit = 5): ContentPerformanceRecord[] {
    return [...this.records].sort((a, b) => b.revenueAttributed - a.revenueAttributed).slice(0, limit);
  }

  getAvgEngagementScore(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + r.engagementScore, 0) / this.records.length;
  }

  getTotalRevenueAttributed(): number {
    return this.records.reduce((s, r) => s + r.revenueAttributed, 0);
  }
}

export const digitalAssetManager = new DigitalAssetManager();
export const assetRightsManager = new AssetRightsManager();
export const assetUsageAnalyzer = new AssetUsageAnalyzer();
export const contentPerformanceTracker = new ContentPerformanceTracker();

export { DigitalAssetRecord, AssetRightsRecord, AssetUsageAnalyticsRecord, ContentPerformanceRecord };
