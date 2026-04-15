/**
 * Phase 302: Workforce Analytics Intelligence
 * Headcount planning, attrition analytics, productivity benchmarking, org health
 */

import { logger } from './logger';

interface HeadcountRecord {
  recordId: string;
  period: string;
  department: string;
  location: string;
  function: string;
  openingHeadcount: number;
  hires: number;
  terminations: number;
  transfers: number;
  closingHeadcount: number;
  plannedHeadcount: number;
  varianceVsPlan: number;
  fullTimeEquivalent: number;
  contractorCount: number;
  vacancyCount: number;
  vacancyRatePct: number;
  recordedAt: number;
}

interface AttritionRecord {
  recordId: string;
  period: string;
  department: string;
  openingHeadcount: number;
  totalTerminations: number;
  voluntaryTerminations: number;
  involuntaryTerminations: number;
  attritionRatePct: number;
  voluntaryAttritionRatePct: number;
  avgTenureAtExitYears: number;
  topExitReasons: { reason: string; count: number }[];
  replacementCostUSD: number;
  regrettableAttritionPct: number;   // % of leavers considered high performers
  calculatedAt: number;
}

interface ProductivityRecord {
  recordId: string;
  period: string;
  department: string;
  revenuePerEmployee: number;
  outputPerEmployee: number;
  laborCostRatioPct: number;         // labor cost / revenue
  overtimeHoursPerEmployee: number;
  absenteeismRatePct: number;
  trainingHoursPerEmployee: number;
  performanceRatingAvg: number;      // 1-5
  engagementScore: number;           // 0-100
  productivityIndex: number;         // composite 0-100
  calculatedAt: number;
}

interface OrgHealthRecord {
  recordId: string;
  period: string;
  managerSpanOfControl: number;      // avg direct reports per manager
  managementLayersCount: number;
  promotionRatePct: number;
  internalMobilityRatePct: number;
  diversityIndexScore: number;       // 0-100
  collaborationScore: number;        // 0-100
  psychologicalSafetyScore: number;  // 0-100
  burnoutRiskPct: number;            // % of employees flagged
  teamEffectivenessScore: number;
  overallOrgHealthScore: number;
  calculatedAt: number;
}

class HeadcountPlanner {
  private records: HeadcountRecord[] = [];
  private counter = 0;

  record(period: string, dept: string, location: string, fn: string, opening: number, hires: number, terms: number, transfers: number, planned: number, fte: number, contractors: number, vacancies: number): HeadcountRecord {
    const closing = opening + hires - terms + transfers;
    const variance = closing - planned;
    const vacancyRate = planned > 0 ? (vacancies / planned) * 100 : 0;

    const recordId = `hc-${Date.now()}-${++this.counter}`;
    const record: HeadcountRecord = {
      recordId, period, department: dept, location, function: fn,
      openingHeadcount: opening, hires, terminations: terms, transfers,
      closingHeadcount: closing, plannedHeadcount: planned,
      varianceVsPlan: variance, fullTimeEquivalent: fte, contractorCount: contractors,
      vacancyCount: vacancies, vacancyRatePct: Math.round(vacancyRate * 10) / 10,
      recordedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Headcount recorded', { dept, closing, planned, variance });
    return record;
  }

  getDepartmentsByVariance(threshold = 10): HeadcountRecord[] {
    return this.records
      .filter(r => Math.abs(r.varianceVsPlan) >= threshold)
      .sort((a, b) => Math.abs(b.varianceVsPlan) - Math.abs(a.varianceVsPlan));
  }

  getTotalHeadcount(period: string): number {
    return this.records.filter(r => r.period === period).reduce((s, r) => s + r.closingHeadcount, 0);
  }

  getHighVacancyDepts(threshold = 10): HeadcountRecord[] {
    return this.records.filter(r => r.vacancyRatePct >= threshold);
  }
}

class AttritionAnalyzer {
  private records: AttritionRecord[] = [];
  private counter = 0;

