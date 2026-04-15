/**
 * Phase 293: Procurement Intelligence
 * Spend analytics, supplier negotiation, contract compliance, savings tracking
 */

import { logger } from './logger';

interface ProcurementSpendRecord {
  recordId: string;
  period: string;
  category: string;
  supplierId: string;
  supplierName: string;
  invoiceCount: number;
  totalSpend: number;
  contractedSpend: number;       // spend covered by contract
  maverickSpend: number;         // off-contract spend
  maverickPct: number;
  negotiatedSavings: number;
  costAvoidance: number;
  priceVariancePct: number;      // vs budget
  recordedAt: number;
}

interface SupplierNegotiationRecord {
  negotiationId: string;
  supplierId: string;
  supplierName: string;
  category: string;
  negotiationType: 'new_contract' | 'renewal' | 'renegotiation' | 'spot_buy';
  baselineSpend: number;
  targetSavingsPct: number;
  achievedSavingsPct: number;
  achievedSavingsUSD: number;
  paymentTermsDays: number;
  volumeCommitmentUSD: number;
  keyTermsWon: string[];
  status: 'planning' | 'active' | 'completed' | 'stalled';
  startDate: number;
  completedDate?: number;
  createdAt: number;
}

interface ProcurementContractRecord {
  contractId: string;
  supplierId: string;
  supplierName: string;
  category: string;
  contractValue: number;
  startDate: number;
  endDate: number;
  autoRenewal: boolean;
  paymentTermsDays: number;
  slaTerms: string[];
  complianceScore: number;       // 0-100
  deliveryOnTimePct: number;
  qualityScore: number;          // 0-100
  status: 'active' | 'expiring' | 'expired' | 'terminated';
  createdAt: number;
}

interface ProcurementSavingsRecord {
  recordId: string;
  period: string;
  totalAddressableSpend: number;
  negotiatedSavings: number;
  processEfficiencySavings: number;
  demandManagementSavings: number;
  totalSavings: number;
  savingsAsSpendPct: number;
  cumulativeSavings: number;
  savingsTarget: number;
  achievementVsTargetPct: number;
  calculatedAt: number;
}

class ProcurementSpendAnalyzer {
  private records: ProcurementSpendRecord[] = [];
  private counter = 0;

  record(period: string, category: string, supplierId: string, supplierName: string, invoices: number, totalSpend: number, contractedSpend: number, negotiatedSavings: number, budgetedSpend: number): ProcurementSpendRecord {
    const maverickSpend = totalSpend - contractedSpend;
    const maverickPct = totalSpend > 0 ? (maverickSpend / totalSpend) * 100 : 0;
    const priceVariance = budgetedSpend > 0 ? ((totalSpend - budgetedSpend) / budgetedSpend) * 100 : 0;

    const recordId = `procspend-${Date.now()}-${++this.counter}`;
    const rec: ProcurementSpendRecord = {
      recordId, period, category, supplierId, supplierName, invoiceCount: invoices,
      totalSpend, contractedSpend, maverickSpend, maverickPct,
      negotiatedSavings, costAvoidance: 0, priceVariancePct: priceVariance, recordedAt: Date.now()
    };
    this.records.push(rec);
    logger.debug('Procurement spend recorded', { period, category, totalSpend, maverickPct });
    return rec;
  }

  getTotalSpend(period?: string): number {
    return this.records.filter(r => !period || r.period === period).reduce((s, r) => s + r.totalSpend, 0);
  }

  getHighMaverickCategories(threshold = 20): ProcurementSpendRecord[] {
    return this.records.filter(r => r.maverickPct >= threshold)
      .sort((a, b) => b.maverickPct - a.maverickPct);
  }

  getSpendByCategory(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const r of this.records) result[r.category] = (result[r.category] || 0) + r.totalSpend;
    return result;
  }
}

class SupplierNegotiationTracker {
  private negotiations: Map<string, SupplierNegotiationRecord> = new Map();
  private counter = 0;

  initiate(supplierId: string, supplierName: string, category: string, type: SupplierNegotiationRecord['negotiationType'], baseline: number, targetSavingsPct: number): SupplierNegotiationRecord {
    const negotiationId = `neg-${Date.now()}-${++this.counter}`;
    const record: SupplierNegotiationRecord = {
      negotiationId, supplierId, supplierName, category, negotiationType: type,
      baselineSpend: baseline, targetSavingsPct, achievedSavingsPct: 0, achievedSavingsUSD: 0,
      paymentTermsDays: 30, volumeCommitmentUSD: 0, keyTermsWon: [],
      status: 'planning', startDate: Date.now(), createdAt: Date.now()
    };
    this.negotiations.set(negotiationId, record);
    return record;
  }

