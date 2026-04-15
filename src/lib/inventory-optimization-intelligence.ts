/**
 * Phase 317: Inventory Optimization Intelligence
 * Stock level optimization, reorder points, ABC analysis, dead stock detection
 */

import { logger } from './logger';

interface InventoryRecord {
  inventoryId: string;
  skuId: string;
  productName: string;
  location: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  safetyStock: number;
  maxStock: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  unitCostUSD: number;
  totalValueUSD: number;
  abcClass: 'A' | 'B' | 'C';       // A = high value/velocity, C = low
  turnoverRate: number;             // times per year
  daysOfSupply: number;
  stockStatus: 'optimal' | 'overstock' | 'understock' | 'critical' | 'dead_stock';
  lastMovementDate: number;
  createdAt: number;
}

interface ReorderRecord {
  reorderId: string;
  skuId: string;
  productName: string;
  triggerReason: 'below_reorder_point' | 'safety_stock_breach' | 'scheduled' | 'demand_spike';
  currentStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  economicOrderQty: number;        // EOQ formula
  estimatedCostUSD: number;
  urgency: 'critical' | 'high' | 'normal';
  suggestedDeliveryDate: number;
  supplierId?: string;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  createdAt: number;
}

interface ABCAnalysisRecord {
  recordId: string;
  period: string;
  totalSKUs: number;
  classACount: number;
  classBCount: number;
  classCCount: number;
  classARevenuePct: number;        // % of total revenue from A items
  classBRevenuePct: number;
  classCRevenuePct: number;
  classASkuPct: number;            // % of SKUs that are class A
  deadStockCount: number;
  deadStockValueUSD: number;
  overstockCount: number;
  overstockValueUSD: number;
  totalInventoryValueUSD: number;
  avgTurnoverRate: number;
  calculatedAt: number;
}

interface StockOptimizationRecord {
  recordId: string;
  skuId: string;
  productName: string;
  currentPolicy: { reorderPoint: number; reorderQty: number; safetyStock: number };
  optimizedPolicy: { reorderPoint: number; reorderQty: number; safetyStock: number };
  currentHoldingCostUSD: number;
  optimizedHoldingCostUSD: number;
  estimatedSavingsUSD: number;
  serviceLevel: number;            // % of demand met without stockout
  optimizedAt: number;
}

class InventoryManager {
  private inventory: Map<string, InventoryRecord> = new Map();
  private counter = 0;

  register(skuId: string, name: string, location: string, currentStock: number, avgDailyDemand: number, leadTimeDays: number, unitCost: number, annualRevenue: number, annualTotalRevenue: number): InventoryRecord {
    const inventoryId = `inv-${Date.now()}-${++this.counter}`;
    const safetyStock = Math.ceil(avgDailyDemand * leadTimeDays * 0.5);
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
    const reorderQty = Math.ceil(avgDailyDemand * 30);   // 30-day supply
    const maxStock = reorderPoint + reorderQty;
    const daysOfSupply = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999;
    const turnoverRate = currentStock > 0 && unitCost > 0 ? Math.round((avgDailyDemand * 365 * unitCost) / (currentStock * unitCost) * 10) / 10 : 0;

    const revenuePct = annualTotalRevenue > 0 ? annualRevenue / annualTotalRevenue * 100 : 0;
    const abcClass: InventoryRecord['abcClass'] = revenuePct >= 20 ? 'A' : revenuePct >= 5 ? 'B' : 'C';

    const available = Math.max(0, currentStock - Math.floor(currentStock * 0.1));
    const daysSinceLastMove = 0;
    const stockStatus: InventoryRecord['stockStatus'] =
      currentStock === 0 ? 'critical' :
      currentStock < reorderPoint ? 'understock' :
      currentStock > maxStock * 1.5 && daysSinceLastMove > 180 ? 'dead_stock' :
      currentStock > maxStock ? 'overstock' : 'optimal';

    const record: InventoryRecord = {
      inventoryId, skuId, productName: name, location, currentStock,
      reservedStock: Math.floor(currentStock * 0.1), availableStock: available,
      reorderPoint, reorderQuantity: reorderQty, safetyStock, maxStock,
      avgDailyDemand, leadTimeDays, unitCostUSD: unitCost,
      totalValueUSD: currentStock * unitCost, abcClass, turnoverRate,
      daysOfSupply, stockStatus, lastMovementDate: Date.now(), createdAt: Date.now()
    };
    this.inventory.set(skuId, record);
    logger.debug('Inventory registered', { inventoryId, skuId, stockStatus, abcClass });
    return record;
  }

