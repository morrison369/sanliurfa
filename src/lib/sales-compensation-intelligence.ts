/**
 * Phase 323: Sales Compensation Intelligence
 * Commission tracking, quota attainment, incentive plan management, payout analytics
 */

import { logger } from './logger';

interface CompensationPlanRecord {
  planId: string;
  planName: string;
  planType: 'tiered_commission' | 'flat_rate' | 'accelerator' | 'mbo' | 'spiff';
  targetRole: string;
  quotaUSD: number;
  baseCommissionRatePct: number;
  acceleratorThresholdPct: number;  // % of quota where accelerator kicks in
  acceleratorMultiplier: number;    // e.g. 1.5x above threshold
  capUSD?: number;                  // earnings cap
  planPeriod: 'monthly' | 'quarterly' | 'annual';
  isActive: boolean;
  effectiveFrom: number;
  effectiveTo?: number;
  createdAt: number;
}

interface RepAttainmentRecord {
  attainmentId: string;
  repId: string;
  repName: string;
  planId: string;
  period: string;
  quotaUSD: number;
  actualRevenueUSD: number;
  attainmentPct: number;
  baseEarningsUSD: number;
  acceleratorEarningsUSD: number;
  totalEarningsUSD: number;
  clawbackUSD: number;           // recoveries from cancelled deals
  netPayoutUSD: number;
  attainmentCategory: 'exceeds' | 'meets' | 'near_miss' | 'below';
  rankInTeam?: number;
  dealsWon: number;
  avgDealSizeUSD: number;
  calculatedAt: number;
}

interface IncentiveEventRecord {
  eventId: string;
  repId: string;
  repName: string;
  eventType: 'deal_closed' | 'quota_milestone' | 'spiff' | 'mbo_achieved' | 'clawback';
  dealId?: string;
  revenueUSD: number;
  commissionUSD: number;
  multiplierApplied: number;
  notes: string;
  approvalStatus: 'pending' | 'approved' | 'paid' | 'disputed';
  approvedBy?: string;
  createdAt: number;
}

interface CompensationAnalyticsRecord {
  analyticsId: string;
  period: string;
  teamSize: number;
  totalQuotaUSD: number;
  totalActualUSD: number;
  teamAttainmentPct: number;
  totalPayoutUSD: number;
  avgEarningsPerRepUSD: number;
  quotaAttainmentDistribution: { below50: number; pct50to80: number; pct80to100: number; above100: number };
  payoutToRevenueRatioPct: number;
  topPerformerEarningsUSD: number;
  bottomPerformerEarningsUSD: number;
  earningsGapRatio: number;          // top / bottom
  overQuotaRepCount: number;
  underQuotaRepCount: number;
  calculatedAt: number;
}

class CompensationPlanManager {
  private plans: Map<string, CompensationPlanRecord> = new Map();
  private counter = 0;

  create(name: string, type: CompensationPlanRecord['planType'], role: string, quota: number, baseRate: number, accelThreshold: number, accelMultiplier: number, period: CompensationPlanRecord['planPeriod'], cap?: number): CompensationPlanRecord {
    const planId = `compplan-${Date.now()}-${++this.counter}`;
    const record: CompensationPlanRecord = {
      planId, planName: name, planType: type, targetRole: role,
      quotaUSD: quota, baseCommissionRatePct: baseRate,
      acceleratorThresholdPct: accelThreshold, acceleratorMultiplier: accelMultiplier,
      capUSD: cap, planPeriod: period, isActive: true,
      effectiveFrom: Date.now(), createdAt: Date.now()
    };
    this.plans.set(planId, record);
    logger.debug('Compensation plan created', { planId, name, role, quota });
    return record;
  }

  deactivate(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    plan.isActive = false;
    plan.effectiveTo = Date.now();
    return true;
  }

  getActive(): CompensationPlanRecord[] {
    return Array.from(this.plans.values()).filter(p => p.isActive);
  }

  getPlan(id: string): CompensationPlanRecord | undefined {
    return this.plans.get(id);
  }
}

class AttainmentTracker {
  private attainments: RepAttainmentRecord[] = [];
  private counter = 0;

  calculate(repId: string, repName: string, plan: CompensationPlanRecord, period: string, actualRevenue: number, clawback: number, dealsWon: number): RepAttainmentRecord {
    const attainmentId = `attain-${Date.now()}-${++this.counter}`;
    const attainmentPct = plan.quotaUSD > 0 ? Math.round((actualRevenue / plan.quotaUSD) * 100 * 10) / 10 : 0;

    // Base commission on revenue up to accelerator threshold
    const thresholdRevenue = plan.quotaUSD * (plan.acceleratorThresholdPct / 100);
    const baseRevenue = Math.min(actualRevenue, thresholdRevenue);
    const baseEarnings = Math.round(baseRevenue * (plan.baseCommissionRatePct / 100));

    // Accelerator earnings above threshold
    const accelRevenue = Math.max(0, actualRevenue - thresholdRevenue);
    const accelEarnings = Math.round(accelRevenue * (plan.baseCommissionRatePct / 100) * plan.acceleratorMultiplier);

    let totalEarnings = baseEarnings + accelEarnings;
    if (plan.capUSD) totalEarnings = Math.min(totalEarnings, plan.capUSD);
    const netPayout = Math.max(0, totalEarnings - clawback);

    const attainmentCategory: RepAttainmentRecord['attainmentCategory'] =
      attainmentPct >= 100 ? 'exceeds' : attainmentPct >= 80 ? 'meets' : attainmentPct >= 60 ? 'near_miss' : 'below';

    const avgDeal = dealsWon > 0 ? Math.round(actualRevenue / dealsWon) : 0;

    const record: RepAttainmentRecord = {
      attainmentId, repId, repName, planId: plan.planId, period,
      quotaUSD: plan.quotaUSD, actualRevenueUSD: actualRevenue,
      attainmentPct, baseEarningsUSD: baseEarnings, acceleratorEarningsUSD: accelEarnings,
      totalEarningsUSD: totalEarnings, clawbackUSD: clawback, netPayoutUSD: netPayout,
      attainmentCategory, dealsWon, avgDealSizeUSD: avgDeal, calculatedAt: Date.now()
    };
    this.attainments.push(record);
    return record;
  }

