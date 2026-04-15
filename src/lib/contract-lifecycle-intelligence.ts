/**
 * Phase 305: Contract Lifecycle Intelligence
 * Contract creation, approval workflow, renewal management, obligation tracking
 */

import { logger } from './logger';

interface ContractRecord {
  contractId: string;
  contractName: string;
  contractType: 'vendor' | 'customer' | 'partnership' | 'employment' | 'nda' | 'lease' | 'service';
  counterparty: string;
  ownerDepartment: string;
  legalCounsel: string;
  startDate: number;
  endDate: number;
  totalValueUSD: number;
  annualValueUSD: number;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  renewalDeadline: number;        // endDate - renewalNoticeDays
  status: 'draft' | 'review' | 'negotiation' | 'approved' | 'active' | 'expiring' | 'expired' | 'terminated';
  riskLevel: 'high' | 'medium' | 'low';
  keyObligations: string[];
  pendingObligations: number;
  fulfilledObligations: number;
  breachCount: number;
  daysToExpiry: number;
  createdAt: number;
}

interface ContractObligationRecord {
  obligationId: string;
  contractId: string;
  description: string;
  obligationType: 'payment' | 'delivery' | 'reporting' | 'compliance' | 'performance' | 'renewal';
  dueDate: number;
  responsibleParty: 'us' | 'counterparty';
  status: 'pending' | 'in_progress' | 'fulfilled' | 'overdue' | 'waived';
  penaltyIfMissed: number;
  completedAt?: number;
}

interface ContractRenewalRecord {
  renewalId: string;
  contractId: string;
  contractName: string;
  counterparty: string;
  currentEndDate: number;
  renewalDeadline: number;
  daysToDeadline: number;
  recommendedAction: 'renew' | 'renegotiate' | 'terminate' | 'evaluate';
  estimatedRenewalValueUSD: number;
  lastPerformanceScore: number;    // 0-100
  contractValueUSD: number;
  status: 'pending_review' | 'approved' | 'declined' | 'negotiating';
  createdAt: number;
}

interface ContractPerformanceRecord {
  recordId: string;
  contractId: string;
  period: string;
  slaCompliancePct: number;
  obligationFulfillmentPct: number;
  disputeCount: number;
  penaltiesLeviedUSD: number;
  creditsReceivedUSD: number;
  overallPerformanceScore: number;  // weighted composite
  trend: 'improving' | 'stable' | 'declining';
  recordedAt: number;
}

class ContractManager {
  private contracts: Map<string, ContractRecord> = new Map();
  private counter = 0;

  create(name: string, type: ContractRecord['contractType'], counterparty: string, dept: string, counsel: string, startDate: number, endDate: number, totalValue: number, autoRenewal: boolean, noticeDays: number, obligations: string[], riskLevel: ContractRecord['riskLevel']): ContractRecord {
    const contractId = `con-${Date.now()}-${++this.counter}`;
    const now = Date.now();
    const renewalDeadline = endDate - noticeDays * 86400000;
    const daysToExpiry = Math.ceil((endDate - now) / 86400000);
    const termYears = (endDate - startDate) / (365.25 * 86400000);
    const annualValue = termYears > 0 ? totalValue / termYears : totalValue;

    const status: ContractRecord['status'] =
      daysToExpiry < 0 ? 'expired' :
      daysToExpiry <= noticeDays ? 'expiring' : 'active';

    const record: ContractRecord = {
      contractId, contractName: name, contractType: type, counterparty,
      ownerDepartment: dept, legalCounsel: counsel, startDate, endDate,
      totalValueUSD: totalValue, annualValueUSD: Math.round(annualValue),
      autoRenewal, renewalNoticeDays: noticeDays, renewalDeadline,
      status, riskLevel, keyObligations: obligations,
      pendingObligations: obligations.length, fulfilledObligations: 0,
      breachCount: 0, daysToExpiry, createdAt: now
    };
    this.contracts.set(contractId, record);
    logger.debug('Contract created', { contractId, name, type, daysToExpiry });
    return record;
  }

  updateStatus(contractId: string, status: ContractRecord['status']): boolean {
    const c = this.contracts.get(contractId);
    if (!c) return false;
    c.status = status;
    return true;
  }

  recordBreach(contractId: string): boolean {
    const c = this.contracts.get(contractId);
    if (!c) return false;
    c.breachCount++;
    return true;
  }

  getExpiringContracts(daysAhead = 90): ContractRecord[] {
    const cutoff = Date.now() + daysAhead * 86400000;
    return Array.from(this.contracts.values())
      .filter(c => c.status === 'active' && c.endDate <= cutoff)
      .sort((a, b) => a.endDate - b.endDate);
  }

  getHighRiskContracts(): ContractRecord[] {
    return Array.from(this.contracts.values()).filter(c => c.riskLevel === 'high' && c.status === 'active');
  }

  getTotalActiveValue(): number {
    return Array.from(this.contracts.values())
      .filter(c => c.status === 'active')
      .reduce((s, c) => s + c.annualValueUSD, 0);
  }

  getContract(id: string): ContractRecord | undefined {
    return this.contracts.get(id);
  }

  getAll(): ContractRecord[] {
    return Array.from(this.contracts.values());
  }
}

class ContractObligationTracker {
  private obligations: Map<string, ContractObligationRecord[]> = new Map();
  private counter = 0;

