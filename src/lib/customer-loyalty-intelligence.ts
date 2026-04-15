/**
 * Phase 306: Customer Loyalty Intelligence
 * Loyalty program analytics, tier management, rewards optimization, churn prevention
 */

import { logger } from './logger';

interface LoyaltyMemberRecord {
  memberId: string;
  customerId: string;
  customerName: string;
  segment: string;
  enrollmentDate: number;
  currentTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  tierSinceDate: number;
  lifetimePointsEarned: number;
  currentPointBalance: number;
  lifetimeSpendUSD: number;
  lastActivityDate: number;
  redemptionRatePct: number;      // points redeemed / earned
  engagementScore: number;        // 0-100
  churnRiskScore: number;         // 0-100 (higher = more at risk)
  npsScore?: number;
  status: 'active' | 'inactive' | 'churned' | 'suspended';
  createdAt: number;
}

interface LoyaltyTransactionRecord {
  transactionId: string;
  memberId: string;
  transactionType: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  points: number;
  spendAmountUSD?: number;
  earningMultiplier?: number;
  rewardRedeemed?: string;
  transactionDate: number;
  channel: 'online' | 'in_store' | 'mobile' | 'partner' | 'referral';
  balanceAfter: number;
}

interface LoyaltyProgramMetricsRecord {
  recordId: string;
  period: string;
  totalActiveMembers: number;
  newEnrollments: number;
  churnedMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  redemptionRatePct: number;
  avgPointsPerMember: number;
  programLiabilityUSD: number;    // outstanding points × redemption value
  revenueInfluencedUSD: number;
  costOfRewardsUSD: number;
  programROIPct: number;
  tierDistribution: Record<string, number>;
  calculatedAt: number;
}

interface ChurnPreventionRecord {
  recordId: string;
  memberId: string;
  customerId: string;
  churnRiskScore: number;
  riskFactors: string[];
  daysSinceLastActivity: number;
  pointsAboutToExpire: number;
  recommendedIntervention: 'bonus_points' | 'personalized_offer' | 'tier_retention' | 'reactivation_campaign' | 'vip_outreach';
  interventionValueUSD: number;
  expectedRetentionProbabilityPct: number;
  lifetimeValueAtRiskUSD: number;
  identifiedAt: number;
}

class LoyaltyMemberManager {
  private members: Map<string, LoyaltyMemberRecord> = new Map();
  private counter = 0;

  enroll(customerId: string, name: string, segment: string): LoyaltyMemberRecord {
    const memberId = `loy-${Date.now()}-${++this.counter}`;
    const record: LoyaltyMemberRecord = {
      memberId, customerId, customerName: name, segment,
      enrollmentDate: Date.now(), currentTier: 'bronze', tierSinceDate: Date.now(),
      lifetimePointsEarned: 0, currentPointBalance: 0, lifetimeSpendUSD: 0,
      lastActivityDate: Date.now(), redemptionRatePct: 0, engagementScore: 50,
      churnRiskScore: 20, status: 'active', createdAt: Date.now()
    };
    this.members.set(memberId, record);
    logger.debug('Loyalty member enrolled', { memberId, customerId });
    return record;
  }

  updateActivity(memberId: string, pointsEarned: number, spend: number, redeemed: number, engagementScore: number): boolean {
    const m = this.members.get(memberId);
    if (!m) return false;
    m.lifetimePointsEarned += pointsEarned;
    m.currentPointBalance = Math.max(0, m.currentPointBalance + pointsEarned - redeemed);
    m.lifetimeSpendUSD += spend;
    m.lastActivityDate = Date.now();
    m.redemptionRatePct = m.lifetimePointsEarned > 0 ? Math.round(((m.lifetimePointsEarned - m.currentPointBalance) / m.lifetimePointsEarned) * 100) : 0;
    m.engagementScore = Math.max(0, Math.min(100, engagementScore));
    m.currentTier = this.calculateTier(m.lifetimeSpendUSD);
    m.churnRiskScore = Math.max(0, 100 - engagementScore);
    return true;
  }

  private calculateTier(lifetimeSpend: number): LoyaltyMemberRecord['currentTier'] {
    if (lifetimeSpend >= 100000) return 'diamond';
    if (lifetimeSpend >= 50000) return 'platinum';
    if (lifetimeSpend >= 20000) return 'gold';
    if (lifetimeSpend >= 5000) return 'silver';
    return 'bronze';
  }

  getAtRiskMembers(churnThreshold = 70): LoyaltyMemberRecord[] {
    return Array.from(this.members.values())
      .filter(m => m.churnRiskScore >= churnThreshold && m.status === 'active')
      .sort((a, b) => b.churnRiskScore - a.churnRiskScore);
  }

  getByTier(tier: LoyaltyMemberRecord['currentTier']): LoyaltyMemberRecord[] {
    return Array.from(this.members.values()).filter(m => m.currentTier === tier && m.status === 'active');
  }

  getTierDistribution(): Record<string, number> {
    const dist: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    Array.from(this.members.values()).filter(m => m.status === 'active').forEach(m => { dist[m.currentTier]++; });
    return dist;
  }

  getMember(id: string): LoyaltyMemberRecord | undefined {
    return this.members.get(id);
  }
}

class LoyaltyTransactionEngine {
  private transactions: LoyaltyTransactionRecord[] = [];
  private counter = 0;

