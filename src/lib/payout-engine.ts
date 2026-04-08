/**
 * Phase 48: Commission & Payout Management
 * Commission calculation, payout tracking, settlement periods, earnings reports
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type CommissionType = 'percentage' | 'fixed' | 'tiered';

export interface Commission {
  vendorId: string;
  rate: number;
  type: CommissionType;
  minAmount?: number;
}

export interface Earning {
  id: string;
  vendorId: string;
  orderId: string;
  amount: number;
  commission: number;
  net: number;
  timestamp: number;
}

export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  settlementDate: number;
}

// ==================== COMMISSION MANAGER ====================

export class CommissionManager {
  private commissions = new Map<string, Commission>();
  private tierRules = new Map<string, { minAmount: number; rate: number }[]>();

  /**
   * Set commission for vendor
   */
  setCommission(vendorId: string, config: Commission): void {
    this.commissions.set(vendorId, config);
    logger.debug('Commission configured', { vendorId, type: config.type, rate: config.rate });
  }

  /**
   * Calculate commission and net amount
   */
  calculateCommission(vendorId: string, amount: number): { commission: number; net: number } {
    const config = this.commissions.get(vendorId);

    if (!config) {
      return { commission: 0, net: amount };
    }

    let commissionRate = config.rate;

    // Apply tiered rates if configured
    const tiers = this.tierRules.get(vendorId);
    if (tiers) {
      for (const tier of tiers) {
        if (amount >= tier.minAmount) {
          commissionRate = tier.rate;
        }
      }
    }

    const commission =
      config.type === 'percentage'
        ? (amount * commissionRate) / 100
        : config.type === 'fixed'
          ? commissionRate
          : (amount * commissionRate) / 100;

    return {
      commission: Math.round(commission * 100) / 100,
      net: Math.round((amount - commission) * 100) / 100
    };
  }

  /**
   * Get vendor commission
   */
  getCommission(vendorId: string): Commission | null {
    return this.commissions.get(vendorId) || null;
  }

  /**
   * Apply tiered commission rates
   */
  applyTiers(vendorId: string, tiers: { minAmount: number; rate: number }[]): void {
    const sortedTiers = tiers.sort((a, b) => a.minAmount - b.minAmount);
    this.tierRules.set(vendorId, sortedTiers);
    logger.debug('Tiered commission applied', { vendorId, tierCount: tiers.length });
  }
}

// ==================== EARNINGS TRACKER ====================

export class EarningsTracker {
  private earnings = new Map<string, Earning[]>();

  /**
   * Record earning
   */
  recordEarning(earning: Earning): void {
    if (!this.earnings.has(earning.vendorId)) {
      this.earnings.set(earning.vendorId, []);
    }
    this.earnings.get(earning.vendorId)!.push(earning);
    logger.debug('Earning recorded', { earningId: earning.id, vendorId: earning.vendorId, amount: earning.net });
  }

  /**
   * Get earnings for date range
   */
  getEarnings(vendorId: string, startDate?: number, endDate?: number): Earning[] {
    const vendorEarnings = this.earnings.get(vendorId) || [];

    if (!startDate || !endDate) {
      return vendorEarnings;
    }

    return vendorEarnings.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
  }

  /**
   * Get earnings summary
   */
  getSummary(
    vendorId: string,
    period: string
  ): { totalEarnings: number; totalCommission: number; netEarnings: number } {
    const vendorEarnings = this.earnings.get(vendorId) || [];

    const totalEarnings = vendorEarnings.reduce((sum, e) => sum + e.amount, 0);
    const totalCommission = vendorEarnings.reduce((sum, e) => sum + e.commission, 0);
    const netEarnings = vendorEarnings.reduce((sum, e) => sum + e.net, 0);

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100
    };
  }

  /**
   * Get tax report
   */
  getTaxReport(vendorId: string, year: number): { earnings: number; deductions: number; taxable: number } {
    const vendorEarnings = this.earnings.get(vendorId) || [];

    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31).getTime();

    const yearEarnings = vendorEarnings.filter(e => e.timestamp >= yearStart && e.timestamp <= yearEnd);

    const totalEarnings = yearEarnings.reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = yearEarnings.reduce((sum, e) => sum + e.commission, 0);

    return {
      earnings: Math.round(totalEarnings * 100) / 100,
      deductions: Math.round(totalDeductions * 100) / 100,
      taxable: Math.round((totalEarnings - totalDeductions) * 100) / 100
    };
  }
}

// ==================== PAYOUT PROCESSOR ====================

export class PayoutProcessor {
  private payouts = new Map<string, Payout>();
  private vendorPayouts = new Map<string, string[]>();
  private payoutSchedules = new Map<string, { frequency: string; nextDate: number; amount: number }>();

  /**
   * Create payout
   */
  createPayout(vendorId: string, amount: number, settlementDate: number): Payout {
    const payoutId = 'payout-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const payout: Payout = {
      id: payoutId,
      vendorId,
      amount,
      status: 'pending',
      settlementDate
    };

    this.payouts.set(payoutId, payout);

    if (!this.vendorPayouts.has(vendorId)) {
      this.vendorPayouts.set(vendorId, []);
    }
    this.vendorPayouts.get(vendorId)!.push(payoutId);

    logger.debug('Payout created', { payoutId, vendorId, amount });

    return payout;
  }

  /**
   * Get payout by ID
   */
  getPayout(payoutId: string): Payout | null {
    return this.payouts.get(payoutId) || null;
  }

  /**
   * Update payout status
   */
  updateStatus(payoutId: string, status: string): void {
    const payout = this.payouts.get(payoutId);
    if (payout) {
      payout.status = status as 'pending' | 'processing' | 'completed';
      logger.debug('Payout status updated', { payoutId, status });
    }
  }

  /**
   * List payouts for vendor
   */
  listPayouts(vendorId: string, limit: number = 50): Payout[] {
    const payoutIds = this.vendorPayouts.get(vendorId) || [];
    return payoutIds
      .slice(-limit)
      .map(id => this.payouts.get(id)!)
      .reverse();
  }

  /**
   * Get payout schedule
   */
  getPayoutSchedule(vendorId: string): { frequency: string; nextDate: number; amount: number } {
    return this.payoutSchedules.get(vendorId) || { frequency: 'monthly', nextDate: Date.now(), amount: 0 };
  }

  /**
   * Set payout schedule
   */
  setPayoutSchedule(vendorId: string, schedule: { frequency: string; nextDate: number; amount: number }): void {
    this.payoutSchedules.set(vendorId, schedule);
    logger.debug('Payout schedule configured', { vendorId, frequency: schedule.frequency });
  }
}

// ==================== EXPORTS ====================

export const commissionManager = new CommissionManager();
export const earningsTracker = new EarningsTracker();
export const payoutProcessor = new PayoutProcessor();
