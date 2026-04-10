/**
 * Phase 54: Demand Planning & Forecasting
 * Demand forecasting, seasonal trend analysis, stock planning, capacity planning
 */

import { logger } from './logging';
import { deterministicId, hashString, normalize, round } from './deterministic';

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

export class DemandForecaster {
  private patterns = new Map<string, SeasonalPattern[]>();

  forecast(sku: string, periods: number): DemandForecast[] {
    const forecasts: DemandForecast[] = [];
    const skuHash = hashString(sku);
    const baseDemand = normalize(skuHash, 180, 1100);

    for (let i = 0; i < periods; i++) {
      const month = i % 12;
      const seasonalFactor = this.getSeasonalFactor(sku, month);
      const demandShift = normalize(hashString(`${sku}|period|${i}`), -60, 140);
      const predicted = Math.ceil(Math.max(0, (baseDemand + demandShift + i * 14) * seasonalFactor));
      const previous = i === 0 ? predicted : forecasts[i - 1].predicted;

      forecasts.push({
        sku,
        period: `month_${i + 1}`,
        predicted,
        confidence: round(Math.max(0.5, 0.9 - i * 0.035), 3),
        trend: predicted > previous ? 'up' : predicted < previous ? 'down' : 'stable'
      });
    }

    logger.debug('Demand forecast generated', { sku, periods });
    return forecasts;
  }

  getSeasonalFactors(sku: string): SeasonalPattern[] {
    return this.patterns.get(sku) || this.generateDefaultPatterns(sku);
  }

  detectTrend(sku: string, days: number): 'up' | 'down' | 'stable' {
    const window = this.forecast(sku, Math.max(2, Math.ceil(days / 30)));
    const first = window[0]?.predicted ?? 0;
    const last = window[window.length - 1]?.predicted ?? 0;
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'stable';
  }

  adjustForSeason(baseDemand: number, seasonFactor: number): number {
    return Math.ceil(baseDemand * seasonFactor);
  }

  private getSeasonalFactor(sku: string, month: number): number {
    const patterns = this.patterns.get(sku) || this.generateDefaultPatterns(sku);
    const pattern = patterns.find(p => p.month === month);
    return pattern?.indexFactor || 1.0;
  }

  private generateDefaultPatterns(sku: string): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];
    for (let month = 0; month < 12; month++) {
      patterns.push({
        sku,
        month,
        indexFactor: round(normalize(hashString(`${sku}|month|${month}`), 0.8, 1.2), 3)
      });
    }
    return patterns;
  }
}

export class StockPlanner {
  private plans = new Map<string, StockPlan>();
  private planCount = 0;

  planReplenishment(warehouseId: string, sku: string): StockPlan {
    const seed = `${warehouseId}|${sku}`;
    return {
      warehouseId,
      sku,
      targetLevel: Math.ceil(normalize(hashString(`${seed}|target`), 120, 600)),
      safetyStock: Math.ceil(normalize(hashString(`${seed}|safety`), 15, 90)),
      replenishmentDate: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }

  scheduleReplenishment(plan: StockPlan): string {
    const planId = deterministicId('plan', `${plan.warehouseId}|${plan.sku}|${plan.targetLevel}`, this.planCount++);
    this.plans.set(planId, plan);
    logger.debug('Replenishment scheduled', { planId, warehouseId: plan.warehouseId, sku: plan.sku });
    return planId;
  }

  getReplenishmentSchedule(warehouseId: string): StockPlan[] {
    return Array.from(this.plans.values()).filter(p => p.warehouseId === warehouseId);
  }

  adjustPlan(planId: string, newTargetLevel: number): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.targetLevel = newTargetLevel;
      logger.debug('Plan adjusted', { planId, newTargetLevel });
    }
  }
}

export class CapacityPlanner {
  projectUsage(warehouseId: string, forecastPeriod: string): number {
    return Math.round(normalize(hashString(`${warehouseId}|${forecastPeriod}|usage`), 1000, 6000));
  }

  calculateRequiredCapacity(warehouseId: string): number {
    return Math.round(normalize(hashString(`${warehouseId}|required-capacity`), 5000, 15000));
  }

  identifyBottlenecks(warehouseId: string): string[] {
    const candidates = [
      'Receiving dock congestion',
      'Picking zone capacity',
      'Packing station throughput'
    ];
    return candidates.filter((_, index) => ((hashString(`${warehouseId}|bottleneck|${index}`) + index) % 3) !== 0);
  }

  recommendExpansion(warehouseId: string): { needed: boolean; size: number; timeframe: string } {
    const requiredCapacity = this.calculateRequiredCapacity(warehouseId);
    const projectedUsage = this.projectUsage(warehouseId, '90d');
    const needed = projectedUsage / requiredCapacity > 0.72;

    return {
      needed,
      size: needed ? Math.round(requiredCapacity * 0.35) : 0,
      timeframe: needed ? '6-12 months' : 'Not needed'
    };
  }
}

export const demandForecaster = new DemandForecaster();
export const stockPlanner = new StockPlanner();
export const capacityPlanner = new CapacityPlanner();