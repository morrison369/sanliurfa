/**
 * Phase 333: Revenue Leakage Intelligence
 * Billing accuracy, contract compliance, leakage detection, recovery tracking
 */

import { logger } from './logger';

interface LeakageRecord {
  leakageId: string;
  leakageType: 'billing_error' | 'contract_underbilling' | 'discount_abuse' | 'unbilled_usage' | 'price_override' | 'expired_promo' | 'chargeback' | 'refund_excess';
  customerId: string;
  customerName: string;
  contractId?: string;
  description: string;
  detectedAmount: number;
  billedAmount: number;
  expectedAmount: number;
  leakageAmountUSD: number;
  leakagePct: number;
  period: string;
  status: 'detected' | 'investigating' | 'confirmed' | 'recovering' | 'recovered' | 'written_off';
  rootCause: string;
  systemSource: string;            // e.g. 'billing_system', 'CPQ', 'ERP'
  recoveryProbabilityPct: number;
  recoveredAmountUSD: number;
  createdAt: number;
  updatedAt: number;
}

interface BillingAuditRecord {
  auditId: string;
  period: string;
  invoicesAudited: number;
  invoicesWithErrors: number;
  errorRatePct: number;
  totalBilledUSD: number;
  totalLeakageUSD: number;
  leakageAsRevenuePct: number;
  byType: { type: string; count: number; amountUSD: number }[];
  topLeakageCustomers: { customerId: string; customerName: string; amountUSD: number }[];
  recoveryOpportunityUSD: number;
  auditedAt: number;
}

interface ContractComplianceRecord {
  complianceId: string;
  contractId: string;
  customerId: string;
  customerName: string;
  contractValueUSD: number;
  billedToDateUSD: number;
  expectedBilledUSD: number;
  underBilledUSD: number;
  compliancePct: number;
  missedMilestonesCount: number;
  priceEscalationApplied: boolean;
  volumeThresholdsMet: boolean;
  renewalAtRisk: boolean;
  complianceStatus: 'compliant' | 'minor_variance' | 'major_variance' | 'breach';
  checkedAt: number;
}

interface RecoveryRecord {
  recoveryId: string;
  leakageId: string;
  leakageType: LeakageRecord['leakageType'];
  customerId: string;
  customerName: string;
  targetAmountUSD: number;
  recoveredAmountUSD: number;
  recoveryRatePct: number;
  recoveryMethod: 'credit_note' | 'invoice_correction' | 'payment_plan' | 'offset' | 'write_off';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  agingDays: number;
  assignedTo?: string;
  completedAt?: number;
  createdAt: number;
}

class LeakageDetector {
  private leakages: LeakageRecord[] = [];
  private counter = 0;

