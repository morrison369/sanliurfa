/**
 * Phase 319: Project Portfolio Intelligence
 * Portfolio management, resource allocation, risk tracking, delivery analytics
 */

import { logger } from './logger';

interface ProjectRecord {
  projectId: string;
  projectName: string;
  portfolioId: string;
  category: 'strategic' | 'operational' | 'compliance' | 'innovation' | 'maintenance';
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  budgetUSD: number;
  spendUSD: number;
  budgetVariancePct: number;
  plannedStartDate: number;
  plannedEndDate: number;
  actualStartDate?: number;
  actualEndDate?: number;
  scheduleVarianceDays: number;
  completionPct: number;
  ragStatus: 'green' | 'amber' | 'red';
  teamSize: number;
  projectManagerId: string;
  businessValueScore: number;     // 1-100
  strategicAlignmentScore: number;
  riskScore: number;              // calculated
  roi: number;                    // expected ROI %
  createdAt: number;
}

interface PortfolioRecord {
  portfolioId: string;
  portfolioName: string;
  owner: string;
  totalBudgetUSD: number;
  totalSpendUSD: number;
  projectCount: number;
  activeProjectCount: number;
  onTrackCount: number;
  atRiskCount: number;
  criticalCount: number;
  avgCompletionPct: number;
  expectedValueUSD: number;
  deliveredValueUSD: number;
  portfolioHealthScore: number;   // 0-100
  updatedAt: number;
  createdAt: number;
}

interface ResourceAllocationRecord {
  allocationId: string;
  resourceId: string;
  resourceName: string;
  resourceType: 'human' | 'budget' | 'infrastructure' | 'tooling';
  projectId: string;
  projectName: string;
  allocationPct: number;          // % of resource capacity
  allocationStartDate: number;
  allocationEndDate: number;
  plannedHours?: number;
  actualHours?: number;
  utilizationPct: number;
  isOverAllocated: boolean;       // utilization > 100%
  costUSD: number;
  createdAt: number;
}

interface DeliveryMetricsRecord {
  metricsId: string;
  period: string;
  totalProjects: number;
  completedOnTime: number;
  completedLate: number;
  cancelledCount: number;
  onTimePct: number;
  avgScheduleSlipDays: number;
  avgBudgetVariancePct: number;
  onBudgetPct: number;
  scopeChangeRate: number;        // % projects with scope changes
  avgTeamSize: number;
  velocityTrend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

class ProjectManager {
  private projects: Map<string, ProjectRecord> = new Map();
  private counter = 0;

  register(name: string, portfolioId: string, category: ProjectRecord['category'], priority: ProjectRecord['priority'], budget: number, plannedStart: number, plannedEnd: number, teamSize: number, pmId: string, businessValue: number, strategicAlignment: number, expectedRoi: number): ProjectRecord {
    const projectId = `proj-${Date.now()}-${++this.counter}`;
    const record: ProjectRecord = {
      projectId, projectName: name, portfolioId, category, priority,
      status: 'planning', budgetUSD: budget, spendUSD: 0, budgetVariancePct: 0,
      plannedStartDate: plannedStart, plannedEndDate: plannedEnd,
      scheduleVarianceDays: 0, completionPct: 0, ragStatus: 'green',
      teamSize, projectManagerId: pmId,
      businessValueScore: businessValue, strategicAlignmentScore: strategicAlignment,
      riskScore: 0, roi: expectedRoi, createdAt: Date.now()
    };
    this.projects.set(projectId, record);
    logger.debug('Project registered', { projectId, name, priority, budget });
    return record;
  }

