/**
 * Phase 326: Workforce Capacity Intelligence
 * Headcount planning, skills matching, workload balancing, capacity forecasting
 */

import { logger } from './logger';

interface WorkforceCapacityRecord {
  capacityId: string;
  departmentId: string;
  departmentName: string;
  period: string;
  headcount: number;
  availableCapacityHours: number;
  allocatedHours: number;
  utilizationPct: number;
  overCapacityHours: number;
  underCapacityHours: number;
  vacancyCount: number;
  contractorCount: number;
  attritionRisk: number;          // % of headcount at flight risk
  capacityStatus: 'surplus' | 'optimal' | 'constrained' | 'critical';
  updatedAt: number;
  createdAt: number;
}

interface SkillsMatrixRecord {
  matrixId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  skills: { skill: string; proficiencyLevel: 1 | 2 | 3 | 4 | 5; certified: boolean; lastAssessedAt: number }[];
  roleRequirements: string[];
  skillGaps: string[];
  skillsSurplus: string[];
  overallMatchPct: number;
  criticalGaps: string[];
  learningRecommendations: string[];
  updatedAt: number;
}

interface HeadcountForecastRecord {
  forecastId: string;
  departmentId: string;
  departmentName: string;
  period: string;
  currentHeadcount: number;
  forecastedDemand: number;
  gap: number;                    // positive = need to hire, negative = surplus
  plannedHires: number;
  plannedAttrition: number;
  netHeadcountChange: number;
  hiringTimeDays: number;
  estimatedHiringCostUSD: number;
  skillsNeeded: string[];
  confidence: 'high' | 'medium' | 'low';
  generatedAt: number;
}

interface WorkloadBalanceRecord {
  balanceId: string;
  period: string;
  teamId: string;
  teamName: string;
  totalWorkItems: number;
  avgItemsPerPerson: number;
  maxLoadPerson: string;
  maxLoadItems: number;
  minLoadPerson: string;
  minLoadItems: number;
  varianceCoefficient: number;    // std_dev / mean — lower is more balanced
  overloadedCount: number;        // people with >120% average
  underloadedCount: number;       // people with <60% average
  balanceScore: number;           // 0-100 (100 = perfectly balanced)
  rebalancingRecommendations: string[];
  calculatedAt: number;
}

class WorkforceCapacityManager {
  private capacities: Map<string, WorkforceCapacityRecord> = new Map();
  private counter = 0;

  record(departmentId: string, departmentName: string, period: string, headcount: number, availableHours: number, allocatedHours: number, vacancies: number, contractors: number, attritionRiskPct: number): WorkforceCapacityRecord {
    const capacityId = `wfcap-${Date.now()}-${++this.counter}`;
    const utilizationPct = availableHours > 0 ? Math.round((allocatedHours / availableHours) * 100 * 10) / 10 : 0;
    const overCapacity = Math.max(0, allocatedHours - availableHours);
    const underCapacity = Math.max(0, availableHours - allocatedHours);
    const capacityStatus: WorkforceCapacityRecord['capacityStatus'] =
      utilizationPct > 110 ? 'critical' : utilizationPct > 90 ? 'constrained' : utilizationPct < 70 ? 'surplus' : 'optimal';

    const record: WorkforceCapacityRecord = {
      capacityId, departmentId, departmentName, period, headcount,
      availableCapacityHours: availableHours, allocatedHours, utilizationPct,
      overCapacityHours: overCapacity, underCapacityHours: underCapacity,
      vacancyCount: vacancies, contractorCount: contractors,
      attritionRisk: attritionRiskPct, capacityStatus,
      updatedAt: Date.now(), createdAt: Date.now()
    };
    this.capacities.set(departmentId, record);
    logger.debug('Workforce capacity recorded', { departmentId, utilizationPct, capacityStatus });
    return record;
  }

  getCritical(): WorkforceCapacityRecord[] {
    return Array.from(this.capacities.values()).filter(c => c.capacityStatus === 'critical');
  }

  getConstrained(): WorkforceCapacityRecord[] {
    return Array.from(this.capacities.values()).filter(c => c.capacityStatus === 'constrained');
  }

  getTotalHeadcount(): number {
    return Array.from(this.capacities.values()).reduce((s, c) => s + c.headcount, 0);
  }

  getAll(): WorkforceCapacityRecord[] {
    return Array.from(this.capacities.values());
  }
}

class SkillsMatrixManager {
  private matrices: Map<string, SkillsMatrixRecord> = new Map();
  private counter = 0;

  assess(employeeId: string, employeeName: string, department: string, skills: SkillsMatrixRecord['skills'], roleRequirements: string[]): SkillsMatrixRecord {
    const matrixId = `skillmat-${Date.now()}-${++this.counter}`;
    const employeeSkillNames = skills.map(s => s.skill);
    const skillGaps = roleRequirements.filter(r => !employeeSkillNames.includes(r));
    const skillsSurplus = employeeSkillNames.filter(s => !roleRequirements.includes(s));
    const matchedCount = roleRequirements.filter(r => employeeSkillNames.includes(r)).length;
    const overallMatch = roleRequirements.length > 0 ? Math.round((matchedCount / roleRequirements.length) * 100 * 10) / 10 : 100;

    // Critical gaps: required skills with no coverage
    const criticalGaps = skillGaps.slice(0, 3);
    const learningRecs = skillGaps.map(gap => `Complete ${gap} training/certification`);

    const record: SkillsMatrixRecord = {
      matrixId, employeeId, employeeName, department, skills, roleRequirements,
      skillGaps, skillsSurplus, overallMatchPct: overallMatch,
      criticalGaps, learningRecommendations: learningRecs, updatedAt: Date.now()
    };
    this.matrices.set(employeeId, record);
    return record;
  }