  complete(negotiationId: string, achievedPct: number, paymentTerms: number, keyTermsWon: string[]): boolean {
    const neg = this.negotiations.get(negotiationId);
    if (!neg) return false;
    neg.achievedSavingsPct = achievedPct;
    neg.achievedSavingsUSD = neg.baselineSpend * (achievedPct / 100);
    neg.paymentTermsDays = paymentTerms;
    neg.keyTermsWon = keyTermsWon;
    neg.status = 'completed';
    neg.completedDate = Date.now();
    return true;
  }

  getTotalSavings(): number {
    return Array.from(this.negotiations.values())
      .filter(n => n.status === 'completed')
      .reduce((s, n) => s + n.achievedSavingsUSD, 0);
  }

  getActiveNegotiations(): SupplierNegotiationRecord[] {
    return Array.from(this.negotiations.values()).filter(n => n.status === 'active' || n.status === 'planning');
  }

  getAvgAchievementVsTarget(): number {
    const completed = Array.from(this.negotiations.values()).filter(n => n.status === 'completed');
    if (!completed.length) return 0;
    const avgAchieved = completed.reduce((s, n) => s + n.achievedSavingsPct, 0) / completed.length;
    const avgTarget = completed.reduce((s, n) => s + n.targetSavingsPct, 0) / completed.length;
    return avgTarget > 0 ? (avgAchieved / avgTarget) * 100 : 0;
  }
}

class ProcurementContractManager {
  private contracts: Map<string, ProcurementContractRecord> = new Map();
  private counter = 0;

  create(supplierId: string, supplierName: string, category: string, value: number, startDate: number, endDate: number, paymentTerms: number, slaTerms: string[], autoRenewal: boolean): ProcurementContractRecord {
    const contractId = `proccon-${Date.now()}-${++this.counter}`;
    const status: ProcurementContractRecord['status'] =
      endDate <= Date.now() ? 'expired' :
      endDate <= Date.now() + 90 * 86400000 ? 'expiring' : 'active';
    const record: ProcurementContractRecord = {
      contractId, supplierId, supplierName, category, contractValue: value,
      startDate, endDate, autoRenewal, paymentTermsDays: paymentTerms, slaTerms,
      complianceScore: 100, deliveryOnTimePct: 100, qualityScore: 100, status, createdAt: Date.now()
    };
    this.contracts.set(contractId, record);
    return record;
  }

  updatePerformance(contractId: string, compliance: number, deliveryOnTime: number, quality: number): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    contract.complianceScore = compliance;
    contract.deliveryOnTimePct = deliveryOnTime;
    contract.qualityScore = quality;
    return true;
  }

  getExpiringContracts(days = 90): ProcurementContractRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.contracts.values())
      .filter(c => c.status === 'active' && c.endDate <= horizon)
      .sort((a, b) => a.endDate - b.endDate);
  }

  getLowPerformanceContracts(threshold = 70): ProcurementContractRecord[] {
    return Array.from(this.contracts.values())
      .filter(c => c.status === 'active' && (c.complianceScore < threshold || c.qualityScore < threshold));
  }

  getTotalContractedValue(): number {
    return Array.from(this.contracts.values())
      .filter(c => c.status === 'active')
      .reduce((s, c) => s + c.contractValue, 0);
  }
}

class ProcurementSavingsTracker {
  private records: ProcurementSavingsRecord[] = [];
  private counter = 0;
  private cumulativeSavings = 0;

  record(period: string, addressableSpend: number, negotiatedSavings: number, processSavings: number, demandSavings: number, savingsTarget: number): ProcurementSavingsRecord {
    const totalSavings = negotiatedSavings + processSavings + demandSavings;
    this.cumulativeSavings += totalSavings;
    const recordId = `procsav-${Date.now()}-${++this.counter}`;
    const rec: ProcurementSavingsRecord = {
      recordId, period, totalAddressableSpend: addressableSpend, negotiatedSavings,
      processEfficiencySavings: processSavings, demandManagementSavings: demandSavings,
      totalSavings, savingsAsSpendPct: addressableSpend > 0 ? (totalSavings / addressableSpend) * 100 : 0,
      cumulativeSavings: this.cumulativeSavings, savingsTarget,
      achievementVsTargetPct: savingsTarget > 0 ? (totalSavings / savingsTarget) * 100 : 0,
      calculatedAt: Date.now()
    };
    this.records.push(rec);
    return rec;
  }

  getLatest(): ProcurementSavingsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getSavingsTrend(): number[] {
    return this.records.map(r => r.totalSavings);
  }
}

export const procurementSpendAnalyzer = new ProcurementSpendAnalyzer();
export const supplierNegotiationTracker = new SupplierNegotiationTracker();
export const procurementContractManager = new ProcurementContractManager();
export const procurementSavingsTracker = new ProcurementSavingsTracker();

export { ProcurementSpendRecord, SupplierNegotiationRecord, ProcurementContractRecord, ProcurementSavingsRecord };
