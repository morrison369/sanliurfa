/**
 * Phase 275: Real Estate Portfolio Intelligence
 * Property valuation, portfolio performance, tenant analytics, market benchmarking
 */

import { logger } from './logger';

interface PropertyRecord {
  propertyId: string;
  name: string;
  address: string;
  propertyType: 'office' | 'retail' | 'industrial' | 'residential' | 'mixed_use' | 'land';
  totalSqFt: number;
  leasableSqFt: number;
  acquisitionDate: number;
  acquisitionCost: number;
  currentValue: number;
  annualNOI: number;           // Net Operating Income
  capRate: number;             // NOI / Current Value
  occupancyRatePct: number;
  status: 'owned' | 'leased' | 'under_development' | 'for_sale';
  createdAt: number;
}

interface TenantRecord {
  tenantId: string;
  propertyId: string;
  tenantName: string;
  leasedSqFt: number;
  leaseStartDate: number;
  leaseEndDate: number;
  monthlyRent: number;
  rentPerSqFt: number;
  leaseType: 'gross' | 'net' | 'modified_gross' | 'triple_net';
  creditRating: 'A' | 'B' | 'C' | 'D';
  paymentHistoryScore: number;   // 0-100
  renewalLikelihood: 'high' | 'medium' | 'low';
  status: 'active' | 'expired' | 'terminated' | 'pending';
  createdAt: number;
}

interface PortfolioPerformanceRecord {
  recordId: string;
  period: string;
  totalProperties: number;
  totalValueUSD: number;
  totalNOI: number;
  avgCapRate: number;
  avgOccupancyRatePct: number;
  totalRentalIncome: number;
  totalOperatingExpenses: number;
  netCashFlow: number;
  returnOnInvestmentPct: number;
  vacancyLossUSD: number;
  calculatedAt: number;
}

interface MarketBenchmarkRecord {
  benchmarkId: string;
  market: string;
  propertyType: string;
  avgCapRate: number;
  avgRentPerSqFt: number;
  avgOccupancyRatePct: number;
  marketTrend: 'appreciating' | 'stable' | 'depreciating';
  yoyValueChangePct: number;
  recordedAt: number;
}

class PropertyPortfolioManager {
  private properties: Map<string, PropertyRecord> = new Map();
  private counter = 0;

  add(name: string, address: string, type: PropertyRecord['propertyType'], totalSqFt: number, leasableSqFt: number, acquisitionCost: number): PropertyRecord {
    const propertyId = `prop-${Date.now()}-${++this.counter}`;
    const property: PropertyRecord = {
      propertyId, name, address, propertyType: type, totalSqFt, leasableSqFt,
      acquisitionDate: Date.now(), acquisitionCost, currentValue: acquisitionCost,
      annualNOI: 0, capRate: 0, occupancyRatePct: 0, status: 'owned', createdAt: Date.now()
    };
    this.properties.set(propertyId, property);
    logger.debug('Property added to portfolio', { propertyId, name, type });
    return property;
  }

  updateValuation(propertyId: string, currentValue: number, annualNOI: number, occupancyRatePct: number): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;
    property.currentValue = currentValue;
    property.annualNOI = annualNOI;
    property.occupancyRatePct = occupancyRatePct;
    property.capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;
    return true;
  }

  getTotalPortfolioValue(): number {
    return Array.from(this.properties.values()).reduce((s, p) => s + p.currentValue, 0);
  }

  getTopPerformers(limit = 5): PropertyRecord[] {
    return Array.from(this.properties.values())
      .filter(p => p.annualNOI > 0)
      .sort((a, b) => b.capRate - a.capRate)
      .slice(0, limit);
  }

  getVacantProperties(): PropertyRecord[] {
    return Array.from(this.properties.values()).filter(p => p.occupancyRatePct < 100);
  }

  getProperty(propertyId: string): PropertyRecord | undefined {
    return this.properties.get(propertyId);
  }
}

class TenantAnalyticsEngine {
  private tenants: Map<string, TenantRecord[]> = new Map();
  private counter = 0;

  add(propertyId: string, tenantName: string, leasedSqFt: number, leaseStartDate: number, leaseEndDate: number, monthlyRent: number, leaseType: TenantRecord['leaseType'], creditRating: TenantRecord['creditRating']): TenantRecord {
    const tenantId = `tenant-${Date.now()}-${++this.counter}`;
    const rentPerSqFt = leasedSqFt > 0 ? (monthlyRent * 12) / leasedSqFt : 0;
    const daysToExpiry = (leaseEndDate - Date.now()) / 86400000;
    const renewalLikelihood: TenantRecord['renewalLikelihood'] =
      creditRating === 'A' && daysToExpiry > 180 ? 'high' :
      creditRating === 'D' || daysToExpiry < 60 ? 'low' : 'medium';

    const record: TenantRecord = {
      tenantId, propertyId, tenantName, leasedSqFt, leaseStartDate, leaseEndDate,
      monthlyRent, rentPerSqFt, leaseType, creditRating, paymentHistoryScore: 100,
      renewalLikelihood, status: 'active', createdAt: Date.now()
    };
    const existing = this.tenants.get(propertyId) || [];
    existing.push(record);
    this.tenants.set(propertyId, existing);
    return record;
  }

