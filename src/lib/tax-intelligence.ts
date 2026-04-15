/**
 * Phase 236: Tax Intelligence
 * Tax position management, transfer pricing, tax provision, tax risk tracking
 */

import { logger } from './logger';

interface TaxPosition {
  positionId: string;
  jurisdiction: string;
  taxType: 'corporate_income' | 'vat' | 'withholding' | 'payroll' | 'transfer_pricing' | 'customs';
  taxableAmount: number;
  taxRate: number;
  taxLiability: number;
  deferredTax: number;
  effectiveTaxRate: number;
  period: string;
  dueDate: number;
  status: 'estimated' | 'filed' | 'paid' | 'under_audit' | 'disputed';
  capturedAt: number;
}

interface TransferPricingRecord {
  recordId: string;
  transactionId: string;
  relatedPartyId: string;
  transactionType: 'goods' | 'services' | 'royalties' | 'loans' | 'ip';
  transactionValue: number;
  armLengthRange: { low: number; high: number };
  pricingMethod: 'CUP' | 'CostPlus' | 'ResalePrice' | 'TNMM' | 'ProfitSplit';
  isWithinRange: boolean;
  adjustmentRequired: number;
  period: string;
  createdAt: number;
}

interface TaxProvision {
  provisionId: string;
  period: string;
  currentTaxExpense: number;
  deferredTaxExpense: number;
  totalTaxExpense: number;
  effectiveTaxRate: number;
  cashTaxes: number;
  uncertainTaxPositions: number;
  createdAt: number;
}

interface TaxRiskItem {
  riskId: string;
  jurisdiction: string;
  description: string;
  exposureAmount: number;
  probability: number;    // 0-1
  expectedLoss: number;   // exposure * probability
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'under_review' | 'resolved' | 'litigated';
  identifiedAt: number;
}

class TaxPositionManager {
  private positions: Map<string, TaxPosition[]> = new Map();
  private counter = 0;

  record(jurisdiction: string, taxType: TaxPosition['taxType'], taxableAmount: number, taxRate: number, deferredTax: number, period: string, dueDate: number): TaxPosition {
    const taxLiability = taxableAmount * (taxRate / 100) + deferredTax;
    const positionId = `taxpos-${Date.now()}-${++this.counter}`;
    const position: TaxPosition = {
      positionId, jurisdiction, taxType, taxableAmount, taxRate, taxLiability, deferredTax,
      effectiveTaxRate: taxableAmount > 0 ? (taxLiability / taxableAmount) * 100 : 0,
      period, dueDate, status: 'estimated', capturedAt: Date.now()
    };
    const key = `${jurisdiction}:${taxType}:${period}`;
    const existing = this.positions.get(key) || [];
    existing.push(position);
    this.positions.set(key, existing);
    logger.debug('Tax position recorded', { jurisdiction, taxType, taxLiability });
    return position;
  }

  getTotalLiability(period: string): number {
    return Array.from(this.positions.values())
      .flat()
      .filter(p => p.period === period)
      .reduce((s, p) => s + p.taxLiability, 0);
  }

  getOverdue(): TaxPosition[] {
    return Array.from(this.positions.values())
      .flat()
      .filter(p => p.status !== 'paid' && p.dueDate < Date.now());
  }

  updateStatus(positionId: string, status: TaxPosition['status']): boolean {
    for (const positions of this.positions.values()) {
      const pos = positions.find(p => p.positionId === positionId);
      if (pos) { pos.status = status; return true; }
    }
    return false;
  }
}

class TransferPricingAnalyzer {
  private records: Map<string, TransferPricingRecord> = new Map();
  private counter = 0;

