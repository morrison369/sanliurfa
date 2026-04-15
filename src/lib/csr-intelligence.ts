/**
 * Phase 284: Corporate Social Responsibility Intelligence
 * CSR program tracking, community impact, volunteer analytics, ESG reporting
 */

import { logger } from './logger';

interface CSRProgramRecord {
  programId: string;
  programName: string;
  category: 'education' | 'environment' | 'health' | 'community' | 'arts_culture' | 'disaster_relief' | 'economic_empowerment';
  targetBeneficiaries: number;
  actualBeneficiaries: number;
  budget: number;
  spentToDate: number;
  budgetUtilizationPct: number;
  impactScore: number;           // 0-100
  sdgAlignment: number[];        // UN SDG goals 1-17
  partnerOrganizations: string[];
  status: 'planning' | 'active' | 'completed' | 'suspended';
  startDate: number;
  endDate?: number;
  createdAt: number;
}

interface VolunteerEngagementRecord {
  recordId: string;
  period: string;
  totalVolunteers: number;
  employeeVolunteers: number;
  totalHoursContributed: number;
  avgHoursPerVolunteer: number;
  participationRatePct: number;   // % of employees who volunteered
  skillsBasedVolunteering: number; // hours of professional skill contribution
  communityValueUSD: number;      // estimated value of volunteering
  volunteerSatisfactionScore: number;  // 0-100
  calculatedAt: number;
}

interface CommunityImpactRecord {
  impactId: string;
  programId: string;
  period: string;
  directBeneficiaries: number;
  indirectBeneficiaries: number;
  outcomesAchieved: string[];
  socialReturnOnInvestment: number;  // SROI: social value / cost
  changeInKPI: Record<string, number>;  // e.g., { literacy_rate: 12, employment: 8 }
  stakeholderSatisfactionScore: number; // 0-100
  measuredAt: number;
}

interface CSRReportingRecord {
  reportId: string;
  reportingYear: string;
  framework: 'gri' | 'ungc' | 'iso26001' | 'b_corp' | 'integrated' | 'custom';
  totalCSRInvestment: number;
  csrAsRevenuePct: number;
  totalBeneficiaries: number;
  totalVolunteerHours: number;
  carbonReductionTonnes: number;
  wasteReductionTonnes: number;
  diversityScore: number;         // 0-100
  communityInvestmentROI: number;
  overallCSRScore: number;
  publishedAt?: number;
  createdAt: number;
}

class CSRProgramManager {
  private programs: Map<string, CSRProgramRecord> = new Map();
  private counter = 0;

  create(name: string, category: CSRProgramRecord['category'], budget: number, targetBeneficiaries: number, sdgGoals: number[], partners: string[]): CSRProgramRecord {
    const programId = `csr-${Date.now()}-${++this.counter}`;
    const program: CSRProgramRecord = {
      programId, programName: name, category, targetBeneficiaries,
      actualBeneficiaries: 0, budget, spentToDate: 0, budgetUtilizationPct: 0,
      impactScore: 0, sdgAlignment: sdgGoals, partnerOrganizations: partners,
      status: 'planning', startDate: Date.now(), createdAt: Date.now()
    };
    this.programs.set(programId, program);
    logger.debug('CSR program created', { programId, name, category });
    return program;
  }

  updateProgress(programId: string, actualBeneficiaries: number, spentToDate: number, impactScore: number): boolean {
    const program = this.programs.get(programId);
    if (!program) return false;
    program.actualBeneficiaries = actualBeneficiaries;
    program.spentToDate = spentToDate;
    program.budgetUtilizationPct = program.budget > 0 ? (spentToDate / program.budget) * 100 : 0;
    program.impactScore = Math.max(0, Math.min(100, impactScore));
    if (program.status === 'planning') program.status = 'active';
    return true;
  }

  getTotalBudget(): number {
    return Array.from(this.programs.values()).reduce((s, p) => s + p.budget, 0);
  }

  getBySDG(sdgGoal: number): CSRProgramRecord[] {
    return Array.from(this.programs.values()).filter(p => p.sdgAlignment.includes(sdgGoal));
  }

  getTopImpactPrograms(limit = 5): CSRProgramRecord[] {
    return Array.from(this.programs.values())
      .filter(p => p.status === 'active' || p.status === 'completed')
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }
}

class VolunteerEngagementTracker {
  private records: VolunteerEngagementRecord[] = [];
  private counter = 0;

