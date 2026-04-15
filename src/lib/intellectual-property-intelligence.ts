/**
 * Phase 271: Intellectual Property Intelligence
 * Patent portfolio, trademark monitoring, IP valuation, licensing analytics
 */

import { logger } from './logger';

interface PatentRecord {
  patentId: string;
  title: string;
  applicationNumber: string;
  status: 'filed' | 'pending' | 'granted' | 'abandoned' | 'expired';
  filingDate: number;
  grantDate?: number;
  expiryDate?: number;
  inventors: string[];
  technologyArea: string;
  jurisdictions: string[];
  maintenanceFeesDue: number;
  estimatedValue: number;
  citationCount: number;       // times cited by other patents
  licensingRevenue: number;
  isDefensive: boolean;        // filed to block competitors vs. core product
  createdAt: number;
}

interface TrademarkRecord {
  trademarkId: string;
  mark: string;
  type: 'wordmark' | 'figurative' | 'combined' | 'sound' | '3d';
  classes: number[];            // Nice classification classes
  jurisdictions: string[];
  registrationDate?: number;
  expiryDate?: number;
  status: 'applied' | 'registered' | 'opposed' | 'expired' | 'cancelled';
  renewalCost: number;
  brandValue: number;           // estimated trademark contribution to brand value
  infringementAlerts: number;
  createdAt: number;
}

interface IPValuationRecord {
  valuationId: string;
  ipType: 'patent' | 'trademark' | 'copyright' | 'trade_secret';
  assetId: string;
  valuationMethod: 'cost' | 'market' | 'income';
  estimatedValue: number;
  licensingPotential: number;
  defensiveValue: number;
  totalValue: number;
  valuedAt: number;
}

interface LicensingAgreement {
  agreementId: string;
  ipAssetId: string;
  licenseeName: string;
  licenseType: 'exclusive' | 'non_exclusive' | 'cross_license' | 'compulsory';
  territory: string[];
  annualRoyalty: number;
  royaltyRatePct: number;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  createdAt: number;
}

class PatentPortfolioManager {
  private patents: Map<string, PatentRecord> = new Map();
  private counter = 0;

  register(title: string, appNumber: string, inventors: string[], techArea: string, jurisdictions: string[], isDefensive: boolean): PatentRecord {
    const patentId = `patent-${Date.now()}-${++this.counter}`;
    const patent: PatentRecord = {
      patentId, title, applicationNumber: appNumber, status: 'filed',
      filingDate: Date.now(), inventors, technologyArea: techArea, jurisdictions,
      maintenanceFeesDue: 0, estimatedValue: 0, citationCount: 0,
      licensingRevenue: 0, isDefensive, createdAt: Date.now()
    };
    this.patents.set(patentId, patent);
    logger.debug('Patent registered', { patentId, title, techArea });
    return patent;
  }

  grant(patentId: string, estimatedValue: number): boolean {
    const patent = this.patents.get(patentId);
    if (!patent) return false;
    patent.status = 'granted';
    patent.grantDate = Date.now();
    patent.expiryDate = Date.now() + 20 * 365 * 86400000;  // 20-year patent term
    patent.estimatedValue = estimatedValue;
    return true;
  }

  updateMetrics(patentId: string, citationCount: number, licensingRevenue: number, maintenanceFees: number): boolean {
    const patent = this.patents.get(patentId);
    if (!patent) return false;
    patent.citationCount = citationCount;
    patent.licensingRevenue = licensingRevenue;
    patent.maintenanceFeesDue = maintenanceFees;
    return true;
  }

  getPortfolioValue(): number {
    return Array.from(this.patents.values())
      .filter(p => p.status === 'granted')
      .reduce((s, p) => s + p.estimatedValue, 0);
  }

  getMostCited(limit = 5): PatentRecord[] {
    return Array.from(this.patents.values())
      .filter(p => p.status === 'granted')
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, limit);
  }

  getByTechArea(area: string): PatentRecord[] {
    return Array.from(this.patents.values()).filter(p => p.technologyArea === area);
  }
}

