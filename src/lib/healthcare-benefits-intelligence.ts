/**
 * Phase 277: Healthcare & Benefits Intelligence
 * Benefits utilization, healthcare cost analytics, wellness program effectiveness, claims analytics
 */

import { logger } from './logger';

interface BenefitsPlanRecord {
  planId: string;
  planName: string;
  planType: 'health' | 'dental' | 'vision' | 'life' | 'disability' | '401k' | 'fsa' | 'hsa';
  annualPremiumPerEmployee: number;
  employerContributionPct: number;
  employeeContributionPct: number;
  enrolledCount: number;
  eligibleCount: number;
  enrollmentRatePct: number;
  deductibleAmount: number;
  outOfPocketMax: number;
  planYear: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: number;
}

interface HealthcareCostRecord {
  costId: string;
  period: string;
  totalPremiumCost: number;
  totalClaimsCost: number;
  totalAdminCost: number;
  employerCost: number;
  employeeCost: number;
  costPerEmployee: number;
  costPerClaim: number;
  medicalCostTrendPct: number;   // yoy change
  topDiagnosisCategories: string[];
  calculatedAt: number;
}

interface WellnessProgramRecord {
  programId: string;
  programName: string;
  programType: 'fitness' | 'mental_health' | 'nutrition' | 'smoking_cessation' | 'stress_management' | 'preventive_care';
  participantCount: number;
  eligibleCount: number;
  participationRatePct: number;
  avgEngagementScore: number;   // 0-100
  healthOutcomeImprovement: number;  // % improvement in tracked metrics
  costSavingsEstimated: number;
  roiPct: number;
  period: string;
  createdAt: number;
}

interface ClaimsAnalyticsRecord {
  recordId: string;
  period: string;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  pendingClaims: number;
  totalClaimsValue: number;
  avgClaimValue: number;
  denialRatePct: number;
  fraudIndicatorCount: number;
  highCostClaimantCount: number;   // top 1% cost drivers
  calculatedAt: number;
}

class BenefitsPlanManager {
  private plans: Map<string, BenefitsPlanRecord> = new Map();
  private counter = 0;

  create(planName: string, planType: BenefitsPlanRecord['planType'], annualPremium: number, employerPct: number, eligibleCount: number, planYear: string): BenefitsPlanRecord {
    const planId = `plan-${Date.now()}-${++this.counter}`;
    const plan: BenefitsPlanRecord = {
      planId, planName, planType, annualPremiumPerEmployee: annualPremium,
      employerContributionPct: employerPct, employeeContributionPct: 100 - employerPct,
      enrolledCount: 0, eligibleCount, enrollmentRatePct: 0,
      deductibleAmount: 0, outOfPocketMax: 0, planYear, status: 'active', createdAt: Date.now()
    };
    this.plans.set(planId, plan);
    logger.debug('Benefits plan created', { planId, planName, planType });
    return plan;
  }

  updateEnrollment(planId: string, enrolledCount: number): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    plan.enrolledCount = enrolledCount;
    plan.enrollmentRatePct = plan.eligibleCount > 0 ? (enrolledCount / plan.eligibleCount) * 100 : 0;
    return true;
  }

  getTotalAnnualCost(): number {
    return Array.from(this.plans.values())
      .filter(p => p.status === 'active')
      .reduce((s, p) => s + p.annualPremiumPerEmployee * p.enrolledCount, 0);
  }

  getLowEnrollmentPlans(threshold = 50): BenefitsPlanRecord[] {
    return Array.from(this.plans.values())
      .filter(p => p.status === 'active' && p.enrollmentRatePct < threshold);
  }

  getPlansByType(type: BenefitsPlanRecord['planType']): BenefitsPlanRecord[] {
    return Array.from(this.plans.values()).filter(p => p.planType === type);
  }
}

class HealthcareCostAnalyzer {
  private costs: HealthcareCostRecord[] = [];
  private counter = 0;