  record(period: string, totalVolunteers: number, employeeVolunteers: number, totalHours: number, totalEmployees: number, skillsHours: number, volunteerHourlyValue: number, satisfactionScore: number): VolunteerEngagementRecord {
    const recordId = `volunt-${Date.now()}-${++this.counter}`;
    const record: VolunteerEngagementRecord = {
      recordId, period, totalVolunteers, employeeVolunteers, totalHoursContributed: totalHours,
      avgHoursPerVolunteer: totalVolunteers > 0 ? totalHours / totalVolunteers : 0,
      participationRatePct: totalEmployees > 0 ? (employeeVolunteers / totalEmployees) * 100 : 0,
      skillsBasedVolunteering: skillsHours,
      communityValueUSD: totalHours * volunteerHourlyValue,
      volunteerSatisfactionScore: Math.max(0, Math.min(100, satisfactionScore)),
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): VolunteerEngagementRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getTotalCommunityValue(): number {
    return this.records.reduce((s, r) => s + r.communityValueUSD, 0);
  }

  getParticipationTrend(): number[] {
    return this.records.map(r => r.participationRatePct);
  }
}

class CommunityImpactAnalyzer {
  private impacts: Map<string, CommunityImpactRecord[]> = new Map();
  private counter = 0;

  measure(programId: string, period: string, directBeneficiaries: number, indirectBeneficiaries: number, outcomes: string[], programCost: number, socialValue: number, kpiChanges: Record<string, number>, stakeholderScore: number): CommunityImpactRecord {
    const sroi = programCost > 0 ? socialValue / programCost : 0;
    const impactId = `impact-${Date.now()}-${++this.counter}`;
    const record: CommunityImpactRecord = {
      impactId, programId, period, directBeneficiaries, indirectBeneficiaries,
      outcomesAchieved: outcomes, socialReturnOnInvestment: sroi,
      changeInKPI: kpiChanges, stakeholderSatisfactionScore: Math.max(0, Math.min(100, stakeholderScore)),
      measuredAt: Date.now()
    };
    const existing = this.impacts.get(programId) || [];
    existing.push(record);
    this.impacts.set(programId, existing);
    return record;
  }

  getAvgSROI(): number {
    const all = Array.from(this.impacts.values()).flat();
    if (!all.length) return 0;
    return all.reduce((s, r) => s + r.socialReturnOnInvestment, 0) / all.length;
  }

  getTotalBeneficiaries(): number {
    return Array.from(this.impacts.values()).flat()
      .reduce((s, r) => s + r.directBeneficiaries + r.indirectBeneficiaries, 0);
  }

  getLatest(programId: string): CommunityImpactRecord | undefined {
    const history = this.impacts.get(programId) || [];
    return history[history.length - 1];
  }
}

class CSRReportingEngine {
  private reports: CSRReportingRecord[] = [];
  private counter = 0;

  generate(year: string, framework: CSRReportingRecord['framework'], totalInvestment: number, revenue: number, beneficiaries: number, volunteerHours: number, carbonReduction: number, wasteReduction: number, diversityScore: number, communityROI: number): CSRReportingRecord {
    const overallScore =
      Math.min(30, (totalInvestment / Math.max(revenue, 1)) * 3000) +
      Math.min(20, (beneficiaries / 10000) * 20) +
      Math.min(15, (volunteerHours / 10000) * 15) +
      Math.min(20, carbonReduction > 0 ? 20 : 0) +
      diversityScore * 0.15;

    const reportId = `csrrep-${Date.now()}-${++this.counter}`;
    const record: CSRReportingRecord = {
      reportId, reportingYear: year, framework, totalCSRInvestment: totalInvestment,
      csrAsRevenuePct: revenue > 0 ? (totalInvestment / revenue) * 100 : 0,
      totalBeneficiaries: beneficiaries, totalVolunteerHours: volunteerHours,
      carbonReductionTonnes: carbonReduction, wasteReductionTonnes: wasteReduction,
      diversityScore, communityInvestmentROI: communityROI,
      overallCSRScore: Math.max(0, Math.min(100, overallScore)), createdAt: Date.now()
    };
    this.reports.push(record);
    logger.debug('CSR report generated', { year, framework, overallScore: record.overallCSRScore });
    return record;
  }

  getLatest(): CSRReportingRecord | undefined {
    return this.reports[this.reports.length - 1];
  }

  getCSRScoreTrend(): number[] {
    return this.reports.map(r => r.overallCSRScore);
  }
}

export const csrProgramManager = new CSRProgramManager();
export const volunteerEngagementTracker = new VolunteerEngagementTracker();
export const communityImpactAnalyzer = new CommunityImpactAnalyzer();
export const csrReportingEngine = new CSRReportingEngine();

export { CSRProgramRecord, VolunteerEngagementRecord, CommunityImpactRecord, CSRReportingRecord };
