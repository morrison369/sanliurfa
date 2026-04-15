/**
 * Phase 295: Trade Compliance Intelligence
 * Export controls, sanctions screening, customs analytics, trade risk management
 */

import { logger } from './logger';

interface TradeComplianceCheckRecord {
  checkId: string;
  transactionId: string;
  checkType: 'sanctions_screening' | 'export_control' | 'customs_classification' | 'denied_party' | 'embargo';
  entityChecked: string;
  entityType: 'customer' | 'supplier' | 'country' | 'product';
  result: 'clear' | 'match' | 'potential_match' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  screenedAgainstLists: string[];
  matchDetails?: string;
  reviewRequired: boolean;
  checkedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

interface ExportControlRecord {
  recordId: string;
  productId: string;
  productName: string;
  eccn: string;                  // Export Control Classification Number
  htsCode: string;               // Harmonized Tariff Schedule
  licenseRequired: boolean;
  licenseType?: string;
  destinationCountries: string[];
  restrictedCountries: string[];
  dualUsePotential: boolean;
  militaryEndUseRisk: boolean;
  annualExportValue: number;
  licenseApplicationCount: number;
  licenseApprovalRate: number;
  createdAt: number;
}

interface CustomsRecord {
  customsId: string;
  shipmentId: string;
  direction: 'import' | 'export';
  originCountry: string;
  destinationCountry: string;
  htsCode: string;
  declaredValue: number;
  dutiesAndTaxes: number;
  effectiveDutyRatePct: number;
  brokerName: string;
  clearanceTimeHours: number;
  inspectionRequired: boolean;
  penaltiesAssessed: number;
  status: 'pending' | 'in_transit' | 'cleared' | 'held' | 'rejected';
  filedAt: number;
  clearedAt?: number;
}

interface TradeRiskRecord {
  recordId: string;
  period: string;
  totalTransactionsScreened: number;
  sanctionsMatches: number;
  exportControlViolations: number;
  deniedPartyMatches: number;
  customsPenalties: number;
  complianceCostUSD: number;
  revenueAtRiskUSD: number;
  overallRiskScore: number;       // 0-100
  topRiskCountries: string[];
  calculatedAt: number;
}

class TradeComplianceScreener {
  private checks: TradeComplianceCheckRecord[] = [];
  private counter = 0;

  private sanctionedEntities = new Set(['entity_a', 'country_x', 'blocked_corp']);

  screen(transactionId: string, type: TradeComplianceCheckRecord['checkType'], entity: string, entityType: TradeComplianceCheckRecord['entityType'], lists: string[]): TradeComplianceCheckRecord {
    const lowerEntity = entity.toLowerCase().replace(/\s+/g, '_');
    const isMatch = this.sanctionedEntities.has(lowerEntity);
    const result: TradeComplianceCheckRecord['result'] =
      isMatch ? 'match' : Math.random() < 0.02 ? 'potential_match' : 'clear';
    const riskLevel: TradeComplianceCheckRecord['riskLevel'] =
      result === 'match' ? 'blocked' : result === 'potential_match' ? 'high' : 'low';

    const checkId = `tcheck-${Date.now()}-${++this.counter}`;
    const record: TradeComplianceCheckRecord = {
      checkId, transactionId, checkType: type, entityChecked: entity, entityType,
      result, riskLevel, screenedAgainstLists: lists,
      matchDetails: isMatch ? `Entity found on sanctions list` : undefined,
      reviewRequired: result !== 'clear', checkedAt: Date.now()
    };
    this.checks.push(record);
    if (result !== 'clear') logger.debug('Trade compliance alert', { checkId, entity, result });
    return record;
  }

  markReviewed(checkId: string, reviewer: string): boolean {
    const check = this.checks.find(c => c.checkId === checkId);
    if (!check) return false;
    check.reviewedBy = reviewer;
    check.reviewedAt = Date.now();
    check.reviewRequired = false;
    return true;
  }

  getPendingReviews(): TradeComplianceCheckRecord[] {
    return this.checks.filter(c => c.reviewRequired);
  }

  getMatchRate(): number {
    if (!this.checks.length) return 0;
    return (this.checks.filter(c => c.result === 'match' || c.result === 'potential_match').length / this.checks.length) * 100;
  }

  getBlockedTransactions(): TradeComplianceCheckRecord[] {
    return this.checks.filter(c => c.result === 'blocked' || c.result === 'match');
  }
}

class ExportControlManager {
  private records: Map<string, ExportControlRecord> = new Map();
  private counter = 0;