  rankTeam(period: string): RepAttainmentRecord[] {
    const ranked = this.attainments
      .filter(a => a.period === period)
      .sort((a, b) => b.attainmentPct - a.attainmentPct);
    ranked.forEach((a, i) => { a.rankInTeam = i + 1; });
    return ranked;
  }

  getOverQuota(period: string): RepAttainmentRecord[] {
    return this.attainments.filter(a => a.period === period && a.attainmentPct >= 100);
  }

  getTotalPayout(period: string): number {
    return this.attainments.filter(a => a.period === period).reduce((s, a) => s + a.netPayoutUSD, 0);
  }
}

class IncentiveEventManager {
  private events: IncentiveEventRecord[] = [];
  private counter = 0;

  log(repId: string, repName: string, type: IncentiveEventRecord['eventType'], revenue: number, commission: number, multiplier: number, notes: string, dealId?: string): IncentiveEventRecord {
    const eventId = `inevent-${Date.now()}-${++this.counter}`;
    const record: IncentiveEventRecord = {
      eventId, repId, repName, eventType: type, dealId,
      revenueUSD: revenue, commissionUSD: commission,
      multiplierApplied: multiplier, notes, approvalStatus: 'pending', createdAt: Date.now()
    };
    this.events.push(record);
    return record;
  }

  approve(eventId: string, approver: string): boolean {
    const ev = this.events.find(e => e.eventId === eventId);
    if (!ev) return false;
    ev.approvalStatus = 'approved';
    ev.approvedBy = approver;
    return true;
  }

  getPendingApprovals(): IncentiveEventRecord[] {
    return this.events.filter(e => e.approvalStatus === 'pending');
  }

  getTotalPendingCommission(): number {
    return this.events.filter(e => e.approvalStatus === 'pending').reduce((s, e) => s + e.commissionUSD, 0);
  }
}

class CompensationAnalyticsEngine {
  private records: CompensationAnalyticsRecord[] = [];
  private counter = 0;

  analyze(period: string, attainments: RepAttainmentRecord[]): CompensationAnalyticsRecord {
    const analyticsId = `companalytics-${Date.now()}-${++this.counter}`;
    const n = attainments.length;
    const totalQuota = attainments.reduce((s, a) => s + a.quotaUSD, 0);
    const totalActual = attainments.reduce((s, a) => s + a.actualRevenueUSD, 0);
    const teamAttainmentPct = totalQuota > 0 ? Math.round((totalActual / totalQuota) * 100 * 10) / 10 : 0;
    const totalPayout = attainments.reduce((s, a) => s + a.netPayoutUSD, 0);
    const avgEarnings = n > 0 ? Math.round(totalPayout / n) : 0;

    const dist = {
      below50: attainments.filter(a => a.attainmentPct < 50).length,
      pct50to80: attainments.filter(a => a.attainmentPct >= 50 && a.attainmentPct < 80).length,
      pct80to100: attainments.filter(a => a.attainmentPct >= 80 && a.attainmentPct < 100).length,
      above100: attainments.filter(a => a.attainmentPct >= 100).length
    };

    const sorted = [...attainments].sort((a, b) => b.netPayoutUSD - a.netPayoutUSD);
    const topEarnings = sorted[0]?.netPayoutUSD || 0;
    const bottomEarnings = sorted[sorted.length - 1]?.netPayoutUSD || 0;
    const earningsGap = bottomEarnings > 0 ? Math.round((topEarnings / bottomEarnings) * 10) / 10 : 0;

    const record: CompensationAnalyticsRecord = {
      analyticsId, period, teamSize: n, totalQuotaUSD: totalQuota, totalActualUSD: totalActual,
      teamAttainmentPct, totalPayoutUSD: totalPayout, avgEarningsPerRepUSD: avgEarnings,
      quotaAttainmentDistribution: dist,
      payoutToRevenueRatioPct: totalActual > 0 ? Math.round((totalPayout / totalActual) * 100 * 10) / 10 : 0,
      topPerformerEarningsUSD: topEarnings, bottomPerformerEarningsUSD: bottomEarnings,
      earningsGapRatio: earningsGap,
      overQuotaRepCount: dist.above100, underQuotaRepCount: dist.below50 + dist.pct50to80,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Compensation analytics calculated', { period, teamAttainmentPct, totalPayout });
    return record;
  }

  getLatest(): CompensationAnalyticsRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

export const compensationPlanManager = new CompensationPlanManager();
export const attainmentTracker = new AttainmentTracker();
export const incentiveEventManager = new IncentiveEventManager();
export const compensationAnalyticsEngine = new CompensationAnalyticsEngine();

export { CompensationPlanRecord, RepAttainmentRecord, IncentiveEventRecord, CompensationAnalyticsRecord };