  add(contractId: string, description: string, type: ContractObligationRecord['obligationType'], dueDate: number, party: ContractObligationRecord['responsibleParty'], penalty: number): ContractObligationRecord {
    const obligationId = `oblig-${Date.now()}-${++this.counter}`;
    const now = Date.now();
    const status: ContractObligationRecord['status'] = dueDate < now ? 'overdue' : 'pending';
    const record: ContractObligationRecord = {
      obligationId, contractId, description, obligationType: type,
      dueDate, responsibleParty: party, status, penaltyIfMissed: penalty
    };
    const existing = this.obligations.get(contractId) || [];
    existing.push(record);
    this.obligations.set(contractId, existing);
    return record;
  }

  fulfill(obligationId: string, contractId: string): boolean {
    const obligs = this.obligations.get(contractId) || [];
    const o = obligs.find(ob => ob.obligationId === obligationId);
    if (!o) return false;
    o.status = 'fulfilled';
    o.completedAt = Date.now();
    return true;
  }

  getOverdueObligations(): ContractObligationRecord[] {
    return Array.from(this.obligations.values()).flat()
      .filter(o => o.status === 'overdue')
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  getTotalPenaltyExposure(): number {
    return Array.from(this.obligations.values()).flat()
      .filter(o => o.status === 'overdue')
      .reduce((s, o) => s + o.penaltyIfMissed, 0);
  }
}

class ContractRenewalManager {
  private renewals: ContractRenewalRecord[] = [];
  private counter = 0;

  evaluate(contractId: string, name: string, counterparty: string, currentEnd: number, noticeDays: number, estimatedRenewalValue: number, lastPerfScore: number, contractValue: number): ContractRenewalRecord {
    const renewalId = `renewal-${Date.now()}-${++this.counter}`;
    const deadline = currentEnd - noticeDays * 86400000;
    const daysToDeadline = Math.ceil((deadline - Date.now()) / 86400000);

    const action: ContractRenewalRecord['recommendedAction'] =
      lastPerfScore >= 80 ? 'renew' :
      lastPerfScore >= 60 ? 'renegotiate' :
      lastPerfScore >= 40 ? 'evaluate' : 'terminate';

    const record: ContractRenewalRecord = {
      renewalId, contractId, contractName: name, counterparty, currentEndDate: currentEnd,
      renewalDeadline: deadline, daysToDeadline, recommendedAction: action,
      estimatedRenewalValueUSD: estimatedRenewalValue, lastPerformanceScore: lastPerfScore,
      contractValueUSD: contractValue, status: 'pending_review', createdAt: Date.now()
    };
    this.renewals.push(record);
    logger.debug('Renewal evaluated', { renewalId, action, daysToDeadline });
    return record;
  }

  getUrgentRenewals(daysThreshold = 30): ContractRenewalRecord[] {
    return this.renewals
      .filter(r => r.daysToDeadline <= daysThreshold && r.status === 'pending_review')
      .sort((a, b) => a.daysToDeadline - b.daysToDeadline);
  }

  getRecommendedTerminations(): ContractRenewalRecord[] {
    return this.renewals.filter(r => r.recommendedAction === 'terminate');
  }

  getTotalRenewalValue(): number {
    return this.renewals.filter(r => r.recommendedAction === 'renew').reduce((s, r) => s + r.estimatedRenewalValueUSD, 0);
  }
}

class ContractPerformanceAnalyzer {
  private records: ContractPerformanceRecord[] = [];
  private counter = 0;

  analyze(contractId: string, period: string, slaCompliance: number, obligationFulfillment: number, disputes: number, penalties: number, credits: number): ContractPerformanceRecord {
    const overall = slaCompliance * 0.4 + obligationFulfillment * 0.4 + Math.max(0, 100 - disputes * 10) * 0.2;

    const prevRecords = this.records.filter(r => r.contractId === contractId);
    const prevScore = prevRecords.length > 0 ? prevRecords[prevRecords.length - 1].overallPerformanceScore : overall;
    const trend: ContractPerformanceRecord['trend'] = overall > prevScore + 2 ? 'improving' : overall < prevScore - 2 ? 'declining' : 'stable';

    const recordId = `contperf-${Date.now()}-${++this.counter}`;
    const record: ContractPerformanceRecord = {
      recordId, contractId, period, slaCompliancePct: slaCompliance,
      obligationFulfillmentPct: obligationFulfillment, disputeCount: disputes,
      penaltiesLeviedUSD: penalties, creditsReceivedUSD: credits,
      overallPerformanceScore: Math.round(Math.max(0, Math.min(100, overall)) * 10) / 10,
      trend, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLowPerformanceContracts(threshold = 70): ContractPerformanceRecord[] {
    return this.records.filter(r => r.overallPerformanceScore < threshold)
      .sort((a, b) => a.overallPerformanceScore - b.overallPerformanceScore);
  }

  getTotalPenalties(): number {
    return this.records.reduce((s, r) => s + r.penaltiesLeviedUSD, 0);
  }
}

export const contractManager = new ContractManager();
export const contractObligationTracker = new ContractObligationTracker();
export const contractRenewalManager = new ContractRenewalManager();
export const contractPerformanceAnalyzer = new ContractPerformanceAnalyzer();

export { ContractRecord, ContractObligationRecord, ContractRenewalRecord, ContractPerformanceRecord };
