/**
 * Phase 281: Corporate Communications Intelligence
 * Internal communications effectiveness, media relations, crisis communications, message reach
 */

import { logger } from './logger';

interface CommunicationCampaignRecord {
  campaignId: string;
  title: string;
  campaignType: 'internal' | 'external' | 'crisis' | 'pr' | 'investor_relations' | 'employee_announcement';
  channels: string[];
  targetAudienceSize: number;
  reachedCount: number;
  reachRatePct: number;
  openRatePct: number;
  engagementRatePct: number;
  sentAt: number;
  sentimentScore: number;       // -100 to +100
  keyMessages: string[];
  status: 'draft' | 'sent' | 'completed' | 'cancelled';
  createdAt: number;
}

interface MediaRelationsRecord {
  recordId: string;
  period: string;
  totalMediaMentions: number;
  positiveMentions: number;
  negativeMentions: number;
  neutralMentions: number;
  tier1MediaCoverage: number;    // top-tier outlets
  pressReleasesIssued: number;
  mediaResponseTimeAvgHours: number;
  shareOfVoicePct: number;
  mediaValueEquivalent: number;  // advertising value equivalent
  calculatedAt: number;
}

interface InternalCommsEffectivenessRecord {
  recordId: string;
  period: string;
  totalMessages: number;
  avgOpenRatePct: number;
  avgReadRatePct: number;
  feedbackResponseRatePct: number;
  employeeUnderstandingScore: number;  // survey-based 0-100
  messageClarityScore: number;          // 0-100
  channelEffectivenessScores: Record<string, number>;
  calculatedAt: number;
}

interface CrisisCommunicationsRecord {
  crisisId: string;
  crisisType: 'reputational' | 'operational' | 'financial' | 'safety' | 'legal' | 'cyber';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  firstResponseAt?: number;
  responseTimeMinutes?: number;
  stakeholdersNotified: number;
  messagesIssued: number;
  mediaInquiries: number;
  mediaInquiriesAnswered: number;
  reputationImpactScore: number;  // -100 to 0 (impact on brand)
  resolved: boolean;
  resolvedAt?: number;
  lessonsLearned: string[];
  createdAt: number;
}

class CommunicationsCampaignManager {
  private campaigns: Map<string, CommunicationCampaignRecord> = new Map();
  private counter = 0;

  create(title: string, type: CommunicationCampaignRecord['campaignType'], channels: string[], audienceSize: number, keyMessages: string[]): CommunicationCampaignRecord {
    const campaignId = `comms-${Date.now()}-${++this.counter}`;
    const campaign: CommunicationCampaignRecord = {
      campaignId, title, campaignType: type, channels, targetAudienceSize: audienceSize,
      reachedCount: 0, reachRatePct: 0, openRatePct: 0, engagementRatePct: 0,
      sentAt: 0, sentimentScore: 0, keyMessages, status: 'draft', createdAt: Date.now()
    };
    this.campaigns.set(campaignId, campaign);
    logger.debug('Campaign created', { campaignId, title, type });
    return campaign;
  }

  recordResults(campaignId: string, reached: number, opened: number, engaged: number, sentimentScore: number): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;
    campaign.reachedCount = reached;
    campaign.reachRatePct = campaign.targetAudienceSize > 0 ? (reached / campaign.targetAudienceSize) * 100 : 0;
    campaign.openRatePct = reached > 0 ? (opened / reached) * 100 : 0;
    campaign.engagementRatePct = reached > 0 ? (engaged / reached) * 100 : 0;
    campaign.sentimentScore = sentimentScore;
    campaign.sentAt = Date.now();
    campaign.status = 'completed';
    return true;
  }

  getTopCampaignsByReach(limit = 5): CommunicationCampaignRecord[] {
    return Array.from(this.campaigns.values())
      .filter(c => c.status === 'completed')
      .sort((a, b) => b.reachRatePct - a.reachRatePct)
      .slice(0, limit);
  }

  getAvgEngagementRate(): number {
    const completed = Array.from(this.campaigns.values()).filter(c => c.status === 'completed');
    if (!completed.length) return 0;
    return completed.reduce((s, c) => s + c.engagementRatePct, 0) / completed.length;
  }

  getCampaign(campaignId: string): CommunicationCampaignRecord | undefined {
    return this.campaigns.get(campaignId);
  }
}

class MediaRelationsTracker {
  private records: MediaRelationsRecord[] = [];
  private counter = 0;