  detect(type: LeakageRecord['leakageType'], customerId: string, customerName: string, billedAmount: number, expectedAmount: number, period: string, rootCause: string, systemSource: string, contractId?: string): LeakageRecord {
    const leakageId = `leak-${Date.now()}-${++this.counter}`;
    const leakage = expectedAmount - billedAmount;
    const leakagePct = expectedAmount > 0 ? Math.round((leakage / expectedAmount) * 100 * 10) / 10 : 0;
    const recoveryProb = type === 'billing_error' ? 85 : type === 'contract_underbilling' ? 70 : type === 'unbilled_usage' ? 75 : 50;

    const record: LeakageRecord = {
      leakageId, leakageType: type, customerId, customerName, contractId,
      description: `${type.replace(/_/g, ' ')} detected for ${customerName}`,
      detectedAmount: billedAmount, billedAmount, expectedAmount,
      leakageAmountUSD: Math.max(0, leakage), leakagePct: Math.max(0, leakagePct),
      period, status: 'detected', rootCause, systemSource,
      recoveryProbabilityPct: recoveryProb, recoveredAmountUSD: 0,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    this.leakages.push(record);
    logger.debug('Revenue leakage detected', { leakageId, type, leakage, customerId });
    return record;
  }

  updateStatus(leakageId: string, status: LeakageRecord['status'], recoveredAmount?: number): boolean {
    const leak = this.leakages.find(l => l.leakageId === leakageId);
    if (!leak) return false;
    leak.status = status;
    if (recoveredAmount !== undefined) leak.recoveredAmountUSD = recoveredAmount;
    leak.updatedAt = Date.now();
    return true;
  }

  getTotalLeakage(): number {
    return this.leakages.filter(l => l.status !== 'written_off').reduce((s, l) => s + l.leakageAmountUSD, 0);
  }

  getRecoveryOpportunity(): number {
    return this.leakages
      .filter(l => l.status === 'detected' || l.status === 'confirmed')
      .reduce((s, l) => s + l.leakageAmountUSD * (l.recoveryProbabilityPct / 100), 0);
  }

  getByType(): { type: string; count: number; amountUSD: number }[] {
    const map = new Map<string, { count: number; amount: number }>();
    this.leakages.forEach(l => {
      const e = map.get(l.leakageType) || { count: 0, amount: 0 };
      e.count++;
      e.amount += l.leakageAmountUSD;
      map.set(l.leakageType, e);
    });
    return Array.from(map.entries()).map(([type, d]) => ({ type, count: d.count, amountUSD: Math.round(d.amount) }));
  }

  getAll(): LeakageRecord[] {
    return [...this.leakages];
  }
}

class BillingAuditor {
  private audits: BillingAuditRecord[] = [];
  private counter = 0;

  audit(period: string, invoicesAudited: number, leakages: LeakageRecord[], totalBilledUSD: number): BillingAuditRecord {
    const auditId = `bilaudit-${Date.now()}-${++this.counter}`;
    const periodLeakages = leakages.filter(l => l.period === period);
    const errored = new Set(periodLeakages.map(l => l.customerId)).size;
    const errorRatePct = invoicesAudited > 0 ? Math.round((errored / invoicesAudited) * 100 * 10) / 10 : 0;
    const totalLeakage = periodLeakages.reduce((s, l) => s + l.leakageAmountUSD, 0);
    const leakageAsRevPct = totalBilledUSD > 0 ? Math.round((totalLeakage / totalBilledUSD) * 100 * 10) / 10 : 0;

    const byType = periodLeakages.reduce((acc, l) => {
      const ex = acc.find(a => a.type === l.leakageType);
      if (ex) { ex.count++; ex.amountUSD += l.leakageAmountUSD; }
      else acc.push({ type: l.leakageType, count: 1, amountUSD: l.leakageAmountUSD });
      return acc;
    }, [] as { type: string; count: number; amountUSD: number }[]);

    const topCustomers = Object.values(
      periodLeakages.reduce((acc, l) => {
        acc[l.customerId] = acc[l.customerId] || { customerId: l.customerId, customerName: l.customerName, amountUSD: 0 };
        acc[l.customerId].amountUSD += l.leakageAmountUSD;
        return acc;
      }, {} as Record<string, { customerId: string; customerName: string; amountUSD: number }>)
    ).sort((a, b) => b.amountUSD - a.amountUSD).slice(0, 5);

    const recoveryOpportunity = periodLeakages.reduce((s, l) => s + l.leakageAmountUSD * (l.recoveryProbabilityPct / 100), 0);

    const record: BillingAuditRecord = {
      auditId, period, invoicesAudited, invoicesWithErrors: errored, errorRatePct,
      totalBilledUSD, totalLeakageUSD: Math.round(totalLeakage), leakageAsRevenuePct: leakageAsRevPct,
      byType, topLeakageCustomers: topCustomers,
      recoveryOpportunityUSD: Math.round(recoveryOpportunity), auditedAt: Date.now()
    };
    this.audits.push(record);
    logger.debug('Billing audit completed', { auditId, period, totalLeakage, errorRatePct });
    return record;
  }

