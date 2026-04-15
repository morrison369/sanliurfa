/**
 * Phase 210: Procurement Analytics
 * Spend analysis, procurement performance, contract utilization, savings tracking
 */

import { logger } from './logger';

interface SpendRecord {
  spendId: string;
  supplierId: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  department: string;
  purchaseOrderId: string;
  recordedAt: number;
}

interface ProcurementKPI {
  kpiId: string;
  period: string;
  totalSpend: number;
  managedSpend: number;
  maverick Spend: number;
  supplierCount: number;
  avgLeadTimeDays: number;
  poComplianceRate: number;
  onTimeDeliveryRate: number;
  costAvoidance: number;
}

interface ContractUtilization {
  contractId: string;
  supplierId: string;
  committedValue: number;
  actualSpend: number;
  utilizationRate: number;
  remainingValue: number;
  expiresAt: number;
  status: 'underutilized' | 'on_track' | 'overrun' | 'expired';
}

interface SavingsRecord {
  savingsId: string;
  supplierId: string;
  category: string;
  type: 'negotiated' | 'process_improvement' | 'demand_reduction' | 'specification_change';
  baselineCost: number;
  actualCost: number;
  savingsAmount: number;
  savingsPct: number;
  period: string;
  verifiedAt: number;
}

class SpendAnalyzer {
  private records: SpendRecord[] = [];
  private counter = 0;

  record(supplierId: string, category: string, amount: number, period: string, department: string, poId = ''): SpendRecord {
    const spendId = `spend-${Date.now()}-${++this.counter}`;
    const record: SpendRecord = {
      spendId, supplierId, category, amount, currency: 'USD',
      period, department, purchaseOrderId: poId, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTotalSpend(period?: string, department?: string): number {
    return this.records
      .filter(r => (!period || r.period === period) && (!department || r.department === department))
      .reduce((s, r) => s + r.amount, 0);
  }

  getSpendByCategory(period?: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const r of this.records.filter(r => !period || r.period === period)) {
      result[r.category] = (result[r.category] || 0) + r.amount;
    }
    return result;
  }

