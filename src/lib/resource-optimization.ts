/**
 * Phase 229: Resource Optimization
 * Resource allocation, utilization tracking, cost optimization, allocation recommendations
 */

import { logger } from './logger';

interface Resource {
  resourceId: string;
  name: string;
  type: 'human' | 'compute' | 'infrastructure' | 'budget' | 'tooling';
  totalCapacity: number;
  unit: string;
  costPerUnit: number;
  available: number;
  tags: string[];
  createdAt: number;
}

interface ResourceAllocation {
  allocationId: string;
  resourceId: string;
  projectId: string;
  allocatedUnits: number;
  startAt: number;
  endAt: number;
  utilizationPct: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

interface UtilizationReport {
  reportId: string;
  resourceId: string;
  period: string;
  allocatedUnits: number;
  usedUnits: number;
  utilizationRate: number;  // used/allocated %
  idleUnits: number;
  cost: number;
  wastedCost: number;
  capturedAt: number;
}

interface OptimizationRecommendation {
  recommendationId: string;
  resourceId: string;
  type: 'reallocate' | 'scale_down' | 'consolidate' | 'upgrade' | 'retire';
  description: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;  // 1-10
  createdAt: number;
}

class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private counter = 0;

  add(name: string, type: Resource['type'], totalCapacity: number, unit: string, costPerUnit: number, tags: string[] = []): Resource {
    const resourceId = `res-${Date.now()}-${++this.counter}`;
    const resource: Resource = {
      resourceId, name, type, totalCapacity, unit, costPerUnit,
      available: totalCapacity, tags, createdAt: Date.now()
    };
    this.resources.set(resourceId, resource);
    logger.debug('Resource added', { resourceId, name, type, totalCapacity });
    return resource;
  }

  allocate(resourceId: string, units: number): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.available < units) return false;
    resource.available -= units;
    return true;
  }

  release(resourceId: string, units: number): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;
    resource.available = Math.min(resource.totalCapacity, resource.available + units);
    return true;
  }

  getByType(type: Resource['type']): Resource[] {
    return Array.from(this.resources.values()).filter(r => r.type === type);
  }

  getOverAllocated(): Resource[] {
    return Array.from(this.resources.values()).filter(r => r.available < 0);
  }

  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }
}

class AllocationTracker {
  private allocations: Map<string, ResourceAllocation[]> = new Map();
  private counter = 0;

  create(resourceId: string, projectId: string, units: number, startAt: number, endAt: number): ResourceAllocation {
    const allocationId = `alloc-${Date.now()}-${++this.counter}`;
    const allocation: ResourceAllocation = {
      allocationId, resourceId, projectId, allocatedUnits: units,
      startAt, endAt, utilizationPct: 0, status: 'planned', createdAt: Date.now()
    };
    const existing = this.allocations.get(resourceId) || [];
    existing.push(allocation);
    this.allocations.set(resourceId, existing);
    return allocation;
  }

  updateUtilization(allocationId: string, utilizationPct: number): boolean {
    for (const allocList of this.allocations.values()) {
      const alloc = allocList.find(a => a.allocationId === allocationId);
      if (alloc) { alloc.utilizationPct = Math.max(0, Math.min(100, utilizationPct)); return true; }
    }
    return false;
  }

  getActiveAllocations(resourceId: string): ResourceAllocation[] {
    return (this.allocations.get(resourceId) || []).filter(a => a.status === 'active');
  }

  getLowUtilization(threshold = 40): ResourceAllocation[] {
    return Array.from(this.allocations.values()).flat()
      .filter(a => a.status === 'active' && a.utilizationPct < threshold);
  }
}

class UtilizationReporter {
  private reports: Map<string, UtilizationReport[]> = new Map();
  private counter = 0;

  report(resourceId: string, period: string, allocatedUnits: number, usedUnits: number, costPerUnit: number): UtilizationReport {
    const utilizationRate = allocatedUnits > 0 ? (usedUnits / allocatedUnits) * 100 : 0;
    const idleUnits = allocatedUnits - usedUnits;
    const reportId = `utilrep-${Date.now()}-${++this.counter}`;
    const rec: UtilizationReport = {
      reportId, resourceId, period, allocatedUnits, usedUnits, utilizationRate,
      idleUnits, cost: allocatedUnits * costPerUnit, wastedCost: idleUnits * costPerUnit,
      capturedAt: Date.now()
    };
    const existing = this.reports.get(resourceId) || [];
    existing.push(rec);
    this.reports.set(resourceId, existing);
    return rec;
  }

  getTotalWastedCost(): number {
    return Array.from(this.reports.values())
      .map(h => h[h.length - 1])
      .filter((r): r is UtilizationReport => !!r)
      .reduce((s, r) => s + r.wastedCost, 0);
  }

  getLatest(resourceId: string): UtilizationReport | undefined {
    const history = this.reports.get(resourceId) || [];
    return history[history.length - 1];
  }
}

class OptimizationRecommender {
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private counter = 0;

  recommend(resourceId: string, type: OptimizationRecommendation['type'], description: string, estimatedSavings: number, effort: OptimizationRecommendation['effort']): OptimizationRecommendation {
    const effortWeight = { low: 10, medium: 6, high: 3 };
    const priority = Math.min(10, Math.ceil((estimatedSavings / 10000) * effortWeight[effort]));
    const recommendationId = `optirec-${Date.now()}-${++this.counter}`;
    const rec: OptimizationRecommendation = {
      recommendationId, resourceId, type, description, estimatedSavings,
      effort, priority, createdAt: Date.now()
    };
    this.recommendations.set(recommendationId, rec);
    logger.debug('Optimization recommendation created', { resourceId, type, estimatedSavings, priority });
    return rec;
  }

  getTopRecommendations(limit = 10): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.priority - a.priority || b.estimatedSavings - a.estimatedSavings)
      .slice(0, limit);
  }

  getTotalPotentialSavings(): number {
    return Array.from(this.recommendations.values()).reduce((s, r) => s + r.estimatedSavings, 0);
  }

  getByType(type: OptimizationRecommendation['type']): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.type === type);
  }
}

export const resourceManager = new ResourceManager();
export const allocationTracker = new AllocationTracker();
export const utilizationReporter = new UtilizationReporter();
export const optimizationRecommender = new OptimizationRecommender();

export { Resource, ResourceAllocation, UtilizationReport, OptimizationRecommendation };
