/**
 * Phase 240: Account-Based Marketing Intelligence
 * Target account management, engagement scoring, ABM campaign tracking, account intelligence
 */

import { logger } from './logger';

interface TargetAccount {
  accountId: string;
  companyName: string;
  industry: string;
  revenue: number;
  employeeCount: number;
  tier: 'tier1' | 'tier2' | 'tier3';
  icp_score: number;   // Ideal Customer Profile fit 0-100
  engagementScore: number;
  stage: 'identified' | 'engaged' | 'opportunity' | 'customer' | 'expansion';
  assignedRep: string;
  addedAt: number;
}

interface AccountEngagementSignal {
  signalId: string;
  accountId: string;
  signalType: 'website_visit' | 'content_download' | 'webinar_attend' | 'ad_click' | 'email_open' | 'demo_request' | 'pricing_view';
  signalWeight: number;  // contribution to engagement score
  source: string;
  recordedAt: number;
}

interface ABMCampaign {
  campaignId: string;
  name: string;
  targetTier: TargetAccount['tier'];
  targetIndustries: string[];
  accountsTargeted: number;
  accountsEngaged: number;
  engagementRate: number;
  pipelineInfluenced: number;
  revenueInfluenced: number;
  status: 'planning' | 'active' | 'paused' | 'completed';
  startDate: number;
  endDate?: number;
  createdAt: number;
}

interface AccountIntelligenceReport {
  reportId: string;
  accountId: string;
  buyingSignals: string[];
  competitorPresence: string[];
  techStack: string[];
  recentNewsEvents: string[];
  decisionMakers: number;
  budgetCycle: string;
  propensityScore: number;  // 0-100
  generatedAt: number;
}

class TargetAccountManager {
  private accounts: Map<string, TargetAccount> = new Map();
  private counter = 0;

  add(companyName: string, industry: string, revenue: number, employees: number, icpScore: number, assignedRep: string): TargetAccount {
    const tier: TargetAccount['tier'] = revenue >= 100000000 ? 'tier1' : revenue >= 10000000 ? 'tier2' : 'tier3';
    const accountId = `abmacc-${Date.now()}-${++this.counter}`;
    const account: TargetAccount = {
      accountId, companyName, industry, revenue, employeeCount: employees,
      tier, icp_score: Math.max(0, Math.min(100, icpScore)), engagementScore: 0,
      stage: 'identified', assignedRep, addedAt: Date.now()
    };
    this.accounts.set(accountId, account);
    logger.debug('Target account added', { accountId, companyName, tier, icpScore });
    return account;
  }

  updateEngagement(accountId: string, score: number): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;
    account.engagementScore = Math.max(0, Math.min(100, score));
    if (score >= 70 && account.stage === 'identified') account.stage = 'engaged';
    return true;
  }

  advanceStage(accountId: string, stage: TargetAccount['stage']): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;
    account.stage = stage;
    return true;
  }

  getByTier(tier: TargetAccount['tier']): TargetAccount[] {
    return Array.from(this.accounts.values()).filter(a => a.tier === tier);
  }

  getHighEngagement(threshold = 60): TargetAccount[] {
    return Array.from(this.accounts.values())
      .filter(a => a.engagementScore >= threshold)
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }

  getAccount(accountId: string): TargetAccount | undefined {
    return this.accounts.get(accountId);
  }
}

class EngagementSignalTracker {
  private signals: Map<string, AccountEngagementSignal[]> = new Map();
  private counter = 0;
  private readonly weights: Record<AccountEngagementSignal['signalType'], number> = {
    website_visit: 1, content_download: 5, webinar_attend: 10,
    ad_click: 2, email_open: 1, demo_request: 20, pricing_view: 15
  };

