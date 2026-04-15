/**
 * Phase 208: Talent Marketplace
 * Internal opportunity management, talent matching, mobility tracking, marketplace analytics
 */

import { logger } from './logger';

interface InternalOpportunity {
  opportunityId: string;
  title: string;
  department: string;
  type: 'full_time_transfer' | 'secondment' | 'project_rotation' | 'mentoring' | 'stretch_assignment';
  requiredSkills: string[];
  requiredLevel: string;
  duration?: number; // days, null for permanent
  postedBy: string;
  postedAt: number;
  expiresAt: number;
  applicants: string[];
  status: 'open' | 'closed' | 'filled';
  filledBy?: string;
}

interface TalentMatch {
  matchId: string;
  employeeId: string;
  opportunityId: string;
  matchScore: number; // 0-100
  skillMatchPct: number;
  levelMatch: boolean;
  mobilityScore: number;
  recommendedAt: number;
}

interface MobilityRecord {
  mobilityId: string;
  employeeId: string;
  fromDepartment: string;
  toDepartment: string;
  fromRole: string;
  toRole: string;
  type: 'lateral' | 'promotion' | 'downgrade' | 'rotation';
  movedAt: number;
  durationDays?: number;
  satisfactionScore?: number;
}

interface MarketplaceMetrics {
  period: string;
  totalOpportunities: number;
  filledOpportunities: number;
  fillRate: number;
  avgTimeToFillDays: number;
  internalFillRate: number;
  topSkillsInDemand: string[];
  mobilityRate: number;
  capturedAt: number;
}

class InternalOpportunityManager {
  private opportunities: Map<string, InternalOpportunity> = new Map();
  private counter = 0;

  post(title: string, department: string, type: InternalOpportunity['type'], requiredSkills: string[], requiredLevel: string, postedBy: string, durationDays?: number, expiryDays = 30): InternalOpportunity {
    const opportunityId = `opp-int-${Date.now()}-${++this.counter}`;
    const opportunity: InternalOpportunity = {
      opportunityId, title, department, type, requiredSkills, requiredLevel,
      duration: durationDays, postedBy, postedAt: Date.now(),
      expiresAt: Date.now() + expiryDays * 86400000,
      applicants: [], status: 'open'
    };
    this.opportunities.set(opportunityId, opportunity);
    logger.debug('Internal opportunity posted', { opportunityId, title, department, type });
    return opportunity;
  }

  apply(opportunityId: string, employeeId: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (opp && opp.status === 'open' && !opp.applicants.includes(employeeId)) {
      opp.applicants.push(employeeId);
      return true;
    }
    return false;
  }

  fill(opportunityId: string, employeeId: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (opp && opp.status === 'open') {
      opp.status = 'filled';
      opp.filledBy = employeeId;
      return true;
    }
    return false;
  }

  getOpenOpportunities(type?: InternalOpportunity['type']): InternalOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.status === 'open' && o.expiresAt > Date.now() && (!type || o.type === type));
  }

  getOpportunity(opportunityId: string): InternalOpportunity | undefined {
    return this.opportunities.get(opportunityId);
  }
}

class TalentMatchingEngine {
  private matches: Map<string, TalentMatch[]> = new Map();
  private counter = 0;

  match(employeeId: string, employeeSkills: string[], employeeLevel: string, mobilityWillingness: number, opportunities: InternalOpportunity[]): TalentMatch[] {
    const newMatches: TalentMatch[] = [];
    for (const opp of opportunities) {
      const matchingSkills = employeeSkills.filter(s => opp.requiredSkills.includes(s));
      const skillMatchPct = opp.requiredSkills.length > 0
        ? (matchingSkills.length / opp.requiredSkills.length) * 100 : 100;
      const levelMatch = employeeLevel === opp.requiredLevel;
      const levelBonus = levelMatch ? 20 : 0;
      const matchScore = Math.min(100, skillMatchPct * 0.6 + levelBonus + mobilityWillingness * 0.2);

      if (matchScore >= 40) {
        const matchId = `match-${Date.now()}-${++this.counter}`;
        const match: TalentMatch = {
          matchId, employeeId, opportunityId: opp.opportunityId,
          matchScore, skillMatchPct, levelMatch, mobilityScore: mobilityWillingness,
          recommendedAt: Date.now()
        };
        newMatches.push(match);
      }
    }
    const sorted = newMatches.sort((a, b) => b.matchScore - a.matchScore);
    this.matches.set(employeeId, sorted);
    return sorted;
  }