  analyze(transactionId: string, relatedPartyId: string, transactionType: TransferPricingRecord['transactionType'], value: number, armLengthLow: number, armLengthHigh: number, pricingMethod: TransferPricingRecord['pricingMethod'], period: string): TransferPricingRecord {
    const isWithinRange = value >= armLengthLow && value <= armLengthHigh;
    const adjustmentRequired = isWithinRange ? 0 :
      value < armLengthLow ? armLengthLow - value : value - armLengthHigh;
    const recordId = `tp-${Date.now()}-${++this.counter}`;
    const record: TransferPricingRecord = {
      recordId, transactionId, relatedPartyId, transactionType,
      transactionValue: value, armLengthRange: { low: armLengthLow, high: armLengthHigh },
      pricingMethod, isWithinRange, adjustmentRequired, period, createdAt: Date.now()
    };
    this.records.set(transactionId, record);
    return record;
  }

  getOutOfRangeTransactions(): TransferPricingRecord[] {
    return Array.from(this.records.values()).filter(r => !r.isWithinRange);
  }

  getTotalAdjustmentRequired(): number {
    return Array.from(this.records.values()).reduce((s, r) => s + r.adjustmentRequired, 0);
  }
}

class TaxProvisionCalculator {
  private provisions: TaxProvision[] = [];
  private counter = 0;

  calculate(period: string, currentTaxExpense: number, deferredTaxExpense: number, pretaxIncome: number, cashTaxes: number, uncertainPositions: number): TaxProvision {
    const totalTaxExpense = currentTaxExpense + deferredTaxExpense;
    const effectiveTaxRate = pretaxIncome > 0 ? (totalTaxExpense / pretaxIncome) * 100 : 0;
    const provisionId = `taxprov-${Date.now()}-${++this.counter}`;
    const provision: TaxProvision = {
      provisionId, period, currentTaxExpense, deferredTaxExpense, totalTaxExpense,
      effectiveTaxRate, cashTaxes, uncertainTaxPositions: uncertainPositions, createdAt: Date.now()
    };
    this.provisions.push(provision);
    return provision;
  }

  getLatest(): TaxProvision | undefined {
    return this.provisions[this.provisions.length - 1];
  }

  getAvgEffectiveTaxRate(): number {
    if (!this.provisions.length) return 0;
    return this.provisions.reduce((s, p) => s + p.effectiveTaxRate, 0) / this.provisions.length;
  }
}

class TaxRiskTracker {
  private risks: Map<string, TaxRiskItem> = new Map();
  private counter = 0;

  identify(jurisdiction: string, description: string, exposureAmount: number, probability: number): TaxRiskItem {
    const expectedLoss = exposureAmount * probability;
    const riskLevel: TaxRiskItem['riskLevel'] =
      expectedLoss >= 1000000 ? 'critical' :
      expectedLoss >= 250000 ? 'high' :
      expectedLoss >= 50000 ? 'medium' : 'low';
    const riskId = `taxrisk-${Date.now()}-${++this.counter}`;
    const risk: TaxRiskItem = {
      riskId, jurisdiction, description, exposureAmount,
      probability: Math.max(0, Math.min(1, probability)),
      expectedLoss, riskLevel, status: 'open', identifiedAt: Date.now()
    };
    this.risks.set(riskId, risk);
    logger.debug('Tax risk identified', { jurisdiction, riskLevel, expectedLoss });
    return risk;
  }

  getTotalExposure(): number {
    return Array.from(this.risks.values()).filter(r => r.status !== 'resolved').reduce((s, r) => s + r.exposureAmount, 0);
  }

  getCriticalRisks(): TaxRiskItem[] {
    return Array.from(this.risks.values())
      .filter(r => (r.riskLevel === 'critical' || r.riskLevel === 'high') && r.status !== 'resolved')
      .sort((a, b) => b.expectedLoss - a.expectedLoss);
  }

  resolve(riskId: string): boolean {
    const risk = this.risks.get(riskId);
    if (!risk) return false;
    risk.status = 'resolved';
    return true;
  }
}

export const taxPositionManager = new TaxPositionManager();
export const transferPricingAnalyzer = new TransferPricingAnalyzer();
export const taxProvisionCalculator = new TaxProvisionCalculator();
export const taxRiskTracker = new TaxRiskTracker();

export { TaxPosition, TransferPricingRecord, TaxProvision, TaxRiskItem };
