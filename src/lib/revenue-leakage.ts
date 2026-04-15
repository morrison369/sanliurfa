/**
 * Phase 191: Revenue Leakage Detection
 * Leakage detection, billing reconciliation, unbilled usage tracking, revenue recovery
 */

import { logger } from './logger';

interface LeakageEvent {
  leakageId: string;
  type: 'unbilled_usage' | 'billing_gap' | 'discount_abuse' | 'refund_anomaly' | 'rate_error';
  customerId: string;
  detectedAt: number;
  estimatedLoss: number;
  currency: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  description: string;
  resolvedAt?: number;
}

interface ReconciliationRecord {
  reconciliationId: string;
  period: string;
  billedAmount: number;
  expectedAmount: number;
  variance: number;
  variancePct: number;
  lineItems: Array<{ itemId: string; billed: number; expected: number; delta: number }>;
  status: 'pending' | 'matched' | 'discrepancy';
  createdAt: number;
}

interface UnbilledUsage {
  usageId: string;
  customerId: string;
  productId: string;
  usageUnits: number;
  unitPrice: number;
  estimatedRevenue: number;
  period: string;
  detectedAt: number;
  status: 'unbilled' | 'billed' | 'waived';
}

interface RecoveryAction {
  actionId: string;
  leakageId: string;
  type: 'retroactive_bill' | 'credit_note_reversal' | 'rate_correction' | 'usage_correction';
  amount: number;
  customerId: string;
  initiatedAt: number;
  completedAt?: number;
  status: 'pending' | 'completed' | 'failed';
}

class LeakageDetector {
  private events: Map<string, LeakageEvent> = new Map();
  private counter = 0;

  detect(type: LeakageEvent['type'], customerId: string, estimatedLoss: number, description: string): LeakageEvent {
    const leakageId = `leakage-${Date.now()}-${++this.counter}`;
    const event: LeakageEvent = {
      leakageId, type, customerId, estimatedLoss,
      currency: 'USD', description,
      detectedAt: Date.now(), status: 'open'
    };
    this.events.set(leakageId, event);
    logger.debug('Revenue leakage detected', { leakageId, type, customerId, estimatedLoss });
    return event;
  }

  investigate(leakageId: string): LeakageEvent | undefined {
    const event = this.events.get(leakageId);
    if (event && event.status === 'open') {
      event.status = 'investigating';
      return event;
    }
    return undefined;
  }

  resolve(leakageId: string, isFalsePositive = false): LeakageEvent | undefined {
    const event = this.events.get(leakageId);
    if (event) {
      event.status = isFalsePositive ? 'false_positive' : 'resolved';
      event.resolvedAt = Date.now();
      return event;
    }
    return undefined;
  }

  getOpenLeakages(): LeakageEvent[] {
    return Array.from(this.events.values()).filter(e => e.status === 'open' || e.status === 'investigating');
  }

  getTotalLeakageAmount(): number {
    return Array.from(this.events.values())
      .filter(e => e.status !== 'false_positive')
      .reduce((sum, e) => sum + e.estimatedLoss, 0);
  }

  getByType(type: LeakageEvent['type']): LeakageEvent[] {
    return Array.from(this.events.values()).filter(e => e.type === type);
  }
}

class BillingReconciliationEngine {
  private records: Map<string, ReconciliationRecord> = new Map();
  private counter = 0;

  reconcile(period: string, billedAmount: number, lineItems: Array<{ itemId: string; billed: number; expected: number }>): ReconciliationRecord {
    const reconciliationId = `reconcile-${Date.now()}-${++this.counter}`;
    const expectedAmount = lineItems.reduce((sum, li) => sum + li.expected, 0);
    const variance = billedAmount - expectedAmount;
    const variancePct = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0;
    const items = lineItems.map(li => ({ ...li, delta: li.billed - li.expected }));
    const status: ReconciliationRecord['status'] = Math.abs(variancePct) < 0.5 ? 'matched' : 'discrepancy';

    const record: ReconciliationRecord = {
      reconciliationId, period, billedAmount, expectedAmount,
      variance, variancePct, lineItems: items, status, createdAt: Date.now()
    };
    this.records.set(reconciliationId, record);
    logger.debug('Billing reconciliation completed', { reconciliationId, period, variancePct: variancePct.toFixed(2), status });
    return record;
  }