  getLatest(): BillingAuditRecord | undefined {
    return this.audits[this.audits.length - 1];
  }
}

class ContractComplianceChecker {
  private checks: ContractComplianceRecord[] = [];
  private counter = 0;

  check(contractId: string, customerId: string, customerName: string, contractValue: number, billedToDate: number, expectedBilled: number, missedMilestones: number, priceEscalationApplied: boolean, volumeThresholdsMet: boolean): ContractComplianceRecord {
    const complianceId = `contcomp-${Date.now()}-${++this.counter}`;
    const underBilled = Math.max(0, expectedBilled - billedToDate);
    const compliancePct = expectedBilled > 0 ? Math.round((billedToDate / expectedBilled) * 100 * 10) / 10 : 100;
    const complianceStatus: ContractComplianceRecord['complianceStatus'] =
      compliancePct >= 98 ? 'compliant' : compliancePct >= 90 ? 'minor_variance' : compliancePct >= 75 ? 'major_variance' : 'breach';
    const renewalAtRisk = complianceStatus === 'breach' || missedMilestones >= 3;

    const record: ContractComplianceRecord = {
      complianceId, contractId, customerId, customerName, contractValueUSD: contractValue,
      billedToDateUSD: billedToDate, expectedBilledUSD: expectedBilled, underBilledUSD: underBilled,
      compliancePct, missedMilestonesCount: missedMilestones, priceEscalationApplied,
      volumeThresholdsMet, renewalAtRisk, complianceStatus, checkedAt: Date.now()
    };
    this.checks.push(record);
    return record;
  }

  getBreaches(): ContractComplianceRecord[] {
    return this.checks.filter(c => c.complianceStatus === 'breach' || c.complianceStatus === 'major_variance');
  }

  getTotalUnderBilled(): number {
    return this.checks.reduce((s, c) => s + c.underBilledUSD, 0);
  }
}

class RecoveryTracker {
  private recoveries: RecoveryRecord[] = [];
  private counter = 0;

  initiate(leakageId: string, type: LeakageRecord['leakageType'], customerId: string, customerName: string, targetAmount: number, method: RecoveryRecord['recoveryMethod'], assignedTo?: string): RecoveryRecord {
    const recoveryId = `recovery-${Date.now()}-${++this.counter}`;
    const record: RecoveryRecord = {
      recoveryId, leakageId, leakageType: type, customerId, customerName,
      targetAmountUSD: targetAmount, recoveredAmountUSD: 0, recoveryRatePct: 0,
      recoveryMethod: method, status: 'initiated', agingDays: 0,
      assignedTo, createdAt: Date.now()
    };
    this.recoveries.push(record);
    return record;
  }

  update(recoveryId: string, recoveredAmount: number, status: RecoveryRecord['status']): boolean {
    const rec = this.recoveries.find(r => r.recoveryId === recoveryId);
    if (!rec) return false;
    rec.recoveredAmountUSD = recoveredAmount;
    rec.recoveryRatePct = rec.targetAmountUSD > 0 ? Math.round((recoveredAmount / rec.targetAmountUSD) * 100 * 10) / 10 : 0;
    rec.status = status;
    rec.agingDays = Math.floor((Date.now() - rec.createdAt) / 86400000);
    if (status === 'completed') rec.completedAt = Date.now();
    return true;
  }

  getTotalRecovered(): number {
    return this.recoveries.reduce((s, r) => s + r.recoveredAmountUSD, 0);
  }

  getAging(dayThreshold = 30): RecoveryRecord[] {
    return this.recoveries.filter(r => r.agingDays >= dayThreshold && r.status !== 'completed');
  }
}

export const leakageDetector = new LeakageDetector();
export const billingAuditor = new BillingAuditor();
export const contractComplianceChecker = new ContractComplianceChecker();
export const recoveryTracker = new RecoveryTracker();

export { LeakageRecord, BillingAuditRecord, ContractComplianceRecord, RecoveryRecord };
