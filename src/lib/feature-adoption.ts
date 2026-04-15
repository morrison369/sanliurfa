/**
 * Phase 198: Feature Adoption Tracking
 * Adoption lifecycle, funnel analysis, stickiness calculation, adoption campaigns
 */

import { logger } from './logger';

interface FeatureAdoptionRecord {
  recordId: string;
  featureKey: string;
  userId: string;
  stage: 'aware' | 'activated' | 'adopted' | 'churned';
  firstSeenAt: number;
  activatedAt?: number;
  adoptedAt?: number;
  churnedAt?: number;
  usageCount: number;
}

interface AdoptionFunnelStage {
  stageName: string;
  userCount: number;
  conversionRate: number; // from previous stage
  avgTimeToConvert: number; // ms
}

interface FeatureStickiness {
  featureKey: string;
  period: string;
  dau: number;
  mau: number;
  stickinessRatio: number; // DAU/MAU
  weeklyActiveUsers: number;
  returningUserRate: number;
}

interface AdoptionCampaign {
  campaignId: string;
  name: string;
  featureKey: string;
  targetSegment: string;
  type: 'email' | 'in_app' | 'tooltip' | 'onboarding';
  startedAt: number;
  endedAt?: number;
  targetedUsers: number;
  activatedUsers: number;
  status: 'active' | 'completed' | 'paused';
}

class FeatureAdoptionTracker {
  private records: Map<string, FeatureAdoptionRecord> = new Map();
  private counter = 0;

  markAware(userId: string, featureKey: string): FeatureAdoptionRecord {
    const key = `${userId}:${featureKey}`;
    const existing = this.records.get(key);
    if (existing) return existing;
    const recordId = `adoption-${Date.now()}-${++this.counter}`;
    const record: FeatureAdoptionRecord = {
      recordId, featureKey, userId, stage: 'aware',
      firstSeenAt: Date.now(), usageCount: 0
    };
    this.records.set(key, record);
    return record;
  }

  markActivated(userId: string, featureKey: string): boolean {
    const record = this.records.get(`${userId}:${featureKey}`);
    if (record && record.stage === 'aware') {
      record.stage = 'activated';
      record.activatedAt = Date.now();
      record.usageCount++;
      return true;
    }
    return false;
  }

  markAdopted(userId: string, featureKey: string): boolean {
    const record = this.records.get(`${userId}:${featureKey}`);
    if (record && (record.stage === 'activated')) {
      record.stage = 'adopted';
      record.adoptedAt = Date.now();
      return true;
    }
    return false;
  }

  recordUsage(userId: string, featureKey: string): void {
    const record = this.records.get(`${userId}:${featureKey}`);
    if (record) record.usageCount++;
  }

  getAdoptionRate(featureKey: string): number {
    const feature = Array.from(this.records.values()).filter(r => r.featureKey === featureKey);
    if (!feature.length) return 0;
    const adopted = feature.filter(r => r.stage === 'adopted').length;
    return (adopted / feature.length) * 100;
  }

  getFeatureUsers(featureKey: string, stage?: FeatureAdoptionRecord['stage']): FeatureAdoptionRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.featureKey === featureKey && (!stage || r.stage === stage));
  }
}

class AdoptionFunnelAnalyzer {
  analyze(records: FeatureAdoptionRecord[]): AdoptionFunnelStage[] {
    const stages: FeatureAdoptionRecord['stage'][] = ['aware', 'activated', 'adopted'];
    const funnel: AdoptionFunnelStage[] = [];
    let prevCount = records.length;

    for (const stageName of stages) {
      const stageRecords = records.filter(r =>
        r.stage === stageName || r.stage === 'adopted' ||
        (stageName === 'aware' && true) ||
        (stageName === 'activated' && (r.stage === 'activated' || r.stage === 'adopted')) ||
        (stageName === 'adopted' && r.stage === 'adopted')
      );

      let count: number;
      if (stageName === 'aware') count = records.length;
      else if (stageName === 'activated') count = records.filter(r => r.activatedAt).length;
      else count = records.filter(r => r.adoptedAt).length;

      const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0;

      let avgTimeToConvert = 0;
      if (stageName === 'activated') {
        const times = records.filter(r => r.activatedAt).map(r => r.activatedAt! - r.firstSeenAt);
        avgTimeToConvert = times.length ? times.reduce((s, v) => s + v, 0) / times.length : 0;
      } else if (stageName === 'adopted') {
        const times = records.filter(r => r.adoptedAt && r.activatedAt).map(r => r.adoptedAt! - r.activatedAt!);
        avgTimeToConvert = times.length ? times.reduce((s, v) => s + v, 0) / times.length : 0;
      }

      funnel.push({ stageName, userCount: count, conversionRate, avgTimeToConvert });
      prevCount = count;
    }
    return funnel;
  }