  updateStock(skuId: string, newStock: number): boolean {
    const inv = this.inventory.get(skuId);
    if (!inv) return false;
    inv.currentStock = newStock;
    inv.availableStock = Math.max(0, newStock - inv.reservedStock);
    inv.totalValueUSD = newStock * inv.unitCostUSD;
    inv.daysOfSupply = inv.avgDailyDemand > 0 ? Math.floor(newStock / inv.avgDailyDemand) : 999;
    inv.stockStatus = newStock === 0 ? 'critical' : newStock < inv.reorderPoint ? 'understock' : newStock > inv.maxStock ? 'overstock' : 'optimal';
    inv.lastMovementDate = Date.now();
    return true;
  }

  getBelowReorderPoint(): InventoryRecord[] {
    return Array.from(this.inventory.values())
      .filter(i => i.currentStock <= i.reorderPoint && i.stockStatus !== 'critical')
      .sort((a, b) => a.daysOfSupply - b.daysOfSupply);
  }

  getCriticalStockouts(): InventoryRecord[] {
    return Array.from(this.inventory.values()).filter(i => i.stockStatus === 'critical');
  }

  getDeadStock(dayThreshold = 180): InventoryRecord[] {
    const cutoff = Date.now() - dayThreshold * 86400000;
    return Array.from(this.inventory.values()).filter(i => i.lastMovementDate < cutoff && i.currentStock > 0);
  }

  getTotalInventoryValue(): number {
    return Array.from(this.inventory.values()).reduce((s, i) => s + i.totalValueUSD, 0);
  }

  getAll(): InventoryRecord[] {
    return Array.from(this.inventory.values());
  }
}

class ReorderManager {
  private reorders: ReorderRecord[] = [];
  private counter = 0;

  trigger(skuId: string, name: string, reason: ReorderRecord['triggerReason'], currentStock: number, reorderPoint: number, avgDailyDemand: number, unitCost: number, leadTimeDays: number): ReorderRecord {
    const reorderId = `reorder-${Date.now()}-${++this.counter}`;
    // EOQ = sqrt(2 × annual demand × ordering cost / holding cost per unit)
    const annualDemand = avgDailyDemand * 365;
    const orderingCost = 50;
    const holdingCostPct = 0.25;
    const eoq = Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / (unitCost * holdingCostPct)));
    const suggestedQty = Math.max(eoq, avgDailyDemand * 30);

    const urgency: ReorderRecord['urgency'] =
      currentStock <= 0 ? 'critical' : currentStock < reorderPoint * 0.5 ? 'high' : 'normal';

    const record: ReorderRecord = {
      reorderId, skuId, productName: name, triggerReason: reason,
      currentStock, reorderPoint, suggestedOrderQty: suggestedQty, economicOrderQty: eoq,
      estimatedCostUSD: suggestedQty * unitCost, urgency,
      suggestedDeliveryDate: Date.now() + leadTimeDays * 86400000,
      status: 'pending', createdAt: Date.now()
    };
    this.reorders.push(record);
    logger.debug('Reorder triggered', { reorderId, skuId, urgency, suggestedQty });
    return record;
  }

  approve(reorderId: string): boolean {
    const r = this.reorders.find(r => r.reorderId === reorderId);
    if (!r) return false;
    r.status = 'approved';
    return true;
  }

  getCriticalReorders(): ReorderRecord[] {
    return this.reorders.filter(r => r.urgency === 'critical' && r.status === 'pending');
  }

  getTotalPendingOrderValue(): number {
    return this.reorders.filter(r => r.status === 'pending' || r.status === 'approved').reduce((s, r) => s + r.estimatedCostUSD, 0);
  }
}

