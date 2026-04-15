/**
 * Phase 213: Supply Chain Cost Optimization
 * Cost driver analysis, optimization opportunities, TCO calculation, cost reduction tracking
 */

import { logger } from './logger';

interface CostDriver {
  driverId: string;
  category: 'logistics' | 'inventory' | 'procurement' | 'quality' | 'overhead' | 'tariffs';
  name: string;
  currentCost: number;
  benchmarkCost: number;
  variance: number;
  variancePct: number;
  controllable: boolean;
  period: string;
  createdAt: number;
}

interface OptimizationOpportunity {
  opportunityId: string;
  driverId: string;
  title: string;
  lever: 'renegotiate' | 'consolidate' | 'automate' | 'nearshore' | 'substitute' | 'reduce_safety_stock';
  estimatedSavings: number;
  implementationCost: number;
  paybackMonths: number;
  complexity: 'low' | 'medium' | 'high';
  status: 'identified' | 'approved' | 'in_progress' | 'realized' | 'rejected';
  createdAt: number;
}

interface TCORecord {
  tcoId: string;
  supplierId: string;
  itemId: string;
  purchasePrice: number;
  logisticsCost: number;
  qualityCost: number;
  inventoryCarryingCost: number;
  dutyAndTariff: number;
  adminCost: number;
  totalCost: number;
  unitCount: number;
  tcoPerUnit: number;
  period: string;
  calculatedAt: number;
}

interface CostReductionRecord {
  reductionId: string;
  opportunityId: string;
  period: string;
  targetSavings: number;
  actualSavings: number;
  achievementRate: number;
  status: 'on_track' | 'exceeded' | 'underperforming';
  reportedAt: number;
}

class CostDriverAnalyzer {
  private drivers: Map<string, CostDriver> = new Map();
  private counter = 0;

  record(category: CostDriver['category'], name: string, currentCost: number, benchmarkCost: number, period: string, controllable = true): CostDriver {
    const driverId = `driver-${Date.now()}-${++this.counter}`;
    const variance = currentCost - benchmarkCost;
    const variancePct = benchmarkCost > 0 ? (variance / benchmarkCost) * 100 : 0;
    const driver: CostDriver = {
      driverId, category, name, currentCost, benchmarkCost,
      variance, variancePct, controllable, period, createdAt: Date.now()
    };
    this.drivers.set(driverId, driver);
    return driver;
  }

  getHighVarianceDrivers(threshold = 10): CostDriver[] {
    return Array.from(this.drivers.values())
      .filter(d => d.variancePct >= threshold && d.controllable)
      .sort((a, b) => b.variancePct - a.variancePct);
  }

  getByCategory(category: CostDriver['category']): CostDriver[] {
    return Array.from(this.drivers.values()).filter(d => d.category === category);
  }

  getTotalVariance(period?: string): number {
    return Array.from(this.drivers.values())
      .filter(d => !period || d.period === period)
      .reduce((s, d) => s + d.variance, 0);
  }

  getDriver(driverId: string): CostDriver | undefined {
    return this.drivers.get(driverId);
  }
}

class OptimizationOpportunityFinder {
  private opportunities: Map<string, OptimizationOpportunity> = new Map();
  private counter = 0;

  identify(driverId: string, title: string, lever: OptimizationOpportunity['lever'], estimatedSavings: number, implementationCost: number, complexity: OptimizationOpportunity['complexity']): OptimizationOpportunity {
    const opportunityId = `optim-${Date.now()}-${++this.counter}`;
    const paybackMonths = estimatedSavings > 0 ? Math.ceil((implementationCost / (estimatedSavings / 12))) : 999;
    const opportunity: OptimizationOpportunity = {
      opportunityId, driverId, title, lever, estimatedSavings,
      implementationCost, paybackMonths, complexity,
      status: 'identified', createdAt: Date.now()
    };
    this.opportunities.set(opportunityId, opportunity);
    logger.debug('Optimization opportunity identified', { opportunityId, title, lever, estimatedSavings, paybackMonths });
    return opportunity;
  }

  approve(opportunityId: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (opp && opp.status === 'identified') { opp.status = 'approved'; return true; }
    return false;
  }

