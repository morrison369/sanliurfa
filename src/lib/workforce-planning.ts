/**
 * Phase 204: Workforce Planning
 * Headcount planning, workforce forecasting, capacity analysis, hiring plan management
 */

import { logger } from './logger';

interface HeadcountPlan {
  planId: string;
  department: string;
  quarter: string;
  currentHeadcount: number;
  targetHeadcount: number;
  openRoles: number;
  attritionForecast: number;
  netChange: number;
  budgetAllocated: number;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  createdAt: number;
}

interface WorkforceForecast {
  forecastId: string;
  period: string;
  department: string;
  forecastedHeadcount: number;
  attritionRate: number;
  growthRate: number;
  hiringNeeds: number;
  confidenceScore: number;
  createdAt: number;
}

interface CapacitySnapshot {
  snapshotId: string;
  teamId: string;
  period: string;
  totalCapacityHours: number;
  allocatedHours: number;
  utilizationRate: number;
  overallocatedMembers: number;
  underutilizedMembers: number;
  capturedAt: number;
}

interface HiringPlan {
  hiringId: string;
  department: string;
  roleTitle: string;
  requiredBy: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedSalary: number;
  status: 'open' | 'sourcing' | 'interviewing' | 'offer' | 'filled' | 'cancelled';
  createdAt: number;
  filledAt?: number;
}

class HeadcountPlanner {
  private plans: Map<string, HeadcountPlan> = new Map();
  private counter = 0;

  create(department: string, quarter: string, currentHeadcount: number, targetHeadcount: number, attritionForecast: number, budgetAllocated: number): HeadcountPlan {
    const planId = `hcplan-${Date.now()}-${++this.counter}`;
    const openRoles = Math.max(0, targetHeadcount - currentHeadcount + attritionForecast);
    const plan: HeadcountPlan = {
      planId, department, quarter, currentHeadcount, targetHeadcount,
      openRoles, attritionForecast, netChange: targetHeadcount - currentHeadcount,
      budgetAllocated, status: 'draft', createdAt: Date.now()
    };
    this.plans.set(planId, plan);
    logger.debug('Headcount plan created', { planId, department, quarter, openRoles });
    return plan;
  }

  approve(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (plan && plan.status === 'draft') { plan.status = 'approved'; return true; }
    return false;
  }

  getByDepartment(department: string): HeadcountPlan[] {
    return Array.from(this.plans.values()).filter(p => p.department === department);
  }

  getTotalBudget(quarter: string): number {
    return Array.from(this.plans.values())
      .filter(p => p.quarter === quarter && p.status === 'approved')
      .reduce((s, p) => s + p.budgetAllocated, 0);
  }

  getTotalOpenRoles(quarter: string): number {
    return Array.from(this.plans.values())
      .filter(p => p.quarter === quarter)
      .reduce((s, p) => s + p.openRoles, 0);
  }
}

class WorkforceForecaster {
  private forecasts: Map<string, WorkforceForecast[]> = new Map();
  private counter = 0;

  forecast(department: string, period: string, currentHeadcount: number, historicalAttritionRate: number, growthRate: number): WorkforceForecast {
    const attritionLoss = Math.round(currentHeadcount * historicalAttritionRate);
    const growthAdditions = Math.round(currentHeadcount * growthRate);
    const forecastedHeadcount = currentHeadcount - attritionLoss + growthAdditions;
    const hiringNeeds = Math.max(0, attritionLoss + growthAdditions);
    const confidenceScore = Math.max(50, 100 - Math.abs(growthRate * 100) * 2);

    const forecastId = `wfforecast-${Date.now()}-${++this.counter}`;
    const forecastObj: WorkforceForecast = {
      forecastId, period, department, forecastedHeadcount,
      attritionRate: historicalAttritionRate, growthRate,
      hiringNeeds, confidenceScore, createdAt: Date.now()
    };
    const dept = this.forecasts.get(department) || [];
    dept.push(forecastObj);
    this.forecasts.set(department, dept);
    logger.debug('Workforce forecast created', { forecastId, department, period, forecastedHeadcount });
    return forecastObj;
  }

  getDepartmentForecasts(department: string): WorkforceForecast[] {
    return this.forecasts.get(department) || [];
  }