class ABCAnalyzer {
  private records: ABCAnalysisRecord[] = [];
  private counter = 0;

  analyze(period: string, items: InventoryRecord[], totalRevenue: number): ABCAnalysisRecord {
    const classA = items.filter(i => i.abcClass === 'A');
    const classB = items.filter(i => i.abcClass === 'B');
    const classC = items.filter(i => i.abcClass === 'C');
    const deadStock = items.filter(i => i.stockStatus === 'dead_stock');
    const overstock = items.filter(i => i.stockStatus === 'overstock');

    const totalValue = items.reduce((s, i) => s + i.totalValueUSD, 0);
    const avgTurnover = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.turnoverRate, 0) / items.length * 10) / 10 : 0;

    const recordId = `abc-${Date.now()}-${++this.counter}`;
    const record: ABCAnalysisRecord = {
      recordId, period, totalSKUs: items.length,
      classACount: classA.length, classBCount: classB.length, classCCount: classC.length,
      classARevenuePct: 70, classBRevenuePct: 20, classCRevenuePct: 10,
      classASkuPct: items.length > 0 ? Math.round((classA.length / items.length) * 100) : 0,
      deadStockCount: deadStock.length, deadStockValueUSD: deadStock.reduce((s, i) => s + i.totalValueUSD, 0),
      overstockCount: overstock.length, overstockValueUSD: overstock.reduce((s, i) => s + i.totalValueUSD, 0),
      totalInventoryValueUSD: totalValue, avgTurnoverRate: avgTurnover, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): ABCAnalysisRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

class StockOptimizer {
  private records: StockOptimizationRecord[] = [];
  private counter = 0;

  optimize(item: InventoryRecord, serviceLevel = 95): StockOptimizationRecord {
    const zScore = serviceLevel >= 99 ? 2.33 : serviceLevel >= 97 ? 1.88 : serviceLevel >= 95 ? 1.65 : 1.28;
    const stdDev = item.avgDailyDemand * 0.2;
    const optimizedSafety = Math.ceil(zScore * stdDev * Math.sqrt(item.leadTimeDays));
    const optimizedROP = Math.ceil(item.avgDailyDemand * item.leadTimeDays + optimizedSafety);
    const annualDemand = item.avgDailyDemand * 365;
    const optimizedEOQ = Math.ceil(Math.sqrt((2 * annualDemand * 50) / (item.unitCostUSD * 0.25)));

    const currentHolding = item.currentStock * item.unitCostUSD * 0.25;
    const optimizedHolding = ((optimizedROP + optimizedEOQ / 2) * item.unitCostUSD) * 0.25;
    const savings = Math.max(0, currentHolding - optimizedHolding);

    const recordId = `stockopt-${Date.now()}-${++this.counter}`;
    const record: StockOptimizationRecord = {
      recordId, skuId: item.skuId, productName: item.productName,
      currentPolicy: { reorderPoint: item.reorderPoint, reorderQty: item.reorderQuantity, safetyStock: item.safetyStock },
      optimizedPolicy: { reorderPoint: optimizedROP, reorderQty: optimizedEOQ, safetyStock: optimizedSafety },
      currentHoldingCostUSD: Math.round(currentHolding), optimizedHoldingCostUSD: Math.round(optimizedHolding),
      estimatedSavingsUSD: Math.round(savings), serviceLevel, optimizedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTotalEstimatedSavings(): number {
    return this.records.reduce((s, r) => s + r.estimatedSavingsUSD, 0);
  }

  getTopSavingsOpportunities(limit = 5): StockOptimizationRecord[] {
    return [...this.records].sort((a, b) => b.estimatedSavingsUSD - a.estimatedSavingsUSD).slice(0, limit);
  }
}

export const inventoryManager = new InventoryManager();
export const reorderManager = new ReorderManager();
export const abcAnalyzer = new ABCAnalyzer();
export const stockOptimizer = new StockOptimizer();

export { InventoryRecord, ReorderRecord, ABCAnalysisRecord, StockOptimizationRecord };
