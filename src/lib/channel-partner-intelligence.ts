/**
 * Phase 269: Channel Partner Intelligence
 * Partner performance, deal registration, enablement tracking, partner-sourced revenue
 */

import { logger } from './logger';

interface PartnerPerformanceRecord {
  recordId: string;
  partnerId: string;
  partnerName: string;
  partnerTier: 'platinum' | 'gold' | 'silver' | 'registered';
  period: string;
  pipelineGenerated: number;
  revenueAttribued: number;
  dealsWon: number;
  dealsLost: number;
  winRatePct: number;
  avgDealSize: number;
  certifiedReps: number;
  enablementCompletionPct: number;
  performanceScore: number;   // composite 0-100
  calculatedAt: number;
}

interface DealRegistration {
  registrationId: string;
  partnerId: string;
  partnerName: string;
  prospectName: string;
  estimatedValue: number;
  productLine: string;
  registeredAt: number;
  expiryDate: number;
  status: 'pending' | 'approved' | 'rejected' | 'won' | 'lost' | 'expired';
  approvedBy?: string;
  outcome?: 'partner_won' | 'direct_won' | 'lost';
}

interface PartnerEnablementTrack {
  trackId: string;
  partnerId: string;
  programName: string;
  modulesTotal: number;
  modulesCompleted: number;
  completionPct: number;
  certificationEarned: boolean;
  certificationExpiryDate?: number;
  lastActivityAt: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  createdAt: number;
}

interface ChannelHealthReport {
  reportId: string;
  period: string;
  totalActivePartners: number;
  partnerSourcedRevenuePct: number;
  avgPartnerPerformanceScore: number;
  topPerformingPartner: string;
  atRiskPartners: number;
  dealRegistrationApprovalRatePct: number;
  channelHealthScore: number;
  generatedAt: number;
}

class PartnerPerformanceTracker {
  private records: Map<string, PartnerPerformanceRecord[]> = new Map();
  private counter = 0;

  record(partnerId: string, partnerName: string, tier: PartnerPerformanceRecord['partnerTier'], period: string, pipelineGenerated: number, revenueAttribued: number, dealsWon: number, dealsLost: number, certifiedReps: number, enablementPct: number): PartnerPerformanceRecord {
    const totalDeals = dealsWon + dealsLost;
    const winRatePct = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
    const avgDealSize = dealsWon > 0 ? revenueAttribued / dealsWon : 0;
    const tierBonus = { platinum: 20, gold: 15, silver: 10, registered: 0 }[tier];
    const performanceScore = Math.min(100,
      winRatePct * 0.3 + Math.min(40, enablementPct * 0.4) + Math.min(30, certifiedReps * 5) + tierBonus * 0.1
    );

    const recordId = `partnerperf-${Date.now()}-${++this.counter}`;
    const record: PartnerPerformanceRecord = {
      recordId, partnerId, partnerName, partnerTier: tier, period, pipelineGenerated,
      revenueAttribued, dealsWon, dealsLost, winRatePct, avgDealSize, certifiedReps,
      enablementCompletionPct: enablementPct, performanceScore: Math.max(0, performanceScore), calculatedAt: Date.now()
    };
    const history = this.records.get(partnerId) || [];
    history.push(record);
    this.records.set(partnerId, history);
    logger.debug('Partner performance recorded', { partnerId, performanceScore });
    return record;
  }

  getTopPartners(limit = 5): PartnerPerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is PartnerPerformanceRecord => !!r)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getAtRisk(threshold = 40): PartnerPerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is PartnerPerformanceRecord => !!r && r.performanceScore < threshold);
  }

  getLatest(partnerId: string): PartnerPerformanceRecord | undefined {
    const history = this.records.get(partnerId) || [];
    return history[history.length - 1];
  }
}

class DealRegistrationManager {
  private registrations: Map<string, DealRegistration> = new Map();
  private counter = 0;

  register(partnerId: string, partnerName: string, prospectName: string, estimatedValue: number, productLine: string): DealRegistration {
    const registrationId = `dealreg-${Date.now()}-${++this.counter}`;
    const registration: DealRegistration = {
      registrationId, partnerId, partnerName, prospectName, estimatedValue, productLine,
      registeredAt: Date.now(), expiryDate: Date.now() + 90 * 86400 * 1000,
      status: 'pending'
    };
    this.registrations.set(registrationId, registration);
    return registration;
  }