  getTopMatches(employeeId: string, limit = 5): TalentMatch[] {
    return (this.matches.get(employeeId) || []).slice(0, limit);
  }

  getBestCandidatesForOpportunity(opportunityId: string, limit = 5): TalentMatch[] {
    return Array.from(this.matches.values())
      .flat()
      .filter(m => m.opportunityId === opportunityId)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }
}

class MobilityTracker {
  private records: MobilityRecord[] = [];
  private counter = 0;

  record(employeeId: string, fromDept: string, toDept: string, fromRole: string, toRole: string, type: MobilityRecord['type']): MobilityRecord {
    const mobilityId = `mobility-${Date.now()}-${++this.counter}`;
    const record: MobilityRecord = {
      mobilityId, employeeId, fromDepartment: fromDept, toDepartment: toDept,
      fromRole, toRole, type, movedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Mobility recorded', { mobilityId, employeeId, type, fromDept, toDept });
    return record;
  }

  recordSatisfaction(mobilityId: string, score: number, durationDays?: number): boolean {
    const record = this.records.find(r => r.mobilityId === mobilityId);
    if (record) {
      record.satisfactionScore = Math.max(1, Math.min(5, score));
      if (durationDays) record.durationDays = durationDays;
      return true;
    }
    return false;
  }

  getMobilityRate(totalEmployees: number, periodDays = 365): number {
    const cutoff = Date.now() - periodDays * 86400000;
    const recent = this.records.filter(r => r.movedAt >= cutoff).length;
    return totalEmployees > 0 ? (recent / totalEmployees) * 100 : 0;
  }

  getAvgSatisfaction(): number {
    const rated = this.records.filter(r => r.satisfactionScore !== undefined);
    if (!rated.length) return 0;
    return rated.reduce((s, r) => s + (r.satisfactionScore || 0), 0) / rated.length;
  }

  getDepartmentMobility(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const r of this.records) {
      result[r.toDepartment] = (result[r.toDepartment] || 0) + 1;
    }
    return result;
  }
}

class SkillsMarketplaceAnalyzer {
  analyzeSupplyDemand(opportunities: InternalOpportunity[], employeeSkills: Map<string, string[]>): { skill: string; demand: number; supply: number; gap: number }[] {
    const demandMap = new Map<string, number>();
    const supplyMap = new Map<string, number>();

    for (const opp of opportunities) {
      for (const skill of opp.requiredSkills) {
        demandMap.set(skill, (demandMap.get(skill) || 0) + 1);
      }
    }
    for (const skills of employeeSkills.values()) {
      for (const skill of skills) {
        supplyMap.set(skill, (supplyMap.get(skill) || 0) + 1);
      }
    }
    const allSkills = new Set([...demandMap.keys(), ...supplyMap.keys()]);
    return Array.from(allSkills).map(skill => {
      const demand = demandMap.get(skill) || 0;
      const supply = supplyMap.get(skill) || 0;
      return { skill, demand, supply, gap: demand - supply };
    }).sort((a, b) => b.gap - a.gap);
  }

  getMetrics(opportunities: InternalOpportunity[], mobility: MobilityRecord[], totalEmployees: number): MarketplaceMetrics {
    const filled = opportunities.filter(o => o.status === 'filled');
    const fillRate = opportunities.length > 0 ? (filled.length / opportunities.length) * 100 : 0;
    const mobilityRate = totalEmployees > 0 ? (mobility.length / totalEmployees) * 100 : 0;

    const skillDemand = new Map<string, number>();
    for (const opp of opportunities) {
      for (const skill of opp.requiredSkills) {
        skillDemand.set(skill, (skillDemand.get(skill) || 0) + 1);
      }
    }
    const topSkillsInDemand = Array.from(skillDemand.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([skill]) => skill);

    return {
      period: new Date().toISOString().substring(0, 7),
      totalOpportunities: opportunities.length,
      filledOpportunities: filled.length,
      fillRate, avgTimeToFillDays: 30,
      internalFillRate: fillRate,
      topSkillsInDemand, mobilityRate, capturedAt: Date.now()
    };
  }
}

export const internalOpportunityManager = new InternalOpportunityManager();
export const talentMatchingEngine = new TalentMatchingEngine();
export const mobilityTracker = new MobilityTracker();
export const skillsMarketplaceAnalyzer = new SkillsMarketplaceAnalyzer();

export { InternalOpportunity, TalentMatch, MobilityRecord, MarketplaceMetrics };
