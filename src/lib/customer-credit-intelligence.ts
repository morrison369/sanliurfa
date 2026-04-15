/**
 * Phase 294: Customer Credit Intelligence
 * Credit scoring, exposure management, collections analytics, credit risk forecasting
 */

import { logger } from './logger';

interface CreditProfileRecord {
  profileId: string;
  customerId: string;
  customerName: string;
  creditScore: number;           // 0-100 internal score
  creditLimit: number;
  currentExposure: number;       // outstanding balance
  utilizationRatePct: number;
  paymentHistoryScore: number;   // 0-100
  daysSalesOutstanding: number;  // DSO
  riskGrade: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  lastReviewDate: number;
  nextReviewDate: number;
  createdAt: number;
}

interface CreditExposureRecord {
  recordId: string;
  period: string;
  totalCustomers: number;
  totalCreditLimit: number;
  totalOutstandingUSD: number;
  avgUtilizationPct: number;
  overdueAmount: number;
  overdueRatePct: number;
  top10ConcentrationPct: number;   // top 10 customers as % of total exposure
  expectedCreditLosses: number;    // ECL provision
  calculatedAt: number;
}

interface CollectionsRecord {
  recordId: string;
  customerId: string;
  invoiceId: string;
  invoiceAmount: number;
  dueDate: number;
  daysOverdue: number;
  agingBucket: '0-30' | '31-60' | '61-90' | '91-120' | '120+';
  collectionStatus: 'current' | 'reminded' | 'escalated' | 'legal' | 'written_off';
  collectorId?: string;
  promiseToPayDate?: number;
  collectedAmount: number;
  remainingAmount: number;
  recordedAt: number;
}

interface CreditRiskForecastRecord {
  forecastId: string;
  period: string;
  forecastedDefaultRate: number;
  forecastedBadDebtUSD: number;
  forecastedECL: number;
  creditQualityMigration: Record<string, number>;  // grade changes expected
  macroFactors: string[];
  confidence: 'high' | 'medium' | 'low';
  generatedAt: number;
}

class CreditProfileManager {
  private profiles: Map<string, CreditProfileRecord> = new Map();
  private counter = 0;

  evaluate(customerId: string, customerName: string, paymentHistory: number, dso: number, financialStability: number, creditLimit: number, currentExposure: number): CreditProfileRecord {
    const creditScore =
      paymentHistory * 0.4 + Math.max(0, 100 - dso) * 0.3 + financialStability * 0.3;
    const utilization = creditLimit > 0 ? (currentExposure / creditLimit) * 100 : 0;
    const riskGrade: CreditProfileRecord['riskGrade'] =
      creditScore >= 90 ? 'AAA' : creditScore >= 80 ? 'AA' : creditScore >= 70 ? 'A' :
      creditScore >= 60 ? 'BBB' : creditScore >= 50 ? 'BB' : creditScore >= 40 ? 'B' :
      creditScore >= 25 ? 'CCC' : 'D';
    const riskCategory: CreditProfileRecord['riskCategory'] =
      creditScore >= 70 ? 'low' : creditScore >= 50 ? 'medium' : creditScore >= 30 ? 'high' : 'critical';

    const profileId = `credit-${Date.now()}-${++this.counter}`;
    const record: CreditProfileRecord = {
      profileId, customerId, customerName,
      creditScore: Math.max(0, Math.min(100, creditScore)), creditLimit, currentExposure,
      utilizationRatePct: utilization, paymentHistoryScore: paymentHistory,
      daysSalesOutstanding: dso, riskGrade, riskCategory, lastReviewDate: Date.now(),
      nextReviewDate: Date.now() + 90 * 86400000, createdAt: Date.now()
    };
    this.profiles.set(customerId, record);
    logger.debug('Credit profile evaluated', { customerId, creditScore, riskGrade });
    return record;
  }

  getHighRiskCustomers(): CreditProfileRecord[] {
    return Array.from(this.profiles.values())
      .filter(p => p.riskCategory === 'high' || p.riskCategory === 'critical')
      .sort((a, b) => b.currentExposure - a.currentExposure);
  }

  getOverLimitCustomers(): CreditProfileRecord[] {
    return Array.from(this.profiles.values())
      .filter(p => p.utilizationRatePct > 100);
  }

  getTotalExposure(): number {
    return Array.from(this.profiles.values()).reduce((s, p) => s + p.currentExposure, 0);
  }

  getProfile(customerId: string): CreditProfileRecord | undefined {
    return this.profiles.get(customerId);
  }
}

class CreditExposureAnalyzer {
  private records: CreditExposureRecord[] = [];
  private counter = 0;