  updateProgress(projectId: string, completionPct: number, spendUSD: number, scheduleVarianceDays: number): boolean {
    const proj = this.projects.get(projectId);
    if (!proj) return false;
    proj.completionPct = Math.min(100, Math.max(0, completionPct));
    proj.spendUSD = spendUSD;
    proj.budgetVariancePct = proj.budgetUSD > 0 ? Math.round(((spendUSD - proj.budgetUSD) / proj.budgetUSD) * 100 * 10) / 10 : 0;
    proj.scheduleVarianceDays = scheduleVarianceDays;
    if (proj.status === 'planning' && completionPct > 0) proj.status = 'active';
    if (completionPct >= 100) { proj.status = 'completed'; proj.actualEndDate = Date.now(); }
    // RAG: red if >10% over budget or >14 days late; amber if >5% or >7 days
    const budgetBreached = proj.budgetVariancePct > 10 || (proj.budgetVariancePct > 5);
    const scheduleBreached = scheduleVarianceDays > 14 || (scheduleVarianceDays > 7);
    proj.ragStatus = (proj.budgetVariancePct > 10 || scheduleVarianceDays > 14) ? 'red' :
                     (proj.budgetVariancePct > 5 || scheduleVarianceDays > 7) ? 'amber' : 'green';
    void budgetBreached; void scheduleBreached;
    return true;
  }

  calculateRiskScore(projectId: string, scheduleRisk: number, budgetRisk: number, resourceRisk: number, technicalRisk: number): boolean {
    const proj = this.projects.get(projectId);
    if (!proj) return false;
    proj.riskScore = Math.round(scheduleRisk * 0.3 + budgetRisk * 0.3 + resourceRisk * 0.2 + technicalRisk * 0.2);
    return true;
  }

  getAtRisk(): ProjectRecord[] {
    return Array.from(this.projects.values()).filter(p => p.ragStatus === 'red' || p.ragStatus === 'amber');
  }

  getByPortfolio(portfolioId: string): ProjectRecord[] {
    return Array.from(this.projects.values()).filter(p => p.portfolioId === portfolioId);
  }

  getAll(): ProjectRecord[] {
    return Array.from(this.projects.values());
  }
}

class PortfolioManager {
  private portfolios: Map<string, PortfolioRecord> = new Map();
  private counter = 0;

  register(name: string, owner: string, totalBudget: number): PortfolioRecord {
    const portfolioId = `port-${Date.now()}-${++this.counter}`;
    const record: PortfolioRecord = {
      portfolioId, portfolioName: name, owner, totalBudgetUSD: totalBudget,
      totalSpendUSD: 0, projectCount: 0, activeProjectCount: 0,
      onTrackCount: 0, atRiskCount: 0, criticalCount: 0,
      avgCompletionPct: 0, expectedValueUSD: 0, deliveredValueUSD: 0,
      portfolioHealthScore: 100, updatedAt: Date.now(), createdAt: Date.now()
    };
    this.portfolios.set(portfolioId, record);
    return record;
  }

  refresh(portfolioId: string, projects: ProjectRecord[]): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;
    const portProjects = projects.filter(p => p.portfolioId === portfolioId);
    portfolio.projectCount = portProjects.length;
    portfolio.activeProjectCount = portProjects.filter(p => p.status === 'active').length;
    portfolio.totalSpendUSD = portProjects.reduce((s, p) => s + p.spendUSD, 0);
    portfolio.onTrackCount = portProjects.filter(p => p.ragStatus === 'green').length;
    portfolio.atRiskCount = portProjects.filter(p => p.ragStatus === 'amber').length;
    portfolio.criticalCount = portProjects.filter(p => p.ragStatus === 'red').length;
    portfolio.avgCompletionPct = portProjects.length > 0 ? Math.round(portProjects.reduce((s, p) => s + p.completionPct, 0) / portProjects.length * 10) / 10 : 0;
    const total = portfolio.projectCount;
    portfolio.portfolioHealthScore = total > 0 ? Math.round(((portfolio.onTrackCount * 100 + portfolio.atRiskCount * 60 + portfolio.criticalCount * 20) / total) * 10) / 10 : 100;
    portfolio.updatedAt = Date.now();
    return true;
  }

  getAll(): PortfolioRecord[] {
    return Array.from(this.portfolios.values());
  }

  getPortfolio(id: string): PortfolioRecord | undefined {
    return this.portfolios.get(id);
  }
}