  classify(productId: string, productName: string, eccn: string, htsCode: string, destinations: string[], restricted: string[], dualUse: boolean, militaryRisk: boolean, annualValue: number): ExportControlRecord {
    const licenseRequired = restricted.length > 0 || dualUse || militaryRisk;
    const recordId = `expctrl-${Date.now()}-${++this.counter}`;
    const record: ExportControlRecord = {
      recordId: productId, productId, productName, eccn, htsCode, licenseRequired,
      destinationCountries: destinations, restrictedCountries: restricted,
      dualUsePotential: dualUse, militaryEndUseRisk: militaryRisk, annualExportValue: annualValue,
      licenseApplicationCount: 0, licenseApprovalRate: 0, createdAt: Date.now()
    };
    this.records.set(productId, record);
    return record;
  }

  updateLicenseStats(productId: string, applications: number, approvalRate: number): boolean {
    const record = this.records.get(productId);
    if (!record) return false;
    record.licenseApplicationCount = applications;
    record.licenseApprovalRate = approvalRate;
    return true;
  }

  getHighRiskProducts(): ExportControlRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.militaryEndUseRisk || r.dualUsePotential)
      .sort((a, b) => b.annualExportValue - a.annualExportValue);
  }

  getTotalExportValue(): number {
    return Array.from(this.records.values()).reduce((s, r) => s + r.annualExportValue, 0);
  }
}

class CustomsAnalyticsEngine {
  private records: CustomsRecord[] = [];
  private counter = 0;

  file(shipmentId: string, direction: CustomsRecord['direction'], origin: string, destination: string, htsCode: string, value: number, duties: number, broker: string): CustomsRecord {
    const customsId = `customs-${Date.now()}-${++this.counter}`;
    const record: CustomsRecord = {
      customsId, shipmentId, direction, originCountry: origin, destinationCountry: destination,
      htsCode, declaredValue: value, dutiesAndTaxes: duties,
      effectiveDutyRatePct: value > 0 ? (duties / value) * 100 : 0,
      brokerName: broker, clearanceTimeHours: 0, inspectionRequired: false,
      penaltiesAssessed: 0, status: 'pending', filedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  clear(shipmentId: string, clearanceHours: number, inspected: boolean, penalties: number): boolean {
    const record = this.records.find(r => r.shipmentId === shipmentId);
    if (!record) return false;
    record.clearanceTimeHours = clearanceHours;
    record.inspectionRequired = inspected;
    record.penaltiesAssessed = penalties;
    record.status = penalties > 0 ? 'held' : 'cleared';
    record.clearedAt = Date.now();
    return true;
  }

  getAvgClearanceTime(): number {
    const cleared = this.records.filter(r => r.status === 'cleared');
    if (!cleared.length) return 0;
    return cleared.reduce((s, r) => s + r.clearanceTimeHours, 0) / cleared.length;
  }

  getTotalDuties(): number {
    return this.records.reduce((s, r) => s + r.dutiesAndTaxes, 0);
  }

  getTotalPenalties(): number {
    return this.records.reduce((s, r) => s + r.penaltiesAssessed, 0);
  }
}

class TradeRiskMonitor {
  private records: TradeRiskRecord[] = [];
  private counter = 0;

  assess(period: string, screened: number, sanctionsMatches: number, exportViolations: number, deniedParties: number, customsPenalties: number, complianceCost: number, revenueAtRisk: number, topRiskCountries: string[]): TradeRiskRecord {
    const riskScore =
      (sanctionsMatches / Math.max(1, screened)) * 40 * 100 +
      exportViolations * 5 +
      (customsPenalties > 0 ? 10 : 0) +
      deniedParties * 3;

    const recordId = `traderisk-${Date.now()}-${++this.counter}`;
    const record: TradeRiskRecord = {
      recordId, period, totalTransactionsScreened: screened, sanctionsMatches,
      exportControlViolations: exportViolations, deniedPartyMatches: deniedParties,
      customsPenalties, complianceCostUSD: complianceCost, revenueAtRiskUSD: revenueAtRisk,
      overallRiskScore: Math.max(0, Math.min(100, riskScore)), topRiskCountries, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Trade risk assessed', { period, riskScore: record.overallRiskScore });
    return record;
  }

  getLatest(): TradeRiskRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getRiskTrend(): number[] {
    return this.records.map(r => r.overallRiskScore);
  }
}

export const tradeComplianceScreener = new TradeComplianceScreener();
export const exportControlManager = new ExportControlManager();
export const customsAnalyticsEngine = new CustomsAnalyticsEngine();
export const tradeRiskMonitor = new TradeRiskMonitor();

export { TradeComplianceCheckRecord, ExportControlRecord, CustomsRecord, TradeRiskRecord };
