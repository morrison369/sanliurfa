/**
 * Phase 57: Supply Chain Analytics & Optimization
 * Supply chain metrics, supplier performance, cost optimization, bottleneck detection
 */

import { logger } from './logging';

function round(value: number, digits: number = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ==================== TYPES & INTERFACES ====================

export interface SupplyChainMetrics {
  period: string;
  leadTime: number;
  inventoryTurnover: number;
  fulfillmentRate: number;
  costPerUnit: number;
}

export interface SupplierMetrics {
  supplierId: string;
  onTimeDelivery: number;
  qualityScore: number;
  costCompetitiveness: number;
  reliability: number;
}

export interface OptimizationRecommendation {
  type: 'efficiency' | 'cost' | 'quality';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface BottleneckReport {
  location: string;
  severity: 'low' | 'medium' | 'high';
  affectedSKUs: number;
  delayDays: number;
}

// ==================== SUPPLY CHAIN METRICS ====================

export class SupplyChainMetrics {
  private metrics = new Map<string, SupplyChainMetrics>();

  /**
   * Record metric
   */
  recordMetric(metric: SupplyChainMetrics): void {
    this.metrics.set(metric.period, metric);
    logger.debug('Supply chain metric recorded', { period: metric.period });
  }

  /**
   * Get metrics for period
   */
  getMetrics(period: string): SupplyChainMetrics | null {
    return this.metrics.get(period) || null;
  }

  getLatestMetrics(): SupplyChainMetrics | null {
    const entries = Array.from(this.metrics.values());
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  getAllMetrics(): SupplyChainMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate average lead time
   */
  calculateLeadTime(sku: string): number {
    const metrics = this.getAllMetrics();
    if (metrics.length === 0) {
      return 0;
    }

    return round(metrics.reduce((sum, metric) => sum + metric.leadTime, 0) / metrics.length);
  }

  /**
   * Get inventory turnover
   */
  getInventoryTurnover(sku: string, period: string): number {
    const periodMetrics = this.getMetrics(period);
    if (periodMetrics) {
      return periodMetrics.inventoryTurnover;
    }

    const metrics = this.getAllMetrics();
    if (metrics.length === 0) {
      return 0;
    }

    return round(metrics.reduce((sum, metric) => sum + metric.inventoryTurnover, 0) / metrics.length);
  }

  /**
   * Get fulfillment rate
   */
  getFulfillmentRate(period: string): number {
    const periodMetrics = this.getMetrics(period);
    if (periodMetrics) {
      return periodMetrics.fulfillmentRate;
    }

    const metrics = this.getAllMetrics();
    if (metrics.length === 0) {
      return 0;
    }

    return round(metrics.reduce((sum, metric) => sum + metric.fulfillmentRate, 0) / metrics.length);
  }
}

// ==================== SUPPLIER ANALYTICS ====================

export class SupplierAnalytics {
  private supplierMetrics = new Map<string, SupplierMetrics>();

  /**
   * Record supplier metric
   */
  recordSupplierMetric(supplierId: string, metric: SupplierMetrics): void {
    this.supplierMetrics.set(supplierId, metric);
    logger.debug('Supplier metric recorded', { supplierId });
  }

  /**
   * Get supplier score
   */
  getSupplierScore(supplierId: string): number {
    const metric = this.supplierMetrics.get(supplierId);
    if (!metric) {
      return 0;
    }

    const score =
      metric.onTimeDelivery * 0.3 + metric.qualityScore * 0.3 + metric.costCompetitiveness * 0.2 + metric.reliability * 0.2;

    return Math.round(score);
  }

  /**
   * Compare suppliers for SKU
   */
  compareSuppliers(skuId: string): { supplierId: string; score: number }[] {
    return Array.from(this.supplierMetrics.entries())
      .map(([id, _]) => ({
        supplierId: id,
        score: this.getSupplierScore(id)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Identify risks
   */
  identifyRisks(supplierId: string): string[] {
    const metric = this.supplierMetrics.get(supplierId);
    if (!metric) return [];

    const risks = [];
    if (metric.onTimeDelivery < 90) risks.push('Delivery reliability risk');
    if (metric.qualityScore < 95) risks.push('Quality concerns');
    if (metric.reliability < 85) risks.push('Performance inconsistency');
    if (metric.costCompetitiveness < 70) risks.push('Cost competitiveness issues');

    return risks;
  }

  /**
   * Recommend alternatives
   */
  recommendAlternatives(supplierId: string): { supplierId: string; score: number }[] {
    return Array.from(this.supplierMetrics.entries())
      .filter(([id, _]) => id !== supplierId)
      .map(([id, _]) => ({
        supplierId: id,
        score: this.getSupplierScore(id)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
}

// ==================== OPTIMIZATION ENGINE ====================

export class OptimizationEngine {
  constructor(
    private metricsRegistry: SupplyChainMetrics,
    private supplierRegistry: SupplierAnalytics
  ) {}

  /**
   * Analyze costs
   */
  analyzeCosts(period: string): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = this.metricsRegistry.getMetrics(period) || this.metricsRegistry.getLatestMetrics();
    const supplierScores = this.supplierRegistry.compareSuppliers('all');
    const bestSupplierScore = supplierScores[0]?.score || 0;

    if (metrics && metrics.costPerUnit > 100) {
      recommendations.push({
        type: 'cost',
        description: 'Consolidate shipments to reduce carrier costs',
        impact: `${Math.max(5, Math.round(metrics.costPerUnit * 0.08))}% reduction`,
        effort: 'low'
      });
    }

    if (metrics && metrics.fulfillmentRate < 97) {
      recommendations.push({
        type: 'efficiency',
        description: 'Rebalance safety stock to recover fulfillment rate',
        impact: `${round(100 - metrics.fulfillmentRate)}% service improvement`,
        effort: 'medium'
      });
    }

    if (supplierScores.length > 0 && bestSupplierScore < 85) {
      recommendations.push({
        type: 'quality',
        description: 'Renegotiate supplier SLAs and introduce quality scorecards',
        impact: `${Math.max(5, 90 - bestSupplierScore)} point supplier uplift`,
        effort: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Detect bottlenecks
   */
  detectBottlenecks(warehouseId?: string): BottleneckReport[] {
    const reports: BottleneckReport[] = [];
    const metrics = this.metricsRegistry.getLatestMetrics();

    if (!metrics) {
      return reports;
    }

    if (metrics.leadTime > 10 || metrics.fulfillmentRate < 96) {
      reports.push({
        location: warehouseId || 'Main Warehouse',
        severity: metrics.leadTime > 14 || metrics.fulfillmentRate < 94 ? 'high' : 'medium',
        affectedSKUs: Math.max(5, Math.round(metrics.inventoryTurnover * 3)),
        delayDays: Math.max(1, Math.round(metrics.leadTime - 7))
      });
    }

    return reports;
  }

  /**
   * Optimize network design
   */
  optimizeNetworkDesign(): OptimizationRecommendation[] {
    return [
      {
        type: 'efficiency',
        description: 'Add regional fulfillment center',
        impact: '30% faster delivery',
        effort: 'high'
      },
      {
        type: 'cost',
        description: 'Close underutilized warehouse',
        impact: '20% overhead reduction',
        effort: 'high'
      }
    ];
  }

  /**
   * Simulate scenario
   */
  simulateScenario(changes: Record<string, any>): { costSavings: number; riskLevel: number } {
    const metrics = this.metricsRegistry.getLatestMetrics();
    const baselineCostPerUnit = metrics?.costPerUnit || 0;
    const leadTimeReductionDays = Number(changes.leadTimeReductionDays || 0);
    const inventoryReductionPercent = Number(changes.inventoryReductionPercent || 0);
    const fulfillmentImpactPercent = Number(changes.fulfillmentImpactPercent || 0);
    const supplierDiversification = Number(changes.supplierDiversification || 0);

    const costSavings = round(
      baselineCostPerUnit * Math.max(0, inventoryReductionPercent / 100) * 100 +
      Math.max(0, leadTimeReductionDays) * 500 +
      Math.max(0, supplierDiversification) * 250
    );

    const riskLevel = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          Math.max(0, inventoryReductionPercent - 20) * 1.5 +
          Math.max(0, -fulfillmentImpactPercent) * 4 +
          Math.max(0, (metrics?.leadTime || 0) - 10) * 2 -
          Math.max(0, supplierDiversification) * 3
        )
      )
    );

    return {
      costSavings,
      riskLevel
    };
  }

  /**
   * Get improvement priorities
   */
  getImprovementPriorities(): OptimizationRecommendation[] {
    return [
      {
        type: 'efficiency',
        description: 'Implement WMS (Warehouse Management System)',
        impact: '25% productivity increase',
        effort: 'high'
      },
      {
        type: 'quality',
        description: 'Establish quality control checkpoints',
        impact: '5% defect reduction',
        effort: 'medium'
      },
      {
        type: 'cost',
        description: 'Automate picking operations',
        impact: '15% cost reduction',
        effort: 'high'
      }
    ];
  }
}

// ==================== EXPORTS ====================

export const supplyChainMetrics = new SupplyChainMetrics();
export const supplierAnalytics = new SupplierAnalytics();
export const optimizationEngine = new OptimizationEngine(supplyChainMetrics, supplierAnalytics);
