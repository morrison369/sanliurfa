/**
 * Phase 172: ML Cost Optimization
 * Infrastructure cost tracking, model efficiency, compute optimization, cost reporting
 */

import { logger } from './logger';

interface MLCostRecord {
  costId: string;
  modelId: string;
  resourceType: 'training' | 'inference' | 'storage' | 'data-transfer';
  amount: number;
  currency: string;
  period: string;
  timestamp: number;
  metadata: Record<string, any>;
}

interface ModelEfficiencyMetric {
  modelId: string;
  inferenceTimeMs: number;
  modelSizeBytes: number;
  memoryUsageMb: number;
  throughputPerSecond: number;
  costPerInference: number;
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ComputeOptimizationPlan {
  planId: string;
  modelId: string;
  recommendations: string[];
  estimatedSavings: number;
  estimatedSavingsPct: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

class MLInfrastructureCostTracker {
  private costs: Map<string, MLCostRecord[]> = new Map();
  private counter = 0;

  recordCost(modelId: string, resourceType: 'training' | 'inference' | 'storage' | 'data-transfer', amount: number, currency: string, metadata?: Record<string, any>): MLCostRecord {
    const costId = `cost-${Date.now()}-${++this.counter}`;
    const period = new Date().toISOString().substring(0, 7); // YYYY-MM

    const cost: MLCostRecord = {
      costId,
      modelId,
      resourceType,
      amount,
      currency,
      period,
      timestamp: Date.now(),
      metadata: metadata || {}
    };

    const existing = this.costs.get(modelId) || [];
    existing.push(cost);
    this.costs.set(modelId, existing);

    logger.debug('ML cost recorded', { costId, modelId, resourceType, amount, currency });

    return cost;
  }

  getModelCosts(modelId: string, period?: string): MLCostRecord[] {
    const costs = this.costs.get(modelId) || [];
    return period ? costs.filter(c => c.period === period) : costs;
  }

  getTotalCost(modelId: string, period?: string): { amount: number; currency: string } {
    const costs = this.getModelCosts(modelId, period);
    const amount = costs.reduce((sum, c) => sum + c.amount, 0);
    return { amount, currency: costs[0]?.currency || 'USD' };
  }

  getCostByResourceType(modelId: string): Record<string, number> {
    const costs = this.getModelCosts(modelId);
    const breakdown: Record<string, number> = {};

    for (const cost of costs) {
      breakdown[cost.resourceType] = (breakdown[cost.resourceType] || 0) + cost.amount;
    }

    return breakdown;
  }

  getMostExpensiveModels(limit: number): Array<{ modelId: string; totalCost: number }> {
    const modelTotals: Record<string, number> = {};

    for (const [modelId, costs] of this.costs) {
      modelTotals[modelId] = costs.reduce((sum, c) => sum + c.amount, 0);
    }

    return Object.entries(modelTotals)
      .map(([modelId, totalCost]) => ({ modelId, totalCost }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }
}

class ModelEfficiencyAnalyzer {
  private metrics: Map<string, ModelEfficiencyMetric> = new Map();

  analyzeEfficiency(modelId: string, inferenceTimeMs: number, modelSizeBytes: number, memoryUsageMb: number, throughputPerSecond: number, costPerInference: number): ModelEfficiencyMetric {
    // Calculate efficiency score based on multiple factors
    const timeScore = inferenceTimeMs < 10 ? 100 : inferenceTimeMs < 50 ? 80 : inferenceTimeMs < 200 ? 60 : 40;
    const sizeScore = modelSizeBytes < 10 * 1024 * 1024 ? 100 : modelSizeBytes < 100 * 1024 * 1024 ? 80 : 60; // 10MB, 100MB
    const throughputScore = throughputPerSecond > 1000 ? 100 : throughputPerSecond > 100 ? 80 : throughputPerSecond > 10 ? 60 : 40;

    const overallScore = (timeScore + sizeScore + throughputScore) / 3;
    const efficiency = overallScore >= 85 ? 'excellent' : overallScore >= 70 ? 'good' : overallScore >= 55 ? 'fair' : 'poor';

    const metric: ModelEfficiencyMetric = {
      modelId,
      inferenceTimeMs,
      modelSizeBytes,
      memoryUsageMb,
      throughputPerSecond,
      costPerInference,
      efficiency
    };

    this.metrics.set(modelId, metric);

    logger.debug('Model efficiency analyzed', {
      modelId,
      efficiency,
      inferenceTimeMs,
      throughputPerSecond
    });

    return metric;
  }

  compareEfficiency(modelIds: string[]): Array<ModelEfficiencyMetric & { rank: number }> {
    const metrics = modelIds
      .map(id => this.metrics.get(id))
      .filter(Boolean) as ModelEfficiencyMetric[];

    return metrics
      .sort((a, b) => a.inferenceTimeMs - b.inferenceTimeMs)
      .map((m, idx) => ({ ...m, rank: idx + 1 }));
  }

  getInefficientModels(): ModelEfficiencyMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.efficiency === 'poor' || m.efficiency === 'fair');
  }

  getMetrics(modelId: string): ModelEfficiencyMetric | undefined {
    return this.metrics.get(modelId);
  }
}

class ComputeResourceOptimizer {
  private plans: Map<string, ComputeOptimizationPlan> = new Map();
  private counter = 0;

  createOptimizationPlan(modelId: string, currentMetrics: ModelEfficiencyMetric, currentCostPerMonth: number): ComputeOptimizationPlan {
    const planId = `opt-plan-${Date.now()}-${++this.counter}`;
    const recommendations: string[] = [];
    let estimatedSavingsPct = 0;

    // Identify optimization opportunities
    if (currentMetrics.inferenceTimeMs > 100) {
      recommendations.push('Apply model quantization to reduce inference time');
      estimatedSavingsPct += 15;
    }

    if (currentMetrics.modelSizeBytes > 100 * 1024 * 1024) {
      recommendations.push('Apply model pruning to reduce model size');
      estimatedSavingsPct += 10;
    }

    if (currentMetrics.throughputPerSecond < 100) {
      recommendations.push('Enable batched inference for higher throughput');
      estimatedSavingsPct += 20;
    }

    if (currentMetrics.memoryUsageMb > 2048) {
      recommendations.push('Use model distillation to reduce memory footprint');
      estimatedSavingsPct += 10;
    }

    if (recommendations.length === 0) {
      recommendations.push('Model is well-optimized, consider auto-scaling');
      estimatedSavingsPct = 5;
    }

    const estimatedSavings = currentCostPerMonth * (estimatedSavingsPct / 100);
    const implementationEffort = recommendations.length > 2 ? 'high' : recommendations.length > 1 ? 'medium' : 'low';
    const priority = estimatedSavingsPct > 30 ? 'high' : estimatedSavingsPct > 15 ? 'medium' : 'low';

    const plan: ComputeOptimizationPlan = {
      planId,
      modelId,
      recommendations,
      estimatedSavings,
      estimatedSavingsPct,
      implementationEffort,
      priority
    };

    this.plans.set(planId, plan);

    logger.debug('Optimization plan created', {
      planId,
      modelId,
      recommendationCount: recommendations.length,
      estimatedSavingsPct
    });

    return plan;
  }

  getPlan(planId: string): ComputeOptimizationPlan | undefined {
    return this.plans.get(planId);
  }

  getHighPriorityPlans(): ComputeOptimizationPlan[] {
    return Array.from(this.plans.values()).filter(p => p.priority === 'high');
  }
}

class MLCostReporter {
  private counter = 0;

  generateCostReport(costs: MLCostRecord[], period: string): {
    reportId: string;
    period: string;
    totalCost: number;
    breakdown: Record<string, number>;
    topModels: Array<{ modelId: string; cost: number }>;
    generatedAt: number;
  } {
    const reportId = `cost-report-${Date.now()}-${++this.counter}`;

    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);

    const breakdown: Record<string, number> = {};
    for (const cost of costs) {
      breakdown[cost.resourceType] = (breakdown[cost.resourceType] || 0) + cost.amount;
    }

    const modelCosts: Record<string, number> = {};
    for (const cost of costs) {
      modelCosts[cost.modelId] = (modelCosts[cost.modelId] || 0) + cost.amount;
    }

    const topModels = Object.entries(modelCosts)
      .map(([modelId, cost]) => ({ modelId, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    logger.debug('ML cost report generated', { reportId, period, totalCost, modelCount: topModels.length });

    return {
      reportId,
      period,
      totalCost,
      breakdown,
      topModels,
      generatedAt: Date.now()
    };
  }

  forecastCosts(historicalCosts: number[], forecastPeriods: number): { forecast: number[]; trend: 'increasing' | 'decreasing' | 'stable' } {
    if (historicalCosts.length < 2) {
      return { forecast: new Array(forecastPeriods).fill(historicalCosts[0] || 0), trend: 'stable' };
    }

    const avgChange = (historicalCosts[historicalCosts.length - 1] - historicalCosts[0]) / (historicalCosts.length - 1);
    const lastValue = historicalCosts[historicalCosts.length - 1];

    const forecast = Array.from({ length: forecastPeriods }, (_, i) => Math.max(0, lastValue + avgChange * (i + 1)));
    const trend = avgChange > 5 ? 'increasing' : avgChange < -5 ? 'decreasing' : 'stable';

    return { forecast, trend };
  }

  generateCostAlerts(costs: MLCostRecord[], budgets: Record<string, number>): Array<{ modelId: string; actualCost: number; budget: number; exceeded: boolean }> {
    const modelCosts: Record<string, number> = {};

    for (const cost of costs) {
      modelCosts[cost.modelId] = (modelCosts[cost.modelId] || 0) + cost.amount;
    }

    return Object.entries(budgets).map(([modelId, budget]) => ({
      modelId,
      actualCost: modelCosts[modelId] || 0,
      budget,
      exceeded: (modelCosts[modelId] || 0) > budget
    }));
  }
}

export const mlInfrastructureCostTracker = new MLInfrastructureCostTracker();
export const modelEfficiencyAnalyzer = new ModelEfficiencyAnalyzer();
export const computeResourceOptimizer = new ComputeResourceOptimizer();
export const mlCostReporter = new MLCostReporter();

export { MLCostRecord, ModelEfficiencyMetric, ComputeOptimizationPlan };