  approve(registrationId: string, approvedBy: string): boolean {
    const reg = this.registrations.get(registrationId);
    if (!reg) return false;
    reg.status = 'approved';
    reg.approvedBy = approvedBy;
    return true;
  }

  closeWon(registrationId: string): boolean {
    const reg = this.registrations.get(registrationId);
    if (!reg) return false;
    reg.status = 'won';
    reg.outcome = 'partner_won';
    return true;
  }

  getApprovalRate(): number {
    const decided = Array.from(this.registrations.values()).filter(r => r.status !== 'pending');
    if (!decided.length) return 0;
    return (decided.filter(r => r.status === 'approved' || r.status === 'won').length / decided.length) * 100;
  }

  getPending(): DealRegistration[] {
    return Array.from(this.registrations.values()).filter(r => r.status === 'pending');
  }
}

class PartnerEnablementManager {
  private tracks: Map<string, PartnerEnablementTrack[]> = new Map();
  private counter = 0;

  enroll(partnerId: string, programName: string, modulesTotal: number): PartnerEnablementTrack {
    const trackId = `enabletrack-${Date.now()}-${++this.counter}`;
    const track: PartnerEnablementTrack = {
      trackId, partnerId, programName, modulesTotal, modulesCompleted: 0,
      completionPct: 0, certificationEarned: false, lastActivityAt: Date.now(),
      status: 'not_started', createdAt: Date.now()
    };
    const existing = this.tracks.get(partnerId) || [];
    existing.push(track);
    this.tracks.set(partnerId, existing);
    return track;
  }

  progress(trackId: string, modulesCompleted: number): boolean {
    for (const list of this.tracks.values()) {
      const track = list.find(t => t.trackId === trackId);
      if (!track) continue;
      track.modulesCompleted = Math.min(modulesCompleted, track.modulesTotal);
      track.completionPct = track.modulesTotal > 0 ? (track.modulesCompleted / track.modulesTotal) * 100 : 0;
      track.certificationEarned = track.completionPct >= 100;
      track.status = track.completionPct >= 100 ? 'completed' : track.modulesCompleted > 0 ? 'in_progress' : 'not_started';
      if (track.certificationEarned) track.certificationExpiryDate = Date.now() + 365 * 86400 * 1000;
      track.lastActivityAt = Date.now();
      return true;
    }
    return false;
  }

  getCompletionRate(partnerId: string): number {
    const tracks = this.tracks.get(partnerId) || [];
    if (!tracks.length) return 0;
    return tracks.reduce((s, t) => s + t.completionPct, 0) / tracks.length;
  }

  getNotStarted(): PartnerEnablementTrack[] {
    return Array.from(this.tracks.values()).flat().filter(t => t.status === 'not_started');
  }
}

class ChannelHealthAnalyzer {
  private reports: ChannelHealthReport[] = [];
  private counter = 0;

  generate(period: string, activePartners: number, totalRevenue: number, partnerRevenue: number, avgPerformanceScore: number, topPartner: string, atRiskCount: number, approvalRate: number): ChannelHealthReport {
    const partnerSourcedRevenuePct = totalRevenue > 0 ? (partnerRevenue / totalRevenue) * 100 : 0;
    const channelHealthScore = avgPerformanceScore * 0.4 + Math.min(40, partnerSourcedRevenuePct) + Math.min(20, approvalRate * 0.2);

    const reportId = `chanhealth-${Date.now()}-${++this.counter}`;
    const report: ChannelHealthReport = {
      reportId, period, totalActivePartners: activePartners, partnerSourcedRevenuePct,
      avgPartnerPerformanceScore: avgPerformanceScore, topPerformingPartner: topPartner,
      atRiskPartners: atRiskCount, dealRegistrationApprovalRatePct: approvalRate,
      channelHealthScore: Math.max(0, Math.min(100, channelHealthScore)), generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): ChannelHealthReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

export const partnerPerformanceTracker = new PartnerPerformanceTracker();
export const dealRegistrationManager = new DealRegistrationManager();
export const partnerEnablementManager = new PartnerEnablementManager();
export const channelHealthAnalyzer = new ChannelHealthAnalyzer();

export { PartnerPerformanceRecord, DealRegistration, PartnerEnablementTrack, ChannelHealthReport };