  getTopSuppliers(period?: string, limit = 10): Array<{ supplierId: string; totalSpend: number }> {
    const map = new Map<string, number>();
    for (const r of this.records.filter(r => !period || r.period === period)) {
      map.set(r.supplierId, (map.get(r.supplierId) || 0) + r.amount);
    }
    return Array.from(map.entries())
      .map(([supplierId, totalSpend]) => ({ supplierId, totalSpend }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
  }

  getSpendConcentration(period?: string): number {
    const bySupplier = this.getTopSuppliers(period, 5);
    const total = this.getTotalSpend(period);
    if (total === 0) return 0;
    return (bySupplier.slice(0, 5).reduce((s, r) => s + r.totalSpend, 0) / total) * 100;
  }
}

class ProcurementPerformanceTracker {
  private kpis: Map<string, ProcurementKPI> = new Map();
  private counter = 0;

  record(period: string, totalSpend: number, managedSpend: number, supplierCount: number, avgLeadTime: number, poCompliance: number, onTimeDelivery: number, costAvoidance: number): ProcurementKPI {
    const kpiId = `prokpi-${Date.now()}-${++this.counter}`;
    const maverickSpend = totalSpend - managedSpend;
    const kpi: ProcurementKPI = {
      kpiId, period, totalSpend, managedSpend,
      'maverick Spend': maverickSpend,
      supplierCount, avgLeadTimeDays: avgLeadTime,
      poComplianceRate: poCompliance, onTimeDeliveryRate: onTimeDelivery,
      costAvoidance
    };
    this.kpis.set(period, kpi);
    logger.debug('Procurement KPI recorded', { period, totalSpend, poCompliance, onTimeDelivery });
    return kpi;
  }

  getMaverickSpendRate(period: string): number {
    const kpi = this.kpis.get(period);
    if (!kpi || kpi.totalSpend === 0) return 0;
    return (kpi['maverick Spend'] / kpi.totalSpend) * 100;
  }

  getTrend(field: 'poComplianceRate' | 'onTimeDeliveryRate' | 'avgLeadTimeDays'): 'improving' | 'declining' | 'stable' {
    const sorted = Array.from(this.kpis.values()).sort((a, b) => a.period.localeCompare(b.period));
    if (sorted.length < 2) return 'stable';
    const prev = sorted[sorted.length - 2][field] as number;
    const curr = sorted[sorted.length - 1][field] as number;
    const isPositiveMetric = field !== 'avgLeadTimeDays';
    const improved = isPositiveMetric ? curr > prev : curr < prev;
    const changed = Math.abs(curr - prev) > (isPositiveMetric ? 2 : 1);
    return changed ? (improved ? 'improving' : 'declining') : 'stable';
  }

  getKPI(period: string): ProcurementKPI | undefined {
    return this.kpis.get(period);
  }
}

class ContractUtilizationMonitor {
  private contracts: Map<string, ContractUtilization> = new Map();

  track(contractId: string, supplierId: string, committedValue: number, actualSpend: number, expiryDays: number): ContractUtilization {
    const utilizationRate = committedValue > 0 ? (actualSpend / committedValue) * 100 : 0;
    const remainingValue = Math.max(0, committedValue - actualSpend);
    const expiresAt = Date.now() + expiryDays * 86400000;
    const status: ContractUtilization['status'] =
      expiresAt < Date.now() ? 'expired' :
        utilizationRate > 100 ? 'overrun' :
          utilizationRate < 50 ? 'underutilized' : 'on_track';

    const contract: ContractUtilization = {
      contractId, supplierId, committedValue, actualSpend,
      utilizationRate, remainingValue, expiresAt, status
    };
    this.contracts.set(contractId, contract);
    logger.debug('Contract utilization tracked', { contractId, utilizationRate: utilizationRate.toFixed(1), status });
    return contract;
  }

  updateSpend(contractId: string, additionalSpend: number): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    contract.actualSpend += additionalSpend;
    contract.utilizationRate = contract.committedValue > 0 ? (contract.actualSpend / contract.committedValue) * 100 : 0;
    contract.remainingValue = Math.max(0, contract.committedValue - contract.actualSpend);
    contract.status = contract.utilizationRate > 100 ? 'overrun' : contract.utilizationRate < 50 ? 'underutilized' : 'on_track';
    return true;
  }

  getUnderutilized(threshold = 50): ContractUtilization[] {
    return Array.from(this.contracts.values()).filter(c => c.utilizationRate < threshold && c.status !== 'expired');
  }

  getExpiringContracts(daysThreshold = 30): ContractUtilization[] {
    const cutoff = Date.now() + daysThreshold * 86400000;
    return Array.from(this.contracts.values()).filter(c => c.expiresAt <= cutoff && c.status !== 'expired');
  }

  getContract(contractId: string): ContractUtilization | undefined {
    return this.contracts.get(contractId);
  }
}

class SavingsTracker {
  private records: Map<string, SavingsRecord> = new Map();
  private counter = 0;

  record(supplierId: string, category: string, type: SavingsRecord['type'], baselineCost: number, actualCost: number, period: string): SavingsRecord {
    const savingsId = `savings-${Date.now()}-${++this.counter}`;
    const savingsAmount = baselineCost - actualCost;
    const savingsPct = baselineCost > 0 ? (savingsAmount / baselineCost) * 100 : 0;
    const record: SavingsRecord = {
      savingsId, supplierId, category, type, baselineCost, actualCost,
      savingsAmount, savingsPct, period, verifiedAt: Date.now()
    };
    this.records.set(savingsId, record);
    logger.debug('Savings recorded', { savingsId, supplierId, savingsAmount: savingsAmount.toFixed(2), savingsPct: savingsPct.toFixed(1) });
    return record;
  }

  getTotalSavings(period?: string): number {
    return Array.from(this.records.values())
      .filter(r => !period || r.period === period)
      .reduce((s, r) => s + r.savingsAmount, 0);
  }

  getSavingsByType(period?: string): Record<SavingsRecord['type'], number> {
    const result: Record<string, number> = {};
    for (const r of Array.from(this.records.values()).filter(r => !period || r.period === period)) {
      result[r.type] = (result[r.type] || 0) + r.savingsAmount;
    }
    return result as Record<SavingsRecord['type'], number>;
  }

  getSavingsRate(totalSpend: number, period?: string): number {
    const savings = this.getTotalSavings(period);
    return totalSpend > 0 ? (savings / totalSpend) * 100 : 0;
  }
}

export const spendAnalyzer = new SpendAnalyzer();
export const procurementPerformanceTracker = new ProcurementPerformanceTracker();
export const contractUtilizationMonitor = new ContractUtilizationMonitor();
export const savingsTracker = new SavingsTracker();

export { SpendRecord, ProcurementKPI, ContractUtilization, SavingsRecord };
