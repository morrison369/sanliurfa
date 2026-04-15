/**
 * Phase 282: Grants & Funding Intelligence
 * Grant pipeline, application success rates, funding source analytics, compliance tracking
 */

import { logger } from './logger';

interface GrantOpportunityRecord {
  opportunityId: string;
  title: string;
  fundingBody: string;
  grantType: 'research' | 'innovation' | 'infrastructure' | 'social_impact' | 'export' | 'sustainability';
  totalFundingAvailable: number;
  maxAwardAmount: number;
  applicationDeadline: number;
  eligibilityCriteria: string[];
  matchingRequiredPct: number;   // co-funding required
  estimatedSuccessPct: number;
  strategicFit: number;          // 0-100
  status: 'identified' | 'evaluating' | 'applying' | 'submitted' | 'won' | 'lost' | 'withdrawn';
  createdAt: number;
}

interface GrantApplicationRecord {
  applicationId: string;
  opportunityId: string;
  projectName: string;
  requestedAmount: number;
  matchingAmount: number;
  submittedAt?: number;
  decisionAt?: number;
  awardedAmount: number;
  applicationScore?: number;     // feedback score from funder
  rejectionReason?: string;
  status: 'drafting' | 'internal_review' | 'submitted' | 'awarded' | 'rejected' | 'withdrawn';
  leadApplicant: string;
  partnerOrganizations: string[];
  createdAt: number;
}

interface FundingPortfolioRecord {
  recordId: string;
  period: string;
  totalFundingReceived: number;
  totalApplicationsSubmitted: number;
  totalApplicationsAwarded: number;
  successRatePct: number;
  totalRequestedAmount: number;
  totalAwardedAmount: number;
  conversionRatioPct: number;    // awarded / requested × 100
  avgAwardAmount: number;
  fundingByType: Record<string, number>;
  calculatedAt: number;
}

interface GrantComplianceRecord {
  complianceId: string;
  applicationId: string;
  grantTitle: string;
  reportingDeadlines: number[];
  reportsSubmitted: number;
  reportsDue: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  spendCompliance: boolean;       // spend within approved budget
  overallComplianceScore: number; // 0-100
  auditRisk: 'low' | 'medium' | 'high';
  recordedAt: number;
}

class GrantOpportunityManager {
  private opportunities: Map<string, GrantOpportunityRecord> = new Map();
  private counter = 0;

  identify(title: string, fundingBody: string, type: GrantOpportunityRecord['grantType'], maxAward: number, deadline: number, matchingPct: number, eligibility: string[]): GrantOpportunityRecord {
    const opportunityId = `grant-${Date.now()}-${++this.counter}`;
    const opportunity: GrantOpportunityRecord = {
      opportunityId, title, fundingBody, grantType: type, totalFundingAvailable: maxAward * 10,
      maxAwardAmount: maxAward, applicationDeadline: deadline, eligibilityCriteria: eligibility,
      matchingRequiredPct: matchingPct, estimatedSuccessPct: 30, strategicFit: 50,
      status: 'identified', createdAt: Date.now()
    };
    this.opportunities.set(opportunityId, opportunity);
    logger.debug('Grant opportunity identified', { opportunityId, title, type });
    return opportunity;
  }

  evaluate(opportunityId: string, estimatedSuccess: number, strategicFit: number): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;
    opp.estimatedSuccessPct = estimatedSuccess;
    opp.strategicFit = strategicFit;
    opp.status = 'evaluating';
    return true;
  }

  getDeadlineSoon(days = 30): GrantOpportunityRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.opportunities.values())
      .filter(o => ['identified', 'evaluating', 'applying'].includes(o.status) && o.applicationDeadline <= horizon)
      .sort((a, b) => a.applicationDeadline - b.applicationDeadline);
  }

  getHighPriorityOpportunities(fitThreshold = 70): GrantOpportunityRecord[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.strategicFit >= fitThreshold && o.status !== 'won' && o.status !== 'lost')
      .sort((a, b) => b.strategicFit - a.strategicFit);
  }

  getOpportunity(id: string): GrantOpportunityRecord | undefined {
    return this.opportunities.get(id);
  }
}

class GrantApplicationTracker {
  private applications: Map<string, GrantApplicationRecord> = new Map();
  private counter = 0;

  create(opportunityId: string, projectName: string, requested: number, matching: number, lead: string, partners: string[]): GrantApplicationRecord {
    const applicationId = `grantapp-${Date.now()}-${++this.counter}`;
    const application: GrantApplicationRecord = {
      applicationId, opportunityId, projectName, requestedAmount: requested,
      matchingAmount: matching, awardedAmount: 0, status: 'drafting',
      leadApplicant: lead, partnerOrganizations: partners, createdAt: Date.now()
    };
    this.applications.set(applicationId, application);
    return application;
  }

  submit(applicationId: string): boolean {
    const app = this.applications.get(applicationId);
    if (!app) return false;
    app.status = 'submitted';
    app.submittedAt = Date.now();
    return true;
  }