  getDiscrepancies(): ReconciliationRecord[] {
    return Array.from(this.records.values()).filter(r => r.status === 'discrepancy');
  }

  getReconciliation(reconciliationId: string): ReconciliationRecord | undefined {
    return this.records.get(reconciliationId);
  }

  getPeriodSummary(period: string): { totalBilled: number; totalExpected: number; totalVariance: number } {
    const periodRecords = Array.from(this.records.values()).filter(r => r.period === period);
    return {
      totalBilled: periodRecords.reduce((s, r) => s + r.billedAmount, 0),
      totalExpected: periodRecords.reduce((s, r) => s + r.expectedAmount, 0),
      totalVariance: periodRecords.reduce((s, r) => s + r.variance, 0)
    };
  }
}

class UnbilledUsageTracker {
  private usages: Map<string, UnbilledUsage> = new Map();
  private counter = 0;

  record(customerId: string, productId: string, usageUnits: number, unitPrice: number, period: string): UnbilledUsage {
    const usageId = `usage-${Date.now()}-${++this.counter}`;
    const usage: UnbilledUsage = {
      usageId, customerId, productId, usageUnits, unitPrice,
      estimatedRevenue: usageUnits * unitPrice,
      period, detectedAt: Date.now(), status: 'unbilled'
    };
    this.usages.set(usageId, usage);
    return usage;
  }

  markBilled(usageId: string): boolean {
    const usage = this.usages.get(usageId);
    if (usage && usage.status === 'unbilled') { usage.status = 'billed'; return true; }
    return false;
  }

  waive(usageId: string): boolean {
    const usage = this.usages.get(usageId);
    if (usage && usage.status === 'unbilled') { usage.status = 'waived'; return true; }
    return false;
  }

  getUnbilled(customerId?: string): UnbilledUsage[] {
    return Array.from(this.usages.values())
      .filter(u => u.status === 'unbilled' && (!customerId || u.customerId === customerId));
  }

  getTotalUnbilledRevenue(): number {
    return this.getUnbilled().reduce((sum, u) => sum + u.estimatedRevenue, 0);
  }
}

class RevenueRecoveryManager {
  private actions: Map<string, RecoveryAction> = new Map();
  private counter = 0;

  initiate(leakageId: string, type: RecoveryAction['type'], amount: number, customerId: string): RecoveryAction {
    const actionId = `recovery-${Date.now()}-${++this.counter}`;
    const action: RecoveryAction = {
      actionId, leakageId, type, amount, customerId,
      initiatedAt: Date.now(), status: 'pending'
    };
    this.actions.set(actionId, action);
    logger.debug('Revenue recovery initiated', { actionId, leakageId, type, amount });
    return action;
  }

  complete(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (action && action.status === 'pending') {
      action.status = 'completed';
      action.completedAt = Date.now();
      return true;
    }
    return false;
  }

  fail(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (action && action.status === 'pending') { action.status = 'failed'; return true; }
    return false;
  }

  getTotalRecovered(): number {
    return Array.from(this.actions.values())
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.amount, 0);
  }

  getPendingActions(): RecoveryAction[] {
    return Array.from(this.actions.values()).filter(a => a.status === 'pending');
  }
}

export const leakageDetector = new LeakageDetector();
export const billingReconciliationEngine = new BillingReconciliationEngine();
export const unbilledUsageTracker = new UnbilledUsageTracker();
export const revenueRecoveryManager = new RevenueRecoveryManager();

export { LeakageEvent, ReconciliationRecord, UnbilledUsage, RecoveryAction };
