/**
 * Phase 250: Infrastructure Cost Intelligence
 * FinOps, cloud cost allocation, waste detection, cost optimization, budget governance
 */

import { logger } from './logger';

interface CloudResourceCost {
  resourceId: string;
  resourceName: string;
  resourceType: 'compute' | 'storage' | 'network' | 'database' | 'ai_ml' | 'managed_service';
  provider: 'aws' | 'gcp' | 'azure' | 'on_prem' | 'other';
  team: string;
  environment: 'production' | 'staging' | 'development' | 'sandbox';
  dailyCost: number;
  monthlyCost: number;
  utilizationPct: number;
  tags: Record<string, string>;
  recordedAt: number;
}

interface CostAllocation {
  allocationId: string;
  period: string;
  team: string;
  totalCost: number;
  computeCost: number;
  storageCost: number;
  networkCost: number;
  databaseCost: number;
  budgetedCost: number;
  variancePct: number;       // (actual - budgeted) / budgeted × 100
  costPerRequest: number;
  calculatedAt: number;
}

interface WasteDetection {
  wasteId: string;
  resourceId: string;
  resourceName: string;
  wasteType: 'idle_compute' | 'oversized' | 'unused_storage' | 'orphaned' | 'rightsizing';
  estimatedWastePerMonth: number;
  utilizationPct: number;
  recommendedAction: string;
  potentialSavings: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: number;
}

interface CostOptimizationRecommendation {
  recommendationId: string;
  category: 'reserved_instances' | 'rightsizing' | 'spot_usage' | 'storage_tiering' | 'network_optimization' | 'license_optimization';
  title: string;
  description: string;
  estimatedAnnualSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  affectedResources: string[];
  status: 'open' | 'in_progress' | 'implemented' | 'dismissed';
  createdAt: number;
}

class CloudCostTracker {
  private costs: Map<string, CloudResourceCost[]> = new Map();  // keyed by team
  private counter = 0;

  record(resourceName: string, resourceType: CloudResourceCost['resourceType'], provider: CloudResourceCost['provider'], team: string, environment: CloudResourceCost['environment'], dailyCost: number, utilizationPct: number, tags: Record<string, string> = {}): CloudResourceCost {
    const resourceId = `resource-${Date.now()}-${++this.counter}`;
    const entry: CloudResourceCost = {
      resourceId, resourceName, resourceType, provider, team, environment,
      dailyCost, monthlyCost: dailyCost * 30, utilizationPct, tags, recordedAt: Date.now()
    };
    const existing = this.costs.get(team) || [];
    existing.push(entry);
    this.costs.set(team, existing);
    return entry;
  }

  getTotalMonthlyCost(): number {
    return Array.from(this.costs.values()).flat()
      .reduce((s, r) => s + r.monthlyCost, 0);
  }

  getCostByEnvironment(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const resources of this.costs.values()) {
      for (const r of resources) {
        result[r.environment] = (result[r.environment] || 0) + r.monthlyCost;
      }
    }
    return result;
  }

  getCostByTeam(team: string): number {
    return (this.costs.get(team) || []).reduce((s, r) => s + r.monthlyCost, 0);
  }

  getLowUtilization(threshold = 20): CloudResourceCost[] {
    return Array.from(this.costs.values()).flat()
      .filter(r => r.utilizationPct < threshold)
      .sort((a, b) => b.monthlyCost - a.monthlyCost);
  }

  getAllResources(): CloudResourceCost[] {
    return Array.from(this.costs.values()).flat();
  }
}

class CostAllocationEngine {
  private allocations: Map<string, CostAllocation[]> = new Map();  // keyed by team
  private counter = 0;

  allocate(period: string, team: string, computeCost: number, storageCost: number, networkCost: number, databaseCost: number, budgetedCost: number, requestCount: number): CostAllocation {
    const totalCost = computeCost + storageCost + networkCost + databaseCost;
    const variancePct = budgetedCost > 0 ? ((totalCost - budgetedCost) / budgetedCost) * 100 : 0;
    const costPerRequest = requestCount > 0 ? totalCost / requestCount : 0;

    const allocationId = `costalloc-${Date.now()}-${++this.counter}`;
    const allocation: CostAllocation = {
      allocationId, period, team, totalCost, computeCost, storageCost, networkCost, databaseCost,
      budgetedCost, variancePct, costPerRequest, calculatedAt: Date.now()
    };
    const existing = this.allocations.get(team) || [];
    existing.push(allocation);
    this.allocations.set(team, existing);
    logger.debug('Cost allocated', { team, period, totalCost, variancePct });
    return allocation;
  }

