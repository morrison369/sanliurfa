/**
 * Phase 13: Payment & Billing Enhancement
 * Subscription management, invoicing, dunning, refund handling
 */

import { logger } from './logging';

// ==================== BILLING MODELS ====================

export interface BillingCycle {
  id: string;
  subscriptionId: string;
  startDate: number;
  endDate: number;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  invoiceId?: string;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  issueDate: number;
  dueDate: number;
  paidDate?: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Generate invoice number (YYYY-MM-NNNNNN format)
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(Math.random() * 1000000);

  return `${year}-${month}-${String(seq).padStart(6, '0')}`;
}

/**
 * Create invoice from billing cycle
 */
export function createInvoiceFromCycle(cycle: BillingCycle, items: InvoiceItem[]): Invoice {
  const issueDate = cycle.startDate;
  const dueDate = cycle.endDate + 30 * 24 * 60 * 60 * 1000; // 30 days payment terms

  return {
    id: generateInvoiceNumber(),
    subscriptionId: cycle.subscriptionId,
    amount: cycle.amount,
    currency: cycle.currency,
    issueDate,
    dueDate,
    status: 'issued',
    items
  };
}

// ==================== DUNNING MANAGEMENT ====================

export interface DunningRule {
  name: string;
  retryAfterDays: number;
  maxRetries: number;
  escalation: 'email' | 'sms' | 'phone';
}

export const DUNNING_POLICY: DunningRule[] = [
  {
    name: 'Day 4: First Retry',
    retryAfterDays: 4,
    maxRetries: 1,
    escalation: 'email'
  },
  {
    name: 'Day 9: Second Retry',
    retryAfterDays: 9,
    maxRetries: 1,
    escalation: 'email'
  },
  {
    name: 'Day 14: Final Retry',
    retryAfterDays: 14,
    maxRetries: 1,
    escalation: 'sms'
  },
  {
    name: 'Day 21: Cancellation',
    retryAfterDays: 21,
    maxRetries: 0,
    escalation: 'phone'
  }
];

/**
 * Dunning manager for failed payment recovery
 */
export class DunningManager {
  private failedPayments = new Map<string, { failureCount: number; lastFailure: number }>();

  /**
   * Record payment failure
   */
  recordFailure(subscriptionId: string): DunningRule | null {
    const current = this.failedPayments.get(subscriptionId) || {
      failureCount: 0,
      lastFailure: 0
    };

    current.failureCount++;
    current.lastFailure = Date.now();
    this.failedPayments.set(subscriptionId, current);

    // Find applicable dunning rule
    const applicableRule = DUNNING_POLICY.find(
      rule => current.failureCount <= rule.maxRetries
    );

    return applicableRule || null;
  }

  /**
   * Get retry date for failed subscription
   */
  getRetryDate(subscriptionId: string): number | null {
    const failure = this.failedPayments.get(subscriptionId);
    if (!failure) return null;

    const applicableRule = DUNNING_POLICY.find(
      rule => failure.failureCount <= rule.maxRetries
    );

    if (!applicableRule) return null;

    return failure.lastFailure + applicableRule.retryAfterDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Check if subscription should be cancelled
   */
  shouldCancel(subscriptionId: string): boolean {
    const failure = this.failedPayments.get(subscriptionId);
    if (!failure) return false;

    const lastPolicy = DUNNING_POLICY[DUNNING_POLICY.length - 1];
    return failure.failureCount > lastPolicy.maxRetries;
  }

  /**
   * Reset on successful payment
   */
  resetOnSuccess(subscriptionId: string): void {
    this.failedPayments.delete(subscriptionId);
  }

  /**
   * Get all failed subscriptions
   */
  getFailedSubscriptions(): string[] {
    return Array.from(this.failedPayments.keys());
  }
}

// ==================== REFUND HANDLING ====================

export interface Refund {
  id: string;
  transactionId: string;
  subscriptionId: string;
  amount: number;
  reason: 'chargeback' | 'user_request' | 'system_error' | 'fraud' | 'other';
  status: 'requested' | 'approved' | 'processed' | 'failed' | 'reversed';
  createdAt: number;
  processedAt?: number;
  notes?: string;
}

/**
 * Refund policy rules
 */
export const REFUND_POLICY = {
  maxRefundDaysAfterPurchase: 30,
  autoRefundThreshold: 500, // Auto-refund up to $500
  requiresApprovalAbove: 500
};

/**
 * Manage refunds and refund policy compliance
 */
export class RefundManager {
  private refunds = new Map<string, Refund[]>();