  recordDecision(applicationId: string, awarded: boolean, amount: number, score?: number, reason?: string): boolean {
    const app = this.applications.get(applicationId);
    if (!app) return false;
    app.status = awarded ? 'awarded' : 'rejected';
    app.decisionAt = Date.now();
    app.awardedAmount = awarded ? amount : 0;
    if (score !== undefined) app.applicationScore = score;
    if (reason) app.rejectionReason = reason;
    return true;
  }

  getSuccessRate(): number {
    const decided = Array.from(this.applications.values()).filter(a => a.status === 'awarded' || a.status === 'rejected');
    if (!decided.length) return 0;
    return (decided.filter(a => a.status === 'awarded').length / decided.length) * 100;
  }

  getTotalAwarded(): number {
    return Array.from(this.applications.values()).reduce((s, a) => s + a.awardedAmount, 0);
  }

  getPendingDecisions(): GrantApplicationRecord[] {
    return Array.from(this.applications.values()).filter(a => a.status === 'submitted');
  }
}

class FundingPortfolioAnalyzer {
  private records: FundingPortfolioRecord[] = [];
  private counter = 0;

  analyze(period: string, applications: GrantApplicationRecord[]): FundingPortfolioRecord {
    const submitted = applications.filter(a => a.status !== 'drafting');
    const awarded = applications.filter(a => a.status === 'awarded');
    const totalRequested = submitted.reduce((s, a) => s + a.requestedAmount, 0);
    const totalAwarded = awarded.reduce((s, a) => s + a.awardedAmount, 0);
    const byType: Record<string, number> = {};

    const recordId = `fundport-${Date.now()}-${++this.counter}`;
    const record: FundingPortfolioRecord = {
      recordId, period, totalFundingReceived: totalAwarded,
      totalApplicationsSubmitted: submitted.length, totalApplicationsAwarded: awarded.length,
      successRatePct: submitted.length > 0 ? (awarded.length / submitted.length) * 100 : 0,
      totalRequestedAmount: totalRequested, totalAwardedAmount: totalAwarded,
      conversionRatioPct: totalRequested > 0 ? (totalAwarded / totalRequested) * 100 : 0,
      avgAwardAmount: awarded.length > 0 ? totalAwarded / awarded.length : 0,
      fundingByType: byType, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): FundingPortfolioRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getTotalFundingSecured(): number {
    return this.records.reduce((s, r) => s + r.totalFundingReceived, 0);
  }
}

class GrantComplianceTracker {
  private records: Map<string, GrantComplianceRecord> = new Map();
  private counter = 0;

  track(applicationId: string, grantTitle: string, reportingDeadlines: number[], milestonesTotal: number): GrantComplianceRecord {
    const complianceId = `grantcomp-${Date.now()}-${++this.counter}`;
    const record: GrantComplianceRecord = {
      complianceId, applicationId, grantTitle, reportingDeadlines,
      reportsSubmitted: 0, reportsDue: reportingDeadlines.filter(d => d <= Date.now()).length,
      milestonesCompleted: 0, milestonesTotal, spendCompliance: true,
      overallComplianceScore: 100, auditRisk: 'low', recordedAt: Date.now()
    };
    this.records.set(applicationId, record);
    return record;
  }

  updateProgress(applicationId: string, reportsSubmitted: number, milestonesCompleted: number, spendCompliant: boolean): boolean {
    const record = this.records.get(applicationId);
    if (!record) return false;
    record.reportsSubmitted = reportsSubmitted;
    record.milestonesCompleted = milestonesCompleted;
    record.spendCompliance = spendCompliant;

    const reportScore = record.reportsDue > 0 ? (reportsSubmitted / Math.max(record.reportsDue, 1)) * 40 : 40;
    const milestoneScore = record.milestonesTotal > 0 ? (milestonesCompleted / record.milestonesTotal) * 40 : 40;
    const spendScore = spendCompliant ? 20 : 0;
    record.overallComplianceScore = Math.min(100, reportScore + milestoneScore + spendScore);
    record.auditRisk = record.overallComplianceScore >= 80 ? 'low' : record.overallComplianceScore >= 60 ? 'medium' : 'high';
    return true;
  }

  getHighRiskGrants(): GrantComplianceRecord[] {
    return Array.from(this.records.values()).filter(r => r.auditRisk === 'high');
  }

  getOverallComplianceAvg(): number {
    const records = Array.from(this.records.values());
    if (!records.length) return 0;
    return records.reduce((s, r) => s + r.overallComplianceScore, 0) / records.length;
  }
}

export const grantOpportunityManager = new GrantOpportunityManager();
export const grantApplicationTracker = new GrantApplicationTracker();
export const fundingPortfolioAnalyzer = new FundingPortfolioAnalyzer();
export const grantComplianceTracker = new GrantComplianceTracker();

export { GrantOpportunityRecord, GrantApplicationRecord, FundingPortfolioRecord, GrantComplianceRecord };