  getOverBudgetTeams(thresholdPct = 10): CostAllocation[] {
    return Array.from(this.allocations.values())
      .map(h => h[h.length - 1])
      .filter((a): a is CostAllocation => !!a && a.variancePct > thresholdPct)
      .sort((a, b) => b.variancePct - a.variancePct);
  }

  getLatest(team: string): CostAllocation | undefined {
    const history = this.allocations.get(team) || [];
    return history[history.length - 1];
  }

  getPeriodSummary(period: string): { totalCost: number; totalBudgeted: number; teamCount: number } {
    const periodAllocs = Array.from(this.allocations.values()).flat().filter(a => a.period === period);
    return {
      totalCost: periodAllocs.reduce((s, a) => s + a.totalCost, 0),
      totalBudgeted: periodAllocs.reduce((s, a) => s + a.budgetedCost, 0),
      teamCount: periodAllocs.length
    };
  }
}

class WasteDetector {
  private detections: Map<string, WasteDetection> = new Map();
  private counter = 0;

  detect(resourceId: string, resourceName: string, wasteType: WasteDetection['wasteType'], utilizationPct: number, monthlyCost: number, recommendedAction: string): WasteDetection {
    // Waste estimate: low utilization → higher waste proportion
    const wasteFraction = Math.max(0, (30 - utilizationPct) / 100);
    const estimatedWaste = monthlyCost * wasteFraction;
    const potentialSavings = estimatedWaste * 12;  // annualized

    const priority: WasteDetection['priority'] =
      potentialSavings > 50000 ? 'critical' :
      potentialSavings > 10000 ? 'high' :
      potentialSavings > 2000 ? 'medium' : 'low';

    const wasteId = `waste-${Date.now()}-${++this.counter}`;
    const detection: WasteDetection = {
      wasteId, resourceId, resourceName, wasteType, estimatedWastePerMonth: estimatedWaste,
      utilizationPct, recommendedAction, potentialSavings, priority, detectedAt: Date.now()
    };
    this.detections.set(wasteId, detection);
    return detection;
  }

  getTotalWastePerMonth(): number {
    return Array.from(this.detections.values()).reduce((s, w) => s + w.estimatedWastePerMonth, 0);
  }

  getByPriority(priority: WasteDetection['priority']): WasteDetection[] {
    return Array.from(this.detections.values()).filter(w => w.priority === priority);
  }

  getTopWaste(limit = 10): WasteDetection[] {
    return Array.from(this.detections.values())
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, limit);
  }
}

class CostOptimizationAdvisor {
  private recommendations: Map<string, CostOptimizationRecommendation> = new Map();
  private counter = 0;

  recommend(category: CostOptimizationRecommendation['category'], title: string, description: string, annualSavings: number, effort: CostOptimizationRecommendation['implementationEffort'], riskLevel: CostOptimizationRecommendation['riskLevel'], affectedResources: string[]): CostOptimizationRecommendation {
    const recommendationId = `costrec-${Date.now()}-${++this.counter}`;
    const rec: CostOptimizationRecommendation = {
      recommendationId, category, title, description, estimatedAnnualSavings: annualSavings,
      implementationEffort: effort, riskLevel, affectedResources, status: 'open', createdAt: Date.now()
    };
    this.recommendations.set(recommendationId, rec);
    logger.debug('Cost optimization recommendation created', { recommendationId, category, annualSavings });
    return rec;
  }

  implement(recommendationId: string): boolean {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return false;
    rec.status = 'implemented';
    return true;
  }

  getTotalPotentialSavings(): number {
    return Array.from(this.recommendations.values())
      .filter(r => r.status === 'open' || r.status === 'in_progress')
      .reduce((s, r) => s + r.estimatedAnnualSavings, 0);
  }

  getQuickWins(): CostOptimizationRecommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.implementationEffort === 'low' && r.riskLevel === 'low' && r.status === 'open')
      .sort((a, b) => b.estimatedAnnualSavings - a.estimatedAnnualSavings);
  }

  getByCategory(category: CostOptimizationRecommendation['category']): CostOptimizationRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.category === category);
  }
}

export const cloudCostTracker = new CloudCostTracker();
export const costAllocationEngine = new CostAllocationEngine();
export const wasteDetector = new WasteDetector();
export const costOptimizationAdvisor = new CostOptimizationAdvisor();

export { CloudResourceCost, CostAllocation, WasteDetection, CostOptimizationRecommendation };