class TrademarkMonitor {
  private trademarks: Map<string, TrademarkRecord> = new Map();
  private counter = 0;

  register(mark: string, type: TrademarkRecord['type'], classes: number[], jurisdictions: string[], brandValue: number): TrademarkRecord {
    const trademarkId = `tm-${Date.now()}-${++this.counter}`;
    const trademark: TrademarkRecord = {
      trademarkId, mark, type, classes, jurisdictions,
      status: 'applied', renewalCost: classes.length * jurisdictions.length * 300,
      brandValue, infringementAlerts: 0, createdAt: Date.now()
    };
    this.trademarks.set(trademarkId, trademark);
    return trademark;
  }

  recordInfringementAlert(trademarkId: string): boolean {
    const tm = this.trademarks.get(trademarkId);
    if (!tm) return false;
    tm.infringementAlerts++;
    return true;
  }

  getActiveInfringements(): TrademarkRecord[] {
    return Array.from(this.trademarks.values())
      .filter(t => t.infringementAlerts > 0)
      .sort((a, b) => b.infringementAlerts - a.infringementAlerts);
  }

  getTotalBrandValue(): number {
    return Array.from(this.trademarks.values())
      .filter(t => t.status === 'registered')
      .reduce((s, t) => s + t.brandValue, 0);
  }
}

class IPValuationEngine {
  private valuations: Map<string, IPValuationRecord> = new Map();
  private counter = 0;

  value(ipType: IPValuationRecord['ipType'], assetId: string, method: IPValuationRecord['valuationMethod'], estimatedValue: number, licensingPotential: number, defensiveValue: number): IPValuationRecord {
    const totalValue = estimatedValue + licensingPotential * 0.5 + defensiveValue * 0.3;
    const valuationId = `ipval-${Date.now()}-${++this.counter}`;
    const record: IPValuationRecord = {
      valuationId, ipType, assetId, valuationMethod: method, estimatedValue,
      licensingPotential, defensiveValue, totalValue, valuedAt: Date.now()
    };
    this.valuations.set(assetId, record);
    return record;
  }

  getTotalIPPortfolioValue(): number {
    return Array.from(this.valuations.values()).reduce((s, v) => s + v.totalValue, 0);
  }

  getByType(ipType: IPValuationRecord['ipType']): IPValuationRecord[] {
    return Array.from(this.valuations.values()).filter(v => v.ipType === ipType);
  }
}

class LicensingManager {
  private agreements: Map<string, LicensingAgreement> = new Map();
  private counter = 0;

  create(ipAssetId: string, licenseeName: string, licenseType: LicensingAgreement['licenseType'], territory: string[], annualRoyalty: number, royaltyRatePct: number, endDate: number): LicensingAgreement {
    const agreementId = `license-${Date.now()}-${++this.counter}`;
    const agreement: LicensingAgreement = {
      agreementId, ipAssetId, licenseeName, licenseType, territory,
      annualRoyalty, royaltyRatePct, startDate: Date.now(), endDate, status: 'active', createdAt: Date.now()
    };
    this.agreements.set(agreementId, agreement);
    logger.debug('Licensing agreement created', { agreementId, licenseeName, annualRoyalty });
    return agreement;
  }

  getTotalAnnualRoyalties(): number {
    return Array.from(this.agreements.values())
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + a.annualRoyalty, 0);
  }

  getExpiringAgreements(days = 180): LicensingAgreement[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.agreements.values())
      .filter(a => a.status === 'active' && a.endDate <= horizon)
      .sort((a, b) => a.endDate - b.endDate);
  }

  getByAsset(ipAssetId: string): LicensingAgreement[] {
    return Array.from(this.agreements.values()).filter(a => a.ipAssetId === ipAssetId);
  }
}

export const patentPortfolioManager = new PatentPortfolioManager();
export const trademarkMonitor = new TrademarkMonitor();
export const ipValuationEngine = new IPValuationEngine();
export const licensingManager = new LicensingManager();

export { PatentRecord, TrademarkRecord, IPValuationRecord, LicensingAgreement };
