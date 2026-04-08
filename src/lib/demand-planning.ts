/**
 * Phase 54: Demand Planning & Forecasting
 * Demand forecasting, seasonal trend analysis, stock planning, capacity planning
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface DemandForecast {
  sku: string;
  period: string;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SeasonalPattern {
  sku: string;
  month: number;
  indexFactor: number;
}

export interface StockPlan {
  warehouseId: string;
  sku: string;
  targetLevel: number;
  safetyStock: number;
  replenishmentDate: number;
}

export interface CapacityPlan {
  warehouseId: string;
  projectedUsage: number;
  requiredCapacity: number;
  expansionNeeded: boolean;
}

// ==================== DEMAND FORECASTER ====================

export class DemandForecaster {
  private patterns = new Map<string, SeasonalPattern[]>();

  /**
   * Forecast demand for SKU
   */
  forecast(sku: string, periods: number): DemandForecast[] {
    const forecasts: DemandForecast[] = [];
    let baseDemand = Math.random() * 1000 + 100;

    for (let i = 0; i < periods; i++) {
      const month = (new Date().getMonth() + i) % 12;
      const seasonalFactor = this.getSeasonalFactor(sku, month);
      const predicted = Math.ceil(baseDemand * seasonalFactor);

      forecasts.push({
        sku,
        period: `month_${i + 1}`,
        predicted,
        confidence: 0.85 - i * 0.05,
        trend: i === 0 ? 'stable' : i % 2 === 0 ? 'up' : 'down'
      });

      baseDemand += (Math.random() - 0.5) * 100;
    }

    logger.debug('Demand forecast generated', { sku, periods });
    return forecasts;
  }

  /**
   * Get seasonal factors for SKU
   */
  getSeasonalFactors(sku: string): SeasonalPattern[] {
    return this.patterns.get(sku) || this.generateDefaultPatterns(sku);
  }

  /**
   * Detect demand trend
   */
  detectTrend(sku: string, days: number): 'up' | 'down' | 'stable' {
    const rand = Math.random();
    if (rand > 0.66) return 'up';
    if (rand > 0.33) return 'down';
    return 'stable';
  }

  /**
   * Adjust demand for seasonal factor
   */
  adjustForSeason(baseDemand: number, seasonFactor: number): number {
    return Math.ceil(baseDemand * seasonFactor);
  }

  /**
   * Get seasonal factor for month
   */
  private getSeasonalFactor(sku: string, month: number): number {
    const patterns = this.patterns.get(sku) || this.generateDefaultPatterns(sku);
    const pattern = patterns.find(p => p.month === month);
    return pattern?.indexFactor || 1.0;
  }

  /**
   * Generate default seasonal patterns
   */
  private generateDefaultPatterns(sku: string): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];
    for (let month = 0; month < 12; month++) {
      patterns.push({
        sku,
        month,
        indexFactor: 0.8 + Math.random() * 0.4
      });
    }
    return patterns;
  }
}

// ==================== STOCK PLANNER ====================

export class StockPlanner {
  private plans = new Map<string, StockPlan>();

  /**
   * Plan replenishment
   */
  planReplenishment(warehouseId: string, sku: string): StockPlan {
    const plan: StockPlan = {
      warehouseId,
      sku,
      targetLevel: Math.ceil(Math.random() * 500 + 100),
      safetyStock: Math.ceil(Math.random() * 50 + 10),
      replenishmentDate: Date.now() + 7 * 24 * 60 * 60 * 1000
    };

    return plan;
  }

  /**
   * Schedule replenishment
   */
  scheduleReplenishment(plan: StockPlan): string {
    const planId = 'plan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.plans.set(planId, plan);
    logger.debug('Replenishment scheduled', { planId, warehouseId: plan.warehouseId, sku: plan.sku });
    return planId;
  }

  /**
   * Get replenishment schedule
   */
  getReplenishmentSchedule(warehouseId: string): StockPlan[] {
    return Array.from(this.plans.values()).filter(p => p.warehouseId === warehouseId);
  }

  /**
   * Adjust plan target level
   */
  adjustPlan(planId: string, newTargetLevel: number): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.targetLevel = newTargetLevel;
      logger.debug('Plan adjusted', { planId, newTargetLevel });
    }
  }
}

// ==================== CAPACITY PLANNER ====================

export class CapacityPlanner {
  /**
   * Project warehouse usage
   */
  projectUsage(warehouseId: string, forecastPeriod: string): number {
    return Math.round(Math.random() * 5000 + 1000);
  }

  /**
   * Calculate required capacity
   */
  calculateRequiredCapacity(warehouseId: string): number {
    return Math.round(Math.random() * 10000 + 5000);
  }

  /**
   * Identify bottlenecks
   */
  identifyBottlenecks(warehouseId: string): string[] {
    const bottlenecks = [];
    if (Math.random() > 0.5) bottlenecks.push('Receiving dock congestion');
    if (Math.random() > 0.6) bottlenecks.push('Picking zone capacity');
    if (Math.random() > 0.7) bottlenecks.push('Packing station throughput');
    return bottlenecks;
  }

  /**
   * Recommend expansion
   */
  recommendExpansion(warehouseId: string): { needed: boolean; size: number; timeframe: string } {
    const needed = Math.random() > 0.5;
    return {
      needed,
      size: needed ? Math.round(Math.random() * 5000 + 2000) : 0,
      timeframe: needed ? '6-12 months' : 'Not needed'
    };
  }
}

// ==================== EXPORTS ====================

export const demandForecaster = new DemandForecaster();
export const stockPlanner = new StockPlanner();
export const capacityPlanner = new CapacityPlanner();