  analyze(period: string, dept: string, opening: number, totalTerms: number, voluntary: number, involuntary: number, avgTenure: number, exitReasons: { reason: string; count: number }[], replacementCostPerHead: number, regrettablePct: number): AttritionRecord {
    const attritionRate = opening > 0 ? (totalTerms / opening) * 100 : 0;
    const voluntaryRate = opening > 0 ? (voluntary / opening) * 100 : 0;

    const recordId = `attr-${Date.now()}-${++this.counter}`;
    const record: AttritionRecord = {
      recordId, period, department: dept, openingHeadcount: opening,
      totalTerminations: totalTerms, voluntaryTerminations: voluntary, involuntaryTerminations: involuntary,
      attritionRatePct: Math.round(attritionRate * 10) / 10,
      voluntaryAttritionRatePct: Math.round(voluntaryRate * 10) / 10,
      avgTenureAtExitYears: avgTenure,
      topExitReasons: exitReasons.sort((a, b) => b.count - a.count),
      replacementCostUSD: totalTerms * replacementCostPerHead,
      regrettableAttritionPct: regrettablePct, calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Attrition analyzed', { dept, attritionRate, replacementCost: record.replacementCostUSD });
    return record;
  }

  getHighAttritionDepts(threshold = 15): AttritionRecord[] {
    return this.records.filter(r => r.attritionRatePct >= threshold)
      .sort((a, b) => b.attritionRatePct - a.attritionRatePct);
  }

  getTotalReplacementCost(period: string): number {
    return this.records.filter(r => r.period === period).reduce((s, r) => s + r.replacementCostUSD, 0);
  }

  getAttritionTrend(): number[] {
    return this.records.map(r => r.attritionRatePct);
  }
}

class ProductivityBenchmarker {
  private records: ProductivityRecord[] = [];
  private counter = 0;

  benchmark(period: string, dept: string, revenuePerEmp: number, outputPerEmp: number, laborCostRatio: number, overtimeHours: number, absenteeism: number, trainingHours: number, performanceRating: number, engagement: number): ProductivityRecord {
    // Composite productivity: normalize each component
    const productivityIndex =
      Math.min(100, revenuePerEmp / 1000) * 0.25 +
      (100 - Math.min(100, laborCostRatio)) * 0.2 +
      (100 - Math.min(100, absenteeism * 10)) * 0.15 +
      performanceRating * 20 * 0.2 +
      engagement * 0.2;

    const recordId = `prod-${Date.now()}-${++this.counter}`;
    const record: ProductivityRecord = {
      recordId, period, department: dept, revenuePerEmployee: revenuePerEmp,
      outputPerEmployee: outputPerEmp, laborCostRatioPct: laborCostRatio,
      overtimeHoursPerEmployee: overtimeHours, absenteeismRatePct: absenteeism,
      trainingHoursPerEmployee: trainingHours, performanceRatingAvg: performanceRating,
      engagementScore: engagement, productivityIndex: Math.round(Math.max(0, Math.min(100, productivityIndex)) * 10) / 10,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopProductiveDepts(limit = 3): ProductivityRecord[] {
    return [...this.records].sort((a, b) => b.productivityIndex - a.productivityIndex).slice(0, limit);
  }

  getHighAbsenteeismDepts(threshold = 5): ProductivityRecord[] {
    return this.records.filter(r => r.absenteeismRatePct >= threshold);
  }

  getProductivityTrend(dept: string): number[] {
    return this.records.filter(r => r.department === dept).map(r => r.productivityIndex);
  }
}

class OrgHealthAnalyzer {
  private records: OrgHealthRecord[] = [];
  private counter = 0;

  assess(period: string, spanOfControl: number, layers: number, promotionRate: number, mobilityRate: number, diversityIndex: number, collaboration: number, psychSafety: number, burnoutRisk: number, teamEffectiveness: number): OrgHealthRecord {
    const overallHealth =
      diversityIndex * 0.15 + collaboration * 0.2 + psychSafety * 0.2 +
      (100 - burnoutRisk) * 0.2 + teamEffectiveness * 0.25;

    const recordId = `orghealth-${Date.now()}-${++this.counter}`;
    const record: OrgHealthRecord = {
      recordId, period, managerSpanOfControl: spanOfControl, managementLayersCount: layers,
      promotionRatePct: promotionRate, internalMobilityRatePct: mobilityRate,
      diversityIndexScore: diversityIndex, collaborationScore: collaboration,
      psychologicalSafetyScore: psychSafety, burnoutRiskPct: burnoutRisk,
      teamEffectivenessScore: teamEffectiveness,
      overallOrgHealthScore: Math.round(Math.max(0, Math.min(100, overallHealth)) * 10) / 10,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Org health assessed', { period, overallHealth: record.overallOrgHealthScore });
    return record;
  }

  getLatest(): OrgHealthRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getHealthTrend(): number[] {
    return this.records.map(r => r.overallOrgHealthScore);
  }
}

export const headcountPlanner = new HeadcountPlanner();
export const attritionAnalyzer = new AttritionAnalyzer();
export const productivityBenchmarker = new ProductivityBenchmarker();
export const orgHealthAnalyzer = new OrgHealthAnalyzer();

export { HeadcountRecord, AttritionRecord, ProductivityRecord, OrgHealthRecord };
