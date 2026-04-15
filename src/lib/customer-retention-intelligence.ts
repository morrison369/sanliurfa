/**
 * Phase 266: Customer Retention Intelligence
 * Churn prediction, save desk analytics, loyalty driver analysis, win-back campaigns
 */

import { logger } from './logger';

interface ChurnRiskProfile {
  profileId: string;
  customerId: string;
  segment: string;
  churnProbabilityPct: number;
  churnRisk: 'critical' | 'high' | 'medium' | 'low';
  topChurnSignals: string[];      // key reasons driving churn risk
  daysSinceLastLogin: number;
  supportTicketsLast90Days: number;
  usageDropPct: number;           // % decline in feature usage
  npsScore?: number;
  retentionValue: number;         // revenue at risk if churned
  recommendedIntervention: string;
  calculatedAt: number;
}

interface RetentionIntervention {
  interventionId: string;
  customerId: string;
  interventionType: 'outreach_call' | 'discount_offer' | 'feature_demo' | 'success_review' | 'executive_sponsor';
  assignedTo: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
  outcome?: 'retained' | 'churned' | 'pending' | 'no_response';
  revenueRetained?: number;
  createdAt: number;
  resolvedAt?: number;
}

interface ChurnCohortAnalysis {
  cohortId: string;
  cohortPeriod: string;   // when customers were acquired, e.g. '2025-Q1'
  cohortSize: number;
  retainedAfter30Days: number;
  retainedAfter90Days: number;
  retainedAfter180Days: number;
  retainedAfter365Days: number;
  retention30DayPct: number;
  retention90DayPct: number;
  retention180DayPct: number;
  retention365DayPct: number;
  avgLTVRetained: number;
  calculatedAt: number;
}

interface WinBackCampaign {
  campaignId: string;
  name: string;
  targetSegment: string;
  churnedCustomerIds: string[];
  offerType: 'discount' | 'free_trial' | 'new_features' | 'personalized_outreach';
  discountPct: number;
  sentCount: number;
  responseCount: number;
  wonBackCount: number;
  responseRatePct: number;
  winBackRatePct: number;
  revenueRecovered: number;
  status: 'draft' | 'active' | 'completed';
  createdAt: number;
}

class ChurnPredictionEngine {
  private profiles: Map<string, ChurnRiskProfile[]> = new Map();
  private counter = 0;

  predict(customerId: string, segment: string, daysSinceLogin: number, supportTickets: number, usageDropPct: number, npsScore: number | undefined, retentionValue: number): ChurnRiskProfile {
    // Score each signal
    const loginSignal = Math.min(40, daysSinceLogin * 0.5);
    const supportSignal = Math.min(20, supportTickets * 5);
    const usageSignal = Math.min(30, usageDropPct * 0.5);
    const npsSignal = npsScore !== undefined ? Math.max(0, (6 - npsScore) * 2) : 5;
    const churnProbabilityPct = Math.min(100, loginSignal + supportSignal + usageSignal + npsSignal);

    const churnRisk: ChurnRiskProfile['churnRisk'] =
      churnProbabilityPct >= 70 ? 'critical' : churnProbabilityPct >= 50 ? 'high' :
      churnProbabilityPct >= 25 ? 'medium' : 'low';

    const topChurnSignals: string[] = [];
    if (daysSinceLogin > 30) topChurnSignals.push(`Inactive ${daysSinceLogin} days`);
    if (supportTickets > 3) topChurnSignals.push(`${supportTickets} support tickets`);
    if (usageDropPct > 30) topChurnSignals.push(`${usageDropPct}% usage decline`);
    if (npsScore !== undefined && npsScore <= 6) topChurnSignals.push(`Low NPS: ${npsScore}`);

    const recommendedIntervention =
      churnRisk === 'critical' ? 'Immediate executive call + retention offer' :
      churnRisk === 'high' ? 'Success manager outreach within 48h' :
      churnRisk === 'medium' ? 'Automated nurture + feature demo invite' :
      'Standard engagement cadence';

    const profileId = `churnprofile-${Date.now()}-${++this.counter}`;
    const profile: ChurnRiskProfile = {
      profileId, customerId, segment, churnProbabilityPct, churnRisk, topChurnSignals,
      daysSinceLastLogin: daysSinceLogin, supportTicketsLast90Days: supportTickets,
      usageDropPct, npsScore, retentionValue, recommendedIntervention, calculatedAt: Date.now()
    };
    const history = this.profiles.get(customerId) || [];
    history.push(profile);
    this.profiles.set(customerId, history);
    logger.debug('Churn risk predicted', { customerId, churnProbabilityPct, churnRisk });
    return profile;
  }

  getAtRisk(minRisk: ChurnRiskProfile['churnRisk'] = 'high'): ChurnRiskProfile[] {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const threshold = riskOrder[minRisk];
    return Array.from(this.profiles.values())
      .map(h => h[h.length - 1])
      .filter((p): p is ChurnRiskProfile => !!p && riskOrder[p.churnRisk] <= threshold)
      .sort((a, b) => b.retentionValue - a.retentionValue);
  }

  getTotalRetentionValueAtRisk(): number {
    return this.getAtRisk('high').reduce((s, p) => s + p.retentionValue, 0);
  }

  getLatest(customerId: string): ChurnRiskProfile | undefined {
    const history = this.profiles.get(customerId) || [];
    return history[history.length - 1];
  }
}