  updatePaymentHistory(tenantId: string, propertyId: string, score: number): boolean {
    const tenants = this.tenants.get(propertyId) || [];
    const tenant = tenants.find(t => t.tenantId === tenantId);
    if (!tenant) return false;
    tenant.paymentHistoryScore = Math.max(0, Math.min(100, score));
    if (tenant.paymentHistoryScore < 60) tenant.renewalLikelihood = 'low';
    return true;
  }

  getExpiringLeases(days = 180): TenantRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.tenants.values())
      .flat()
      .filter(t => t.status === 'active' && t.leaseEndDate <= horizon)
      .sort((a, b) => a.leaseEndDate - b.leaseEndDate);
  }

  getTotalMonthlyRent(propertyId: string): number {
    return (this.tenants.get(propertyId) || [])
      .filter(t => t.status === 'active')
      .reduce((s, t) => s + t.monthlyRent, 0);
  }

  getLowCreditTenants(): TenantRecord[] {
    return Array.from(this.tenants.values())
      .flat()
      .filter(t => t.status === 'active' && (t.creditRating === 'C' || t.creditRating === 'D'));
  }
}

class PortfolioPerformanceAnalyzer {
  private records: PortfolioPerformanceRecord[] = [];
  private counter = 0;

  analyze(period: string, properties: PropertyRecord[], totalOperatingExpenses: number): PortfolioPerformanceRecord {
    const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
    const totalNOI = properties.reduce((s, p) => s + p.annualNOI, 0);
    const totalAcquisitionCost = properties.reduce((s, p) => s + p.acquisitionCost, 0);
    const avgCapRate = properties.length > 0 ? properties.reduce((s, p) => s + p.capRate, 0) / properties.length : 0;
    const avgOccupancy = properties.length > 0 ? properties.reduce((s, p) => s + p.occupancyRatePct, 0) / properties.length : 0;
    const totalRentalIncome = totalNOI + totalOperatingExpenses;
    const netCashFlow = totalNOI - totalOperatingExpenses;
    const roi = totalAcquisitionCost > 0 ? (netCashFlow / totalAcquisitionCost) * 100 : 0;
    const vacancyLoss = properties.reduce((s, p) => {
      const fullOccupancyIncome = p.annualNOI / Math.max(0.01, p.occupancyRatePct / 100);
      return s + (fullOccupancyIncome - p.annualNOI);
    }, 0);

    const recordId = `portperf-${Date.now()}-${++this.counter}`;
    const record: PortfolioPerformanceRecord = {
      recordId, period, totalProperties: properties.length, totalValueUSD: totalValue, totalNOI,
      avgCapRate, avgOccupancyRatePct: avgOccupancy, totalRentalIncome, totalOperatingExpenses,
      netCashFlow, returnOnInvestmentPct: roi, vacancyLossUSD: vacancyLoss, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): PortfolioPerformanceRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getTrendROI(): number[] {
    return this.records.map(r => r.returnOnInvestmentPct);
  }
}

class MarketBenchmarkTracker {
  private benchmarks: Map<string, MarketBenchmarkRecord[]> = new Map();
  private counter = 0;

  record(market: string, propertyType: string, avgCapRate: number, avgRentPerSqFt: number, avgOccupancy: number, yoyChangePct: number): MarketBenchmarkRecord {
    const trend: MarketBenchmarkRecord['marketTrend'] =
      yoyChangePct >= 2 ? 'appreciating' : yoyChangePct <= -2 ? 'depreciating' : 'stable';
    const benchmarkId = `bench-${Date.now()}-${++this.counter}`;
    const record: MarketBenchmarkRecord = {
      benchmarkId, market, propertyType, avgCapRate, avgRentPerSqFt, avgOccupancyRatePct: avgOccupancy,
      marketTrend: trend, yoyValueChangePct: yoyChangePct, recordedAt: Date.now()
    };
    const key = `${market}:${propertyType}`;
    const existing = this.benchmarks.get(key) || [];
    existing.push(record);
    this.benchmarks.set(key, existing);
    return record;
  }

  getLatest(market: string, propertyType: string): MarketBenchmarkRecord | undefined {
    const key = `${market}:${propertyType}`;
    const history = this.benchmarks.get(key) || [];
    return history[history.length - 1];
  }

  getAppreciatingMarkets(): MarketBenchmarkRecord[] {
    return Array.from(this.benchmarks.values())
      .map(h => h[h.length - 1])
      .filter((r): r is MarketBenchmarkRecord => !!r && r.marketTrend === 'appreciating')
      .sort((a, b) => b.yoyValueChangePct - a.yoyValueChangePct);
  }
}

export const propertyPortfolioManager = new PropertyPortfolioManager();
export const tenantAnalyticsEngine = new TenantAnalyticsEngine();
export const portfolioPerformanceAnalyzer = new PortfolioPerformanceAnalyzer();
export const marketBenchmarkTracker = new MarketBenchmarkTracker();

export { PropertyRecord, TenantRecord, PortfolioPerformanceRecord, MarketBenchmarkRecord };