  analyze(period: string, totalPremium: number, totalClaims: number, totalAdmin: number, employerSharePct: number, claimsCount: number, medicalTrendPct: number, topDiagnoses: string[]): HealthcareCostRecord {
    const totalCost = totalPremium + totalAdmin;
    const employerCost = totalCost * (employerSharePct / 100);
    const employeeCost = totalCost - employerCost;

    const costId = `hccost-${Date.now()}-${++this.counter}`;
    const record: HealthcareCostRecord = {
      costId, period, totalPremiumCost: totalPremium, totalClaimsCost: totalClaims,
      totalAdminCost: totalAdmin, employerCost, employeeCost,
      costPerEmployee: claimsCount > 0 ? totalCost / claimsCount : 0,
      costPerClaim: claimsCount > 0 ? totalClaims / claimsCount : 0,
      medicalCostTrendPct: medicalTrendPct, topDiagnosisCategories: topDiagnoses,
      calculatedAt: Date.now()
    };
    this.costs.push(record);
    return record;
  }

  getLatest(): HealthcareCostRecord | undefined {
    return this.costs[this.costs.length - 1];
  }

  getCostTrend(): number[] {
    return this.costs.map(c => c.costPerEmployee);
  }

  getAvgMedicalTrend(): number {
    if (!this.costs.length) return 0;
    return this.costs.reduce((s, c) => s + c.medicalCostTrendPct, 0) / this.costs.length;
  }
}

class WellnessProgramTracker {
  private programs: Map<string, WellnessProgramRecord> = new Map();
  private counter = 0;

  create(programName: string, type: WellnessProgramRecord['programType'], eligibleCount: number, programCost: number, period: string): WellnessProgramRecord {
    const programId = `wellness-${Date.now()}-${++this.counter}`;
    const record: WellnessProgramRecord = {
      programId, programName, programType: type, participantCount: 0,
      eligibleCount, participationRatePct: 0, avgEngagementScore: 0,
      healthOutcomeImprovement: 0, costSavingsEstimated: 0, roiPct: 0, period, createdAt: Date.now()
    };
    this.programs.set(programId, record);
    return record;
  }

  updateOutcomes(programId: string, participants: number, engagementScore: number, outcomeImprovementPct: number, costSavings: number, programCost: number): boolean {
    const program = this.programs.get(programId);
    if (!program) return false;
    program.participantCount = participants;
    program.participationRatePct = program.eligibleCount > 0 ? (participants / program.eligibleCount) * 100 : 0;
    program.avgEngagementScore = engagementScore;
    program.healthOutcomeImprovement = outcomeImprovementPct;
    program.costSavingsEstimated = costSavings;
    program.roiPct = programCost > 0 ? ((costSavings - programCost) / programCost) * 100 : 0;
    return true;
  }

  getTopROIPrograms(limit = 3): WellnessProgramRecord[] {
    return Array.from(this.programs.values())
      .sort((a, b) => b.roiPct - a.roiPct)
      .slice(0, limit);
  }

  getTotalCostSavings(): number {
    return Array.from(this.programs.values()).reduce((s, p) => s + p.costSavingsEstimated, 0);
  }
}

class ClaimsAnalyticsEngine {
  private records: ClaimsAnalyticsRecord[] = [];
  private counter = 0;

  analyze(period: string, totalClaims: number, approved: number, denied: number, pending: number, totalValue: number, fraudIndicators: number, highCostClaimants: number): ClaimsAnalyticsRecord {
    const recordId = `claims-${Date.now()}-${++this.counter}`;
    const record: ClaimsAnalyticsRecord = {
      recordId, period, totalClaims, approvedClaims: approved, deniedClaims: denied,
      pendingClaims: pending, totalClaimsValue: totalValue,
      avgClaimValue: totalClaims > 0 ? totalValue / totalClaims : 0,
      denialRatePct: totalClaims > 0 ? (denied / totalClaims) * 100 : 0,
      fraudIndicatorCount: fraudIndicators, highCostClaimantCount: highCostClaimants,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Claims analytics recorded', { period, totalClaims, denialRatePct: record.denialRatePct });
    return record;
  }

  getLatest(): ClaimsAnalyticsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getAvgDenialRate(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + r.denialRatePct, 0) / this.records.length;
  }

  getFraudAlertPeriods(): ClaimsAnalyticsRecord[] {
    return this.records.filter(r => r.fraudIndicatorCount > 0);
  }
}

export const benefitsPlanManager = new BenefitsPlanManager();
export const healthcareCostAnalyzer = new HealthcareCostAnalyzer();
export const wellnessProgramTracker = new WellnessProgramTracker();
export const claimsAnalyticsEngine = new ClaimsAnalyticsEngine();

export { BenefitsPlanRecord, HealthcareCostRecord, WellnessProgramRecord, ClaimsAnalyticsRecord };