  analyze(period: string, profiles: CreditProfileRecord[], overdueAmount: number): CreditExposureRecord {
    const totalLimit = profiles.reduce((s, p) => s + p.creditLimit, 0);
    const totalOutstanding = profiles.reduce((s, p) => s + p.currentExposure, 0);
    const avgUtilization = profiles.length > 0
      ? profiles.reduce((s, p) => s + p.utilizationRatePct, 0) / profiles.length : 0;
    const sorted = [...profiles].sort((a, b) => b.currentExposure - a.currentExposure).slice(0, 10);
    const top10Concentration = totalOutstanding > 0
      ? (sorted.reduce((s, p) => s + p.currentExposure, 0) / totalOutstanding) * 100 : 0;
    const ecl = profiles.reduce((s, p) => {
      const pdRate = p.riskCategory === 'critical' ? 0.5 : p.riskCategory === 'high' ? 0.15 : p.riskCategory === 'medium' ? 0.05 : 0.01;
      return s + p.currentExposure * pdRate;
    }, 0);

    const recordId = `credexp-${Date.now()}-${++this.counter}`;
    const record: CreditExposureRecord = {
      recordId, period, totalCustomers: profiles.length, totalCreditLimit: totalLimit,
      totalOutstandingUSD: totalOutstanding, avgUtilizationPct: avgUtilization,
      overdueAmount, overdueRatePct: totalOutstanding > 0 ? (overdueAmount / totalOutstanding) * 100 : 0,
      top10ConcentrationPct: top10Concentration, expectedCreditLosses: ecl, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): CreditExposureRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getECLTrend(): number[] {
    return this.records.map(r => r.expectedCreditLosses);
  }
}

class CollectionsManager {
  private records: CollectionsRecord[] = [];
  private counter = 0;

  register(customerId: string, invoiceId: string, amount: number, dueDate: number): CollectionsRecord {
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate) / 86400000));
    const agingBucket: CollectionsRecord['agingBucket'] =
      daysOverdue <= 30 ? '0-30' : daysOverdue <= 60 ? '31-60' :
      daysOverdue <= 90 ? '61-90' : daysOverdue <= 120 ? '91-120' : '120+';

    const recordId = `collect-${Date.now()}-${++this.counter}`;
    const record: CollectionsRecord = {
      recordId, customerId, invoiceId, invoiceAmount: amount, dueDate, daysOverdue,
      agingBucket, collectionStatus: daysOverdue === 0 ? 'current' : 'reminded',
      collectedAmount: 0, remainingAmount: amount, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  recordPayment(invoiceId: string, amount: number): boolean {
    const record = this.records.find(r => r.invoiceId === invoiceId);
    if (!record) return false;
    record.collectedAmount += amount;
    record.remainingAmount = Math.max(0, record.invoiceAmount - record.collectedAmount);
    if (record.remainingAmount === 0) record.collectionStatus = 'current';
    return true;
  }

  getTotalOverdue(): number {
    return this.records.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.remainingAmount, 0);
  }

  getAgingBuckets(): Record<string, number> {
    const result: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, '120+': 0 };
    for (const r of this.records) result[r.agingBucket] = (result[r.agingBucket] || 0) + r.remainingAmount;
    return result;
  }

  getCollectionRate(): number {
    const total = this.records.reduce((s, r) => s + r.invoiceAmount, 0);
    const collected = this.records.reduce((s, r) => s + r.collectedAmount, 0);
    return total > 0 ? (collected / total) * 100 : 0;
  }
}

class CreditRiskForecaster {
  private forecasts: CreditRiskForecastRecord[] = [];
  private counter = 0;

  forecast(period: string, profiles: CreditProfileRecord[], macroFactors: string[], baseDefaultRate: number): CreditRiskForecastRecord {
    const totalExposure = profiles.reduce((s, p) => s + p.currentExposure, 0);
    const criticalCount = profiles.filter(p => p.riskCategory === 'critical').length;
    const adjustedDefaultRate = baseDefaultRate * (1 + criticalCount * 0.05);
    const forecastedBadDebt = totalExposure * (adjustedDefaultRate / 100);
    const ecl = forecastedBadDebt * 0.6;  // loss-given-default assumption 60%
    const confidence: CreditRiskForecastRecord['confidence'] =
      macroFactors.length <= 1 ? 'high' : macroFactors.length <= 3 ? 'medium' : 'low';

    const forecastId = `credforecast-${Date.now()}-${++this.counter}`;
    const record: CreditRiskForecastRecord = {
      forecastId, period, forecastedDefaultRate: adjustedDefaultRate,
      forecastedBadDebtUSD: forecastedBadDebt, forecastedECL: ecl,
      creditQualityMigration: {}, macroFactors, confidence, generatedAt: Date.now()
    };
    this.forecasts.push(record);
    return record;
  }

  getLatest(): CreditRiskForecastRecord | undefined {
    return this.forecasts[this.forecasts.length - 1];
  }

  getDefaultRateTrend(): number[] {
    return this.forecasts.map(f => f.forecastedDefaultRate);
  }
}

export const creditProfileManager = new CreditProfileManager();
export const creditExposureAnalyzer = new CreditExposureAnalyzer();
export const collectionsManager = new CollectionsManager();
export const creditRiskForecaster = new CreditRiskForecaster();

export { CreditProfileRecord, CreditExposureRecord, CollectionsRecord, CreditRiskForecastRecord };