  getOrgHiringNeeds(period: string): number {
    return Array.from(this.forecasts.values())
      .flat()
      .filter(f => f.period === period)
      .reduce((s, f) => s + f.hiringNeeds, 0);
  }

  getHighGrowthDepartments(threshold = 0.15): WorkforceForecast[] {
    return Array.from(this.forecasts.values())
      .flat()
      .filter(f => f.growthRate >= threshold)
      .sort((a, b) => b.growthRate - a.growthRate);
  }
}

class CapacityAnalyzer {
  private snapshots: Map<string, CapacitySnapshot[]> = new Map();
  private counter = 0;

  capture(teamId: string, period: string, totalCapacityHours: number, allocatedHours: number, overallocated: number, underutilized: number): CapacitySnapshot {
    const snapshot: CapacitySnapshot = {
      snapshotId: `cap-${Date.now()}-${++this.counter}`,
      teamId, period, totalCapacityHours, allocatedHours,
      utilizationRate: totalCapacityHours > 0 ? (allocatedHours / totalCapacityHours) * 100 : 0,
      overallocatedMembers: overallocated, underutilizedMembers: underutilized,
      capturedAt: Date.now()
    };
    const team = this.snapshots.get(teamId) || [];
    team.push(snapshot);
    this.snapshots.set(teamId, team);
    logger.debug('Capacity captured', { teamId, period, utilizationRate: snapshot.utilizationRate.toFixed(1) });
    return snapshot;
  }

  getLatestSnapshot(teamId: string): CapacitySnapshot | undefined {
    const snapshots = this.snapshots.get(teamId) || [];
    return snapshots[snapshots.length - 1];
  }

  getOverallocatedTeams(threshold = 90): string[] {
    return Array.from(this.snapshots.entries())
      .filter(([, snaps]) => {
        const latest = snaps[snaps.length - 1];
        return latest && latest.utilizationRate >= threshold;
      })
      .map(([teamId]) => teamId);
  }

  getAvgUtilization(): number {
    const allLatest = Array.from(this.snapshots.values())
      .map(snaps => snaps[snaps.length - 1])
      .filter(Boolean) as CapacitySnapshot[];
    if (!allLatest.length) return 0;
    return allLatest.reduce((s, snap) => s + snap.utilizationRate, 0) / allLatest.length;
  }
}

class HiringPlanManager {
  private plans: Map<string, HiringPlan> = new Map();
  private counter = 0;

  addRole(department: string, roleTitle: string, requiredByDays: number, priority: HiringPlan['priority'], estimatedSalary: number): HiringPlan {
    const hiringId = `hire-${Date.now()}-${++this.counter}`;
    const plan: HiringPlan = {
      hiringId, department, roleTitle,
      requiredBy: Date.now() + requiredByDays * 86400000,
      priority, estimatedSalary, status: 'open', createdAt: Date.now()
    };
    this.plans.set(hiringId, plan);
    logger.debug('Hiring role added', { hiringId, department, roleTitle, priority });
    return plan;
  }

  advanceStatus(hiringId: string, status: HiringPlan['status']): boolean {
    const plan = this.plans.get(hiringId);
    if (plan) {
      plan.status = status;
      if (status === 'filled') plan.filledAt = Date.now();
      return true;
    }
    return false;
  }

  getOpenRoles(priority?: HiringPlan['priority']): HiringPlan[] {
    return Array.from(this.plans.values())
      .filter(p => p.status !== 'filled' && p.status !== 'cancelled' && (!priority || p.priority === priority));
  }

  getTimeToFill(department?: string): number {
    const filled = Array.from(this.plans.values())
      .filter(p => p.filledAt && (!department || p.department === department));
    if (!filled.length) return 0;
    return filled.reduce((s, p) => s + (p.filledAt! - p.createdAt), 0) / filled.length / 86400000;
  }

  getTotalHiringBudget(): number {
    return Array.from(this.plans.values())
      .filter(p => p.status !== 'cancelled')
      .reduce((s, p) => s + p.estimatedSalary, 0);
  }
}

export const headcountPlanner = new HeadcountPlanner();
export const workforceForecaster = new WorkforceForecaster();
export const capacityAnalyzer = new CapacityAnalyzer();
export const hiringPlanManager = new HiringPlanManager();

export { HeadcountPlan, WorkforceForecast, CapacitySnapshot, HiringPlan };