  getDropoffStage(funnel: AdoptionFunnelStage[]): string {
    if (!funnel.length) return 'none';
    return funnel.slice(1).reduce((worst, stage) =>
      stage.conversionRate < worst.conversionRate ? stage : worst
    ).stageName;
  }
}

class FeatureStickinessCalculator {
  private stickiness: Map<string, FeatureStickiness[]> = new Map();

  record(featureKey: string, period: string, dau: number, mau: number, wau: number, returningUserRate: number): FeatureStickiness {
    const metric: FeatureStickiness = {
      featureKey, period, dau, mau,
      stickinessRatio: mau > 0 ? (dau / mau) * 100 : 0,
      weeklyActiveUsers: wau, returningUserRate
    };
    const history = this.stickiness.get(featureKey) || [];
    const idx = history.findIndex(s => s.period === period);
    if (idx >= 0) history[idx] = metric; else history.push(metric);
    this.stickiness.set(featureKey, history);
    logger.debug('Feature stickiness recorded', { featureKey, period, stickinessRatio: metric.stickinessRatio.toFixed(1) });
    return metric;
  }

  getStickiness(featureKey: string): FeatureStickiness | undefined {
    const history = this.stickiness.get(featureKey) || [];
    return history[history.length - 1];
  }

  compareFeatures(featureKeys: string[]): FeatureStickiness[] {
    return featureKeys
      .map(k => this.getStickiness(k))
      .filter((s): s is FeatureStickiness => !!s)
      .sort((a, b) => b.stickinessRatio - a.stickinessRatio);
  }

  getStickyFeatures(threshold = 20): FeatureStickiness[] {
    return Array.from(this.stickiness.values())
      .map(history => history[history.length - 1])
      .filter(s => s && s.stickinessRatio >= threshold) as FeatureStickiness[];
  }
}

class AdoptionCampaignManager {
  private campaigns: Map<string, AdoptionCampaign> = new Map();
  private counter = 0;

  create(name: string, featureKey: string, targetSegment: string, type: AdoptionCampaign['type'], targetedUsers: number): AdoptionCampaign {
    const campaignId = `campaign-${Date.now()}-${++this.counter}`;
    const campaign: AdoptionCampaign = {
      campaignId, name, featureKey, targetSegment, type,
      startedAt: Date.now(), targetedUsers, activatedUsers: 0, status: 'active'
    };
    this.campaigns.set(campaignId, campaign);
    logger.debug('Adoption campaign created', { campaignId, name, featureKey, type });
    return campaign;
  }

  recordActivation(campaignId: string, count = 1): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign && campaign.status === 'active') campaign.activatedUsers += count;
  }

  complete(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) { campaign.status = 'completed'; campaign.endedAt = Date.now(); return true; }
    return false;
  }

  getConversionRate(campaignId: string): number {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.targetedUsers === 0) return 0;
    return (campaign.activatedUsers / campaign.targetedUsers) * 100;
  }

  getActiveCampaigns(): AdoptionCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.status === 'active');
  }
}

export const featureAdoptionTracker = new FeatureAdoptionTracker();
export const adoptionFunnelAnalyzer = new AdoptionFunnelAnalyzer();
export const featureStickinessCalculator = new FeatureStickinessCalculator();
export const adoptionCampaignManager = new AdoptionCampaignManager();

export { FeatureAdoptionRecord, AdoptionFunnelStage, FeatureStickiness, AdoptionCampaign };