class RetentionInterventionTracker {
  private interventions: Map<string, RetentionIntervention[]> = new Map();
  private counter = 0;

  create(customerId: string, interventionType: RetentionIntervention['interventionType'], assignedTo: string, urgency: RetentionIntervention['urgency']): RetentionIntervention {
    const interventionId = `retention-${Date.now()}-${++this.counter}`;
    const intervention: RetentionIntervention = {
      interventionId, customerId, interventionType, assignedTo, urgency,
      outcome: 'pending', createdAt: Date.now()
    };
    const existing = this.interventions.get(customerId) || [];
    existing.push(intervention);
    this.interventions.set(customerId, existing);
    return intervention;
  }

  resolve(interventionId: string, outcome: RetentionIntervention['outcome'], revenueRetained = 0): boolean {
    for (const list of this.interventions.values()) {
      const inv = list.find(i => i.interventionId === interventionId);
      if (inv) {
        inv.outcome = outcome;
        inv.revenueRetained = revenueRetained;
        inv.resolvedAt = Date.now();
        return true;
      }
    }
    return false;
  }

  getSuccessRate(): number {
    const resolved = Array.from(this.interventions.values()).flat()
      .filter(i => i.outcome && i.outcome !== 'pending');
    if (!resolved.length) return 0;
    return (resolved.filter(i => i.outcome === 'retained').length / resolved.length) * 100;
  }

  getTotalRevenueRetained(): number {
    return Array.from(this.interventions.values()).flat()
      .filter(i => i.outcome === 'retained')
      .reduce((s, i) => s + (i.revenueRetained || 0), 0);
  }
}

class ChurnCohortAnalyzer {
  private cohorts: Map<string, ChurnCohortAnalysis> = new Map();
  private counter = 0;

  analyze(cohortPeriod: string, cohortSize: number, retained30: number, retained90: number, retained180: number, retained365: number, avgLTVRetained: number): ChurnCohortAnalysis {
    const cohortId = `cohort-${Date.now()}-${++this.counter}`;
    const cohort: ChurnCohortAnalysis = {
      cohortId, cohortPeriod, cohortSize,
      retainedAfter30Days: retained30, retainedAfter90Days: retained90,
      retainedAfter180Days: retained180, retainedAfter365Days: retained365,
      retention30DayPct: cohortSize > 0 ? (retained30 / cohortSize) * 100 : 0,
      retention90DayPct: cohortSize > 0 ? (retained90 / cohortSize) * 100 : 0,
      retention180DayPct: cohortSize > 0 ? (retained180 / cohortSize) * 100 : 0,
      retention365DayPct: cohortSize > 0 ? (retained365 / cohortSize) * 100 : 0,
      avgLTVRetained, calculatedAt: Date.now()
    };
    this.cohorts.set(cohortPeriod, cohort);
    return cohort;
  }

  getBestRetainingCohort(): ChurnCohortAnalysis | undefined {
    return Array.from(this.cohorts.values())
      .sort((a, b) => b.retention365DayPct - a.retention365DayPct)[0];
  }

  getCohort(period: string): ChurnCohortAnalysis | undefined {
    return this.cohorts.get(period);
  }
}

class WinBackCampaignManager {
  private campaigns: Map<string, WinBackCampaign> = new Map();
  private counter = 0;

  create(name: string, targetSegment: string, churnedCustomerIds: string[], offerType: WinBackCampaign['offerType'], discountPct: number): WinBackCampaign {
    const campaignId = `winback-${Date.now()}-${++this.counter}`;
    const campaign: WinBackCampaign = {
      campaignId, name, targetSegment, churnedCustomerIds, offerType, discountPct,
      sentCount: 0, responseCount: 0, wonBackCount: 0,
      responseRatePct: 0, winBackRatePct: 0, revenueRecovered: 0,
      status: 'draft', createdAt: Date.now()
    };
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  updateResults(campaignId: string, sentCount: number, responseCount: number, wonBackCount: number, revenueRecovered: number): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;
    campaign.sentCount = sentCount;
    campaign.responseCount = responseCount;
    campaign.wonBackCount = wonBackCount;
    campaign.revenueRecovered = revenueRecovered;
    campaign.responseRatePct = sentCount > 0 ? (responseCount / sentCount) * 100 : 0;
    campaign.winBackRatePct = sentCount > 0 ? (wonBackCount / sentCount) * 100 : 0;
    campaign.status = 'completed';
    return true;
  }

  getBestPerforming(limit = 3): WinBackCampaign[] {
    return Array.from(this.campaigns.values())
      .filter(c => c.status === 'completed')
      .sort((a, b) => b.winBackRatePct - a.winBackRatePct)
      .slice(0, limit);
  }

  getTotalRevenueRecovered(): number {
    return Array.from(this.campaigns.values()).reduce((s, c) => s + c.revenueRecovered, 0);
  }
}

export const churnPredictionEngine = new ChurnPredictionEngine();
export const retentionInterventionTracker = new RetentionInterventionTracker();
export const churnCohortAnalyzer = new ChurnCohortAnalyzer();
export const winBackCampaignManager = new WinBackCampaignManager();

export { ChurnRiskProfile, RetentionIntervention, ChurnCohortAnalysis, WinBackCampaign };