  advance(opportunityId: string, status: OptimizationOpportunity['status']): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (opp) { opp.status = status; return true; }
    return false;
  }

  getQuickWins(maxPaybackMonths = 6): OptimizationOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.paybackMonths <= maxPaybackMonths && o.complexity !== 'high' && o.status !== 'rejected')
      .sort((a, b) => a.paybackMonths - b.paybackMonths);
  }

  getTotalPotentialSavings(): number {
    return Array.from(this.opportunities.values())
      .filter(o => o.status !== 'rejected')
      .reduce((s, o) => s + o.estimatedSavings, 0);
  }
}

class TCOCalculator {
  private records: Map<string, TCORecord> = new Map();
  private counter = 0;

  calculate(supplierId: string, itemId: string, purchasePrice: number, logisticsCost: number, qualityCost: number, inventoryCarrying: number, dutyAndTariff: number, adminCost: number, unitCount: number, period: string): TCORecord {
    const tcoId = `tco-${Date.now()}-${++this.counter}`;
    const totalCost = purchasePrice + logisticsCost + qualityCost + inventoryCarrying + dutyAndTariff + adminCost;
    const tcoPerUnit = unitCount > 0 ? totalCost / unitCount : 0;
    const record: TCORecord = {
      tcoId, supplierId, itemId, purchasePrice, logisticsCost,
      qualityCost, inventoryCarryingCost: inventoryCarrying, dutyAndTariff, adminCost,
      totalCost, unitCount, tcoPerUnit, period, calculatedAt: Date.now()
    };
    this.records.set(`${supplierId}:${itemId}`, record);
    logger.debug('TCO calculated', { supplierId, itemId, tcoPerUnit: tcoPerUnit.toFixed(2) });
    return record;
  }

  compareTCO(supplierId1: string, itemId: string, supplierId2: string): { preferred: string; saving: number } | undefined {
    const tco1 = this.records.get(`${supplierId1}:${itemId}`);
    const tco2 = this.records.get(`${supplierId2}:${itemId}`);
    if (!tco1 || !tco2) return undefined;
    const preferred = tco1.tcoPerUnit <= tco2.tcoPerUnit ? supplierId1 : supplierId2;
    const saving = Math.abs(tco1.tcoPerUnit - tco2.tcoPerUnit);
    return { preferred, saving };
  }

  getTCO(supplierId: string, itemId: string): TCORecord | undefined {
    return this.records.get(`${supplierId}:${itemId}`);
  }
}

class CostReductionTracker {
  private records: Map<string, CostReductionRecord> = new Map();
  private counter = 0;

  report(opportunityId: string, period: string, targetSavings: number, actualSavings: number): CostReductionRecord {
    const reductionId = `reduction-${Date.now()}-${++this.counter}`;
    const achievementRate = targetSavings > 0 ? (actualSavings / targetSavings) * 100 : 0;
    const status: CostReductionRecord['status'] =
      achievementRate >= 110 ? 'exceeded' : achievementRate >= 80 ? 'on_track' : 'underperforming';
    const record: CostReductionRecord = {
      reductionId, opportunityId, period, targetSavings, actualSavings,
      achievementRate, status, reportedAt: Date.now()
    };
    this.records.set(reductionId, record);
    logger.debug('Cost reduction reported', { reductionId, opportunityId, achievementRate: achievementRate.toFixed(1), status });
    return record;
  }

  getTotalActualSavings(period?: string): number {
    return Array.from(this.records.values())
      .filter(r => !period || r.period === period)
      .reduce((s, r) => s + r.actualSavings, 0);
  }

  getAchievementRate(period?: string): number {
    const filtered = Array.from(this.records.values()).filter(r => !period || r.period === period);
    if (!filtered.length) return 0;
    const target = filtered.reduce((s, r) => s + r.targetSavings, 0);
    const actual = filtered.reduce((s, r) => s + r.actualSavings, 0);
    return target > 0 ? (actual / target) * 100 : 0;
  }

  getUnderperformingItems(): CostReductionRecord[] {
    return Array.from(this.records.values()).filter(r => r.status === 'underperforming');
  }
}

export const costDriverAnalyzer = new CostDriverAnalyzer();
export const optimizationOpportunityFinder = new OptimizationOpportunityFinder();
export const tcoCalculator = new TCOCalculator();
export const costReductionTracker = new CostReductionTracker();

export { CostDriver, OptimizationOpportunity, TCORecord, CostReductionRecord };