class ResourceAllocationManager {
  private allocations: ResourceAllocationRecord[] = [];
  private counter = 0;

  allocate(resourceId: string, resourceName: string, resourceType: ResourceAllocationRecord['resourceType'], projectId: string, projectName: string, allocationPct: number, startDate: number, endDate: number, plannedHours?: number, costPerHour?: number): ResourceAllocationRecord {
    const allocationId = `alloc-${Date.now()}-${++this.counter}`;
    const utilizationPct = allocationPct;
    const cost = plannedHours && costPerHour ? plannedHours * costPerHour : allocationPct * 100;
    const record: ResourceAllocationRecord = {
      allocationId, resourceId, resourceName, resourceType, projectId, projectName,
      allocationPct, allocationStartDate: startDate, allocationEndDate: endDate,
      plannedHours, utilizationPct, isOverAllocated: utilizationPct > 100,
      costUSD: Math.round(cost), createdAt: Date.now()
    };
    this.allocations.push(record);
    return record;
  }

  getOverAllocated(): ResourceAllocationRecord[] {
    return this.allocations.filter(a => a.isOverAllocated);
  }

  getByResource(resourceId: string): ResourceAllocationRecord[] {
    return this.allocations.filter(a => a.resourceId === resourceId);
  }

  getTotalAllocationByResource(resourceId: string): number {
    return this.allocations
      .filter(a => a.resourceId === resourceId)
      .reduce((s, a) => s + a.allocationPct, 0);
  }
}

class DeliveryMetricsAnalyzer {
  private records: DeliveryMetricsRecord[] = [];
  private counter = 0;

  calculate(period: string, projects: ProjectRecord[]): DeliveryMetricsRecord {
    const completed = projects.filter(p => p.status === 'completed');
    const onTime = completed.filter(p => p.scheduleVarianceDays <= 0);
    const late = completed.filter(p => p.scheduleVarianceDays > 0);
    const cancelled = projects.filter(p => p.status === 'cancelled');

    const avgSlip = late.length > 0 ? Math.round(late.reduce((s, p) => s + p.scheduleVarianceDays, 0) / late.length * 10) / 10 : 0;
    const avgBudgetVariance = completed.length > 0 ? Math.round(completed.reduce((s, p) => s + p.budgetVariancePct, 0) / completed.length * 10) / 10 : 0;
    const onBudgetPct = completed.length > 0 ? Math.round((completed.filter(p => p.budgetVariancePct <= 5).length / completed.length) * 100 * 10) / 10 : 0;
    const onTimePct = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100 * 10) / 10 : 0;
    const avgTeamSize = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.teamSize, 0) / projects.length * 10) / 10 : 0;

    const prev = this.records[this.records.length - 1];
    const velocityTrend: DeliveryMetricsRecord['velocityTrend'] = prev
      ? (onTimePct > prev.onTimePct + 5 ? 'improving' : onTimePct < prev.onTimePct - 5 ? 'declining' : 'stable')
      : 'stable';

    const metricsId = `delvmet-${Date.now()}-${++this.counter}`;
    const record: DeliveryMetricsRecord = {
      metricsId, period, totalProjects: projects.length,
      completedOnTime: onTime.length, completedLate: late.length, cancelledCount: cancelled.length,
      onTimePct, avgScheduleSlipDays: avgSlip, avgBudgetVariancePct: avgBudgetVariance,
      onBudgetPct, scopeChangeRate: 0, avgTeamSize, velocityTrend, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Delivery metrics calculated', { period, onTimePct, avgBudgetVariance });
    return record;
  }

  getLatest(): DeliveryMetricsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getTrend(): DeliveryMetricsRecord[] {
    return [...this.records];
  }
}

export const projectManager = new ProjectManager();
export const portfolioManager = new PortfolioManager();
export const resourceAllocationManager = new ResourceAllocationManager();
export const deliveryMetricsAnalyzer = new DeliveryMetricsAnalyzer();

export { ProjectRecord, PortfolioRecord, ResourceAllocationRecord, DeliveryMetricsRecord };
