/**
 * Phase 235: Investment Portfolio Analytics
 * Portfolio construction, performance attribution, asset allocation, rebalancing management
 */

import { logger } from './logger';

interface PortfolioHolding {
  holdingId: string;
  portfolioId: string;
  assetId: string;
  assetName: string;
  assetClass: string;
  quantity: number;
  costBasis: number;
  currentValue: number;
  unrealizedGainLoss: number;
  weightPct: number;
  addedAt: number;
}

interface PerformanceAttribution {
  attributionId: string;
  portfolioId: string;
  period: string;
  totalReturn: number;
  benchmarkReturn: number;
  activeReturn: number;  // total - benchmark
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  calculatedAt: number;
}

interface AssetAllocationPlan {
  planId: string;
  portfolioId: string;
  targetAllocations: Record<string, number>;  // assetClass → target %
  currentAllocations: Record<string, number>;
  driftAmounts: Record<string, number>;
  rebalancingNeeded: boolean;
  maxDrift: number;
  createdAt: number;
}

interface RebalancingOrder {
  orderId: string;
  portfolioId: string;
  assetId: string;
  direction: 'buy' | 'sell';
  quantity: number;
  estimatedValue: number;
  reason: string;
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: number;
  executedAt?: number;
}

class PortfolioManager {
  private holdings: Map<string, PortfolioHolding[]> = new Map();
  private counter = 0;

  addHolding(portfolioId: string, assetId: string, assetName: string, assetClass: string, quantity: number, costBasis: number, currentValue: number): PortfolioHolding {
    const holdingId = `holding-${Date.now()}-${++this.counter}`;
    const holding: PortfolioHolding = {
      holdingId, portfolioId, assetId, assetName, assetClass, quantity,
      costBasis, currentValue, unrealizedGainLoss: currentValue - costBasis,
      weightPct: 0, addedAt: Date.now()
    };
    const existing = this.holdings.get(portfolioId) || [];
    existing.push(holding);
    // Recalculate weights
    const totalValue = existing.reduce((s, h) => s + h.currentValue, 0);
    for (const h of existing) h.weightPct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
    this.holdings.set(portfolioId, existing);
    logger.debug('Holding added', { holdingId, portfolioId, assetName, currentValue });
    return holding;
  }

  getTotalValue(portfolioId: string): number {
    return (this.holdings.get(portfolioId) || []).reduce((s, h) => s + h.currentValue, 0);
  }

  getTotalUnrealizedGain(portfolioId: string): number {
    return (this.holdings.get(portfolioId) || []).reduce((s, h) => s + h.unrealizedGainLoss, 0);
  }

  getHoldings(portfolioId: string): PortfolioHolding[] {
    return this.holdings.get(portfolioId) || [];
  }

  getByAssetClass(portfolioId: string, assetClass: string): PortfolioHolding[] {
    return (this.holdings.get(portfolioId) || []).filter(h => h.assetClass === assetClass);
  }
}

class PerformanceAttributor {
  private attributions: Map<string, PerformanceAttribution[]> = new Map();
  private counter = 0;

  attribute(portfolioId: string, period: string, totalReturn: number, benchmarkReturn: number, allocationEffect: number, selectionEffect: number): PerformanceAttribution {
    const interactionEffect = (totalReturn - benchmarkReturn) - allocationEffect - selectionEffect;
    const attributionId = `perfattr-${Date.now()}-${++this.counter}`;
    const attribution: PerformanceAttribution = {
      attributionId, portfolioId, period, totalReturn, benchmarkReturn,
      activeReturn: totalReturn - benchmarkReturn,
      allocationEffect, selectionEffect, interactionEffect, calculatedAt: Date.now()
    };
    const existing = this.attributions.get(portfolioId) || [];
    existing.push(attribution);
    this.attributions.set(portfolioId, existing);
    return attribution;
  }

  getLatest(portfolioId: string): PerformanceAttribution | undefined {
    const history = this.attributions.get(portfolioId) || [];
    return history[history.length - 1];
  }

  getOutperformingPortfolios(): PerformanceAttribution[] {
    return Array.from(this.attributions.values())
      .map(h => h[h.length - 1])
      .filter((a): a is PerformanceAttribution => !!a && a.activeReturn > 0)
      .sort((a, b) => b.activeReturn - a.activeReturn);
  }
}

class AssetAllocationManager {
  private plans: Map<string, AssetAllocationPlan> = new Map();
  private counter = 0;

  plan(portfolioId: string, targets: Record<string, number>, current: Record<string, number>, driftThreshold = 5): AssetAllocationPlan {
    const driftAmounts: Record<string, number> = {};
    let maxDrift = 0;
    for (const assetClass of new Set([...Object.keys(targets), ...Object.keys(current)])) {
      const drift = (current[assetClass] || 0) - (targets[assetClass] || 0);
      driftAmounts[assetClass] = drift;
      if (Math.abs(drift) > maxDrift) maxDrift = Math.abs(drift);
    }
    const planId = `aalloc-${Date.now()}-${++this.counter}`;
    const plan: AssetAllocationPlan = {
      planId, portfolioId, targetAllocations: targets, currentAllocations: current,
      driftAmounts, rebalancingNeeded: maxDrift > driftThreshold, maxDrift, createdAt: Date.now()
    };
    this.plans.set(portfolioId, plan);
    return plan;
  }

  getPortfoliosNeedingRebalance(): AssetAllocationPlan[] {
    return Array.from(this.plans.values()).filter(p => p.rebalancingNeeded);
  }

  getPlan(portfolioId: string): AssetAllocationPlan | undefined {
    return this.plans.get(portfolioId);
  }
}

class RebalancingEngine {
  private orders: Map<string, RebalancingOrder[]> = new Map();
  private counter = 0;

  generateOrders(portfolioId: string, driftAmounts: Record<string, number>, totalValue: number): RebalancingOrder[] {
    const orders: RebalancingOrder[] = [];
    for (const [assetClass, drift] of Object.entries(driftAmounts)) {
      if (Math.abs(drift) < 1) continue;
      const orderId = `rebalord-${Date.now()}-${++this.counter}`;
      const estimatedValue = Math.abs(drift / 100) * totalValue;
      const order: RebalancingOrder = {
        orderId, portfolioId, assetId: assetClass,
        direction: drift > 0 ? 'sell' : 'buy',
        quantity: 0, estimatedValue,
        reason: `Drift of ${drift.toFixed(1)}% from target`,
        status: 'pending', createdAt: Date.now()
      };
      orders.push(order);
    }
    const existing = this.orders.get(portfolioId) || [];
    existing.push(...orders);
    this.orders.set(portfolioId, existing);
    logger.debug('Rebalancing orders generated', { portfolioId, count: orders.length });
    return orders;
  }

  executeOrder(orderId: string, portfolioId: string): boolean {
    const orders = this.orders.get(portfolioId) || [];
    const order = orders.find(o => o.orderId === orderId);
    if (!order || order.status !== 'pending') return false;
    order.status = 'executed';
    order.executedAt = Date.now();
    return true;
  }

  getPendingOrders(portfolioId: string): RebalancingOrder[] {
    return (this.orders.get(portfolioId) || []).filter(o => o.status === 'pending');
  }
}

export const portfolioManager = new PortfolioManager();
export const performanceAttributor = new PerformanceAttributor();
export const assetAllocationManager = new AssetAllocationManager();
export const rebalancingEngine = new RebalancingEngine();

export { PortfolioHolding, PerformanceAttribution, AssetAllocationPlan, RebalancingOrder };