  record(period: string, total: number, positive: number, negative: number, tier1: number, pressReleases: number, responseTimeHours: number, sovPct: number, mediaValue: number): MediaRelationsRecord {
    const recordId = `media-${Date.now()}-${++this.counter}`;
    const record: MediaRelationsRecord = {
      recordId, period, totalMediaMentions: total, positiveMentions: positive,
      negativeMentions: negative, neutralMentions: total - positive - negative,
      tier1MediaCoverage: tier1, pressReleasesIssued: pressReleases,
      mediaResponseTimeAvgHours: responseTimeHours, shareOfVoicePct: sovPct,
      mediaValueEquivalent: mediaValue, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): MediaRelationsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getSentimentTrend(): number[] {
    return this.records.map(r => r.totalMediaMentions > 0
      ? ((r.positiveMentions - r.negativeMentions) / r.totalMediaMentions) * 100
      : 0);
  }

  getTotalMediaValue(): number {
    return this.records.reduce((s, r) => s + r.mediaValueEquivalent, 0);
  }
}

class InternalCommsAnalyzer {
  private records: InternalCommsEffectivenessRecord[] = [];
  private counter = 0;

  analyze(period: string, messages: number, avgOpen: number, avgRead: number, feedbackRate: number, understandingScore: number, clarityScore: number, channelScores: Record<string, number>): InternalCommsEffectivenessRecord {
    const recordId = `intcomms-${Date.now()}-${++this.counter}`;
    const record: InternalCommsEffectivenessRecord = {
      recordId, period, totalMessages: messages, avgOpenRatePct: avgOpen,
      avgReadRatePct: avgRead, feedbackResponseRatePct: feedbackRate,
      employeeUnderstandingScore: understandingScore, messageClarityScore: clarityScore,
      channelEffectivenessScores: channelScores, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): InternalCommsEffectivenessRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getBestChannel(): string | null {
    const latest = this.getLatest();
    if (!latest) return null;
    const entries = Object.entries(latest.channelEffectivenessScores);
    if (!entries.length) return null;
    return entries.reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
  }
}

class CrisisCommunicationsManager {
  private crises: Map<string, CrisisCommunicationsRecord> = new Map();
  private counter = 0;

  declare(type: CrisisCommunicationsRecord['crisisType'], severity: CrisisCommunicationsRecord['severity'], lessonsLearned: string[] = []): CrisisCommunicationsRecord {
    const crisisId = `crisis-${Date.now()}-${++this.counter}`;
    const record: CrisisCommunicationsRecord = {
      crisisId, crisisType: type, severity, detectedAt: Date.now(),
      stakeholdersNotified: 0, messagesIssued: 0, mediaInquiries: 0,
      mediaInquiriesAnswered: 0, reputationImpactScore: 0, resolved: false,
      lessonsLearned, createdAt: Date.now()
    };
    this.crises.set(crisisId, record);
    logger.debug('Crisis declared', { crisisId, type, severity });
    return record;
  }

  respond(crisisId: string, stakeholders: number, messages: number, mediaInquiries: number, answered: number): boolean {
    const crisis = this.crises.get(crisisId);
    if (!crisis) return false;
    if (!crisis.firstResponseAt) {
      crisis.firstResponseAt = Date.now();
      crisis.responseTimeMinutes = Math.floor((Date.now() - crisis.detectedAt) / 60000);
    }
    crisis.stakeholdersNotified = stakeholders;
    crisis.messagesIssued = messages;
    crisis.mediaInquiries = mediaInquiries;
    crisis.mediaInquiriesAnswered = answered;
    return true;
  }

  resolve(crisisId: string, reputationImpact: number): boolean {
    const crisis = this.crises.get(crisisId);
    if (!crisis) return false;
    crisis.resolved = true;
    crisis.resolvedAt = Date.now();
    crisis.reputationImpactScore = Math.min(0, reputationImpact);
    return true;
  }

  getOpenCrises(): CrisisCommunicationsRecord[] {
    return Array.from(this.crises.values())
      .filter(c => !c.resolved)
      .sort((a, b) => {
        const s = { critical: 0, high: 1, medium: 2, low: 3 };
        return s[a.severity] - s[b.severity];
      });
  }

  getAvgResponseTime(): number {
    const withResponse = Array.from(this.crises.values()).filter(c => c.responseTimeMinutes !== undefined);
    if (!withResponse.length) return 0;
    return withResponse.reduce((s, c) => s + (c.responseTimeMinutes || 0), 0) / withResponse.length;
  }
}

export const communicationsCampaignManager = new CommunicationsCampaignManager();
export const mediaRelationsTracker = new MediaRelationsTracker();
export const internalCommsAnalyzer = new InternalCommsAnalyzer();
export const crisisCommunicationsManager = new CrisisCommunicationsManager();

export { CommunicationCampaignRecord, MediaRelationsRecord, InternalCommsEffectivenessRecord, CrisisCommunicationsRecord };