  record(accountId: string, signalType: AccountEngagementSignal['signalType'], source: string): AccountEngagementSignal {
    const signalId = `abmsig-${Date.now()}-${++this.counter}`;
    const signal: AccountEngagementSignal = {
      signalId, accountId, signalType,
      signalWeight: this.weights[signalType], source, recordedAt: Date.now()
    };
    const existing = this.signals.get(accountId) || [];
    existing.push(signal);
    this.signals.set(accountId, existing);
    return signal;
  }

  getEngagementScore(accountId: string, windowDays = 30): number {
    const since = Date.now() - windowDays * 86400 * 1000;
    const recent = (this.signals.get(accountId) || []).filter(s => s.recordedAt >= since);
    return Math.min(100, recent.reduce((s, sig) => s + sig.signalWeight, 0));
  }

  getHotAccounts(threshold = 50, windowDays = 30): string[] {
    return Array.from(this.signals.keys())
      .filter(id => this.getEngagementScore(id, windowDays) >= threshold);
  }
}

class ABMCampaignManager {
  private campaigns: Map<string, ABMCampaign> = new Map();
  private counter = 0;

  create(name: string, targetTier: ABMCampaign['targetTier'], targetIndustries: string[], accountsTargeted: number): ABMCampaign {
    const campaignId = `abmcamp-${Date.now()}-${++this.counter}`;
    const campaign: ABMCampaign = {
      campaignId, name, targetTier, targetIndustries, accountsTargeted,
      accountsEngaged: 0, engagementRate: 0, pipelineInfluenced: 0,
      revenueInfluenced: 0, status: 'planning', startDate: Date.now(), createdAt: Date.now()
    };
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  updateMetrics(campaignId: string, engaged: number, pipelineValue: number, revenueValue: number): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;
    campaign.accountsEngaged = engaged;
    campaign.engagementRate = campaign.accountsTargeted > 0 ? (engaged / campaign.accountsTargeted) * 100 : 0;
    campaign.pipelineInfluenced = pipelineValue;
    campaign.revenueInfluenced = revenueValue;
    return true;
  }

  getTopPerforming(limit = 5): ABMCampaign[] {
    return Array.from(this.campaigns.values())
      .sort((a, b) => b.revenueInfluenced - a.revenueInfluenced)
      .slice(0, limit);
  }

  getCampaign(campaignId: string): ABMCampaign | undefined {
    return this.campaigns.get(campaignId);
  }
}

class AccountIntelligenceEngine {
  private reports: Map<string, AccountIntelligenceReport> = new Map();
  private counter = 0;

  generate(accountId: string, buyingSignals: string[], competitors: string[], techStack: string[], newsEvents: string[], decisionMakers: number, budgetCycle: string): AccountIntelligenceReport {
    const propensityScore = Math.min(100,
      buyingSignals.length * 15 + decisionMakers * 5 + (techStack.length > 3 ? 20 : 10)
    );
    const reportId = `accintell-${Date.now()}-${++this.counter}`;
    const report: AccountIntelligenceReport = {
      reportId, accountId, buyingSignals, competitorPresence: competitors,
      techStack, recentNewsEvents: newsEvents, decisionMakers, budgetCycle,
      propensityScore: Math.min(100, propensityScore), generatedAt: Date.now()
    };
    this.reports.set(accountId, report);
    logger.debug('Account intelligence generated', { accountId, propensityScore });
    return report;
  }

  getHighPropensity(threshold = 70): AccountIntelligenceReport[] {
    return Array.from(this.reports.values())
      .filter(r => r.propensityScore >= threshold)
      .sort((a, b) => b.propensityScore - a.propensityScore);
  }

  getReport(accountId: string): AccountIntelligenceReport | undefined {
    return this.reports.get(accountId);
  }
}

export const targetAccountManager = new TargetAccountManager();
export const engagementSignalTracker = new EngagementSignalTracker();
export const abmCampaignManager = new ABMCampaignManager();
export const accountIntelligenceEngine = new AccountIntelligenceEngine();

export { TargetAccount, AccountEngagementSignal, ABMCampaign, AccountIntelligenceReport };