  getSkillGapsByDepartment(department: string): { skill: string; employeesLacking: number }[] {
    const deptMatrices = Array.from(this.matrices.values()).filter(m => m.department === department);
    const gapCounts = new Map<string, number>();
    deptMatrices.forEach(m => m.skillGaps.forEach(gap => gapCounts.set(gap, (gapCounts.get(gap) || 0) + 1)));
    return Array.from(gapCounts.entries()).map(([skill, count]) => ({ skill, employeesLacking: count })).sort((a, b) => b.employeesLacking - a.employeesLacking);
  }

  getLowMatch(threshold = 70): SkillsMatrixRecord[] {
    return Array.from(this.matrices.values()).filter(m => m.overallMatchPct < threshold);
  }

  getAll(): SkillsMatrixRecord[] {
    return Array.from(this.matrices.values());
  }
}

class HeadcountForecaster {
  private forecasts: HeadcountForecastRecord[] = [];
  private counter = 0;

  forecast(departmentId: string, departmentName: string, period: string, currentHeadcount: number, forecastedDemand: number, plannedHires: number, plannedAttrition: number, hiringTimeDays: number, costPerHireUSD: number, skillsNeeded: string[], confidence: HeadcountForecastRecord['confidence']): HeadcountForecastRecord {
    const forecastId = `hcforecast-${Date.now()}-${++this.counter}`;
    const gap = forecastedDemand - currentHeadcount;
    const netChange = plannedHires - plannedAttrition;
    const estimatedCost = Math.max(0, gap) * costPerHireUSD;

    const record: HeadcountForecastRecord = {
      forecastId, departmentId, departmentName, period,
      currentHeadcount, forecastedDemand, gap, plannedHires, plannedAttrition,
      netHeadcountChange: netChange, hiringTimeDays,
      estimatedHiringCostUSD: Math.round(estimatedCost),
      skillsNeeded, confidence, generatedAt: Date.now()
    };
    this.forecasts.push(record);
    logger.debug('Headcount forecast generated', { departmentId, gap, confidence });
    return record;
  }

  getHighGapDepartments(minGap = 5): HeadcountForecastRecord[] {
    return this.forecasts.filter(f => f.gap >= minGap).sort((a, b) => b.gap - a.gap);
  }

  getTotalEstimatedHiringCost(): number {
    return this.forecasts.reduce((s, f) => s + f.estimatedHiringCostUSD, 0);
  }
}

class WorkloadBalancer {
  private records: WorkloadBalanceRecord[] = [];
  private counter = 0;

  analyze(teamId: string, teamName: string, period: string, memberWorkloads: { memberId: string; memberName: string; workItems: number }[]): WorkloadBalanceRecord {
    const balanceId = `wlbal-${Date.now()}-${++this.counter}`;
    const n = memberWorkloads.length;
    const totalItems = memberWorkloads.reduce((s, m) => s + m.workItems, 0);
    const avg = n > 0 ? totalItems / n : 0;

    const sorted = [...memberWorkloads].sort((a, b) => b.workItems - a.workItems);
    const maxLoad = sorted[0];
    const minLoad = sorted[sorted.length - 1];

    const variance = n > 0 ? memberWorkloads.reduce((s, m) => s + Math.pow(m.workItems - avg, 2), 0) / n : 0;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? Math.round((stdDev / avg) * 100) / 100 : 0;

    const overloaded = memberWorkloads.filter(m => m.workItems > avg * 1.2).length;
    const underloaded = memberWorkloads.filter(m => m.workItems < avg * 0.6).length;
    const balanceScore = Math.max(0, Math.round(100 - cv * 50));

    const recs: string[] = [];
    if (overloaded > 0 && underloaded > 0) recs.push(`Redistribute ${Math.ceil((maxLoad.workItems - avg))} items from ${maxLoad.memberName} to ${minLoad.memberName}`);
    if (cv > 0.5) recs.push('High workload variance detected — review task assignment process');

    const record: WorkloadBalanceRecord = {
      balanceId, period, teamId, teamName, totalWorkItems: totalItems,
      avgItemsPerPerson: Math.round(avg * 10) / 10,
      maxLoadPerson: maxLoad?.memberName || '', maxLoadItems: maxLoad?.workItems || 0,
      minLoadPerson: minLoad?.memberName || '', minLoadItems: minLoad?.workItems || 0,
      varianceCoefficient: cv, overloadedCount: overloaded, underloadedCount: underloaded,
      balanceScore, rebalancingRecommendations: recs, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Workload balance analyzed', { teamId, balanceScore, overloaded, underloaded });
    return record;
  }

  getImbalancedTeams(threshold = 60): WorkloadBalanceRecord[] {
    return this.records.filter(r => r.balanceScore < threshold);
  }

  getLatest(teamId: string): WorkloadBalanceRecord | undefined {
    return [...this.records].filter(r => r.teamId === teamId).slice(-1)[0];
  }
}

export const workforceCapacityManager = new WorkforceCapacityManager();
export const skillsMatrixManager = new SkillsMatrixManager();
export const headcountForecaster = new HeadcountForecaster();
export const workloadBalancer = new WorkloadBalancer();

export { WorkforceCapacityRecord, SkillsMatrixRecord, HeadcountForecastRecord, WorkloadBalanceRecord };