  record(memberId: string, type: LoyaltyTransactionRecord['transactionType'], points: number, balanceAfter: number, channel: LoyaltyTransactionRecord['channel'], spend?: number, multiplier?: number, reward?: string): LoyaltyTransactionRecord {
    const transactionId = `loytrx-${Date.now()}-${++this.counter}`;
    const record: LoyaltyTransactionRecord = {
      transactionId, memberId, transactionType: type, points, spendAmountUSD: spend,
      earningMultiplier: multiplier, rewardRedeemed: reward,
      transactionDate: Date.now(), channel, balanceAfter
    };
    this.transactions.push(record);
    return record;
  }

  getTotalPointsIssued(): number {
    return this.transactions.filter(t => t.transactionType === 'earn' || t.transactionType === 'bonus').reduce((s, t) => s + t.points, 0);
  }

  getTotalPointsRedeemed(): number {
    return this.transactions.filter(t => t.transactionType === 'redeem').reduce((s, t) => s + t.points, 0);
  }

  getTopEarningChannels(): { channel: string; points: number }[] {
    const byChannel: Record<string, number> = {};
    this.transactions.filter(t => t.transactionType === 'earn').forEach(t => {
      byChannel[t.channel] = (byChannel[t.channel] || 0) + t.points;
    });
    return Object.entries(byChannel).map(([channel, points]) => ({ channel, points })).sort((a, b) => b.points - a.points);
  }
}

class LoyaltyProgramMetricsCalculator {
  private records: LoyaltyProgramMetricsRecord[] = [];
  private counter = 0;

  calculate(period: string, activeMembers: number, newEnrollments: number, churned: number, pointsIssued: number, pointsRedeemed: number, pointsExpired: number, programLiability: number, revenueInfluenced: number, rewardCost: number, tierDist: Record<string, number>): LoyaltyProgramMetricsRecord {
    const redemptionRate = pointsIssued > 0 ? Math.round((pointsRedeemed / pointsIssued) * 100) : 0;
    const roi = rewardCost > 0 ? Math.round(((revenueInfluenced - rewardCost) / rewardCost) * 100) : 0;

    const recordId = `loyprog-${Date.now()}-${++this.counter}`;
    const record: LoyaltyProgramMetricsRecord = {
      recordId, period, totalActiveMembers: activeMembers, newEnrollments, churnedMembers: churned,
      totalPointsIssued: pointsIssued, totalPointsRedeemed: pointsRedeemed, totalPointsExpired: pointsExpired,
      redemptionRatePct: redemptionRate, avgPointsPerMember: activeMembers > 0 ? Math.round(pointsIssued / activeMembers) : 0,
      programLiabilityUSD: programLiability, revenueInfluencedUSD: revenueInfluenced,
      costOfRewardsUSD: rewardCost, programROIPct: roi, tierDistribution: tierDist,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Loyalty metrics calculated', { period, redemptionRate, roi });
    return record;
  }

  getLatest(): LoyaltyProgramMetricsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getROITrend(): number[] {
    return this.records.map(r => r.programROIPct);
  }
}

class ChurnPreventionEngine {
  private records: ChurnPreventionRecord[] = [];
  private counter = 0;

  identify(memberId: string, customerId: string, churnRisk: number, riskFactors: string[], daysSinceActivity: number, expiringPoints: number, lifetimeValue: number): ChurnPreventionRecord {
    const intervention: ChurnPreventionRecord['recommendedIntervention'] =
      churnRisk >= 90 ? 'vip_outreach' :
      churnRisk >= 75 ? 'reactivation_campaign' :
      expiringPoints > 1000 ? 'bonus_points' :
      churnRisk >= 60 ? 'personalized_offer' : 'tier_retention';

    const interventionValue = lifetimeValue * 0.05; // 5% of LTV as intervention budget
    const retentionProb = Math.max(10, 100 - churnRisk + 20); // intervention improves by 20pts

    const recordId = `churnprev-${Date.now()}-${++this.counter}`;
    const record: ChurnPreventionRecord = {
      recordId, memberId, customerId, churnRiskScore: churnRisk, riskFactors,
      daysSinceLastActivity: daysSinceActivity, pointsAboutToExpire: expiringPoints,
      recommendedIntervention: intervention, interventionValueUSD: Math.round(interventionValue),
      expectedRetentionProbabilityPct: Math.min(95, retentionProb),
      lifetimeValueAtRiskUSD: lifetimeValue, identifiedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getHighValueAtRisk(minLTV = 10000): ChurnPreventionRecord[] {
    return this.records
      .filter(r => r.lifetimeValueAtRiskUSD >= minLTV)
      .sort((a, b) => b.lifetimeValueAtRiskUSD - a.lifetimeValueAtRiskUSD);
  }

  getTotalValueAtRisk(): number {
    return this.records.reduce((s, r) => s + r.lifetimeValueAtRiskUSD, 0);
  }
}

export const loyaltyMemberManager = new LoyaltyMemberManager();
export const loyaltyTransactionEngine = new LoyaltyTransactionEngine();
export const loyaltyProgramMetricsCalculator = new LoyaltyProgramMetricsCalculator();
export const churnPreventionEngine = new ChurnPreventionEngine();

export { LoyaltyMemberRecord, LoyaltyTransactionRecord, LoyaltyProgramMetricsRecord, ChurnPreventionRecord };