  /**
   * Create refund request
   */
  createRefund(transactionId: string, subscriptionId: string, amount: number, reason: string): Refund {
    const refund: Refund = {
      id: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      subscriptionId,
      amount,
      reason: reason as any,
      status: amount <= REFUND_POLICY.autoRefundThreshold ? 'approved' : 'requested',
      createdAt: Date.now()
    };

    if (!this.refunds.has(subscriptionId)) {
      this.refunds.set(subscriptionId, []);
    }

    this.refunds.get(subscriptionId)!.push(refund);

    logger.debug('Refund created', { refundId: refund.id, amount });

    return refund;
  }

  /**
   * Approve refund (manual for high-value)
   */
  approveRefund(refundId: string): void {
    for (const refunds of this.refunds.values()) {
      const refund = refunds.find(r => r.id === refundId);
      if (refund) {
        refund.status = 'approved';
        logger.info('Refund approved', { refundId });
        return;
      }
    }
  }

  /**
   * Process approved refund
   */
  processRefund(refundId: string): void {
    for (const refunds of this.refunds.values()) {
      const refund = refunds.find(r => r.id === refundId);
      if (refund) {
        refund.status = 'processed';
        refund.processedAt = Date.now();
        logger.info('Refund processed', { refundId, amount: refund.amount });
        return;
      }
    }
  }

  /**
   * Get refund history for subscription
   */
  getRefundHistory(subscriptionId: string): Refund[] {
    return this.refunds.get(subscriptionId) || [];
  }

  /**
   * Get total refunded for subscription
   */
  getTotalRefunded(subscriptionId: string): number {
    const refunds = this.refunds.get(subscriptionId) || [];
    return refunds
      .filter(r => r.status === 'processed')
      .reduce((sum, r) => sum + r.amount, 0);
  }
}

// ==================== SUBSCRIPTION ANALYTICS ====================

/**
 * Subscription metrics and analytics
 */
export class SubscriptionAnalytics {
  /**
   * Calculate Lifetime Value (LTV)
   */
  static calculateLTV(monthlyRevenue: number, avgRetentionMonths: number): number {
    return monthlyRevenue * avgRetentionMonths;
  }

  /**
   * Calculate churn cohort
   */
  static getChurnCohort(signupDate: number, currentDate: number = Date.now()): string {
    const months = Math.floor((currentDate - signupDate) / (30 * 24 * 60 * 60 * 1000));
    return `${months}m`;
  }

  /**
   * Calculate MRR (Monthly Recurring Revenue)
   */
  static calculateMRR(activeSubscriptions: Array<{ amount: number; billingCycle: number }>): number {
    return activeSubscriptions.reduce((sum, sub) => {
      // Convert billing cycle amount to monthly equivalent
      const monthlyAmount = sub.amount / (sub.billingCycle / 30);
      return sum + monthlyAmount;
    }, 0);
  }

  /**
   * Calculate ARR (Annual Recurring Revenue)
   */
  static calculateARR(mrr: number): number {
    return mrr * 12;
  }

  /**
   * Calculate LTV:CAC ratio (quality of customer acquisition)
   */
  static calculateLTVtoCACRatio(ltv: number, customerAcquisitionCost: number): number {
    if (customerAcquisitionCost === 0) return Infinity;
    return ltv / customerAcquisitionCost;
  }
}

// ==================== EXPORTS ====================

export const dunningManager = new DunningManager();
export const refundManager = new RefundManager();
