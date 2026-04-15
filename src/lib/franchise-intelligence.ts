/**
 * Phase 291: Franchise Intelligence
 * Franchise performance, royalty analytics, compliance monitoring, expansion planning
 */

import { logger } from './logger';

interface FranchiseeRecord {
  franchiseeId: string;
  franchiseeName: string;
  ownerName: string;
  locationCount: number;
  territory: string;
  openingDate: number;
  contractEndDate: number;
  royaltyRatePct: number;
  marketingFundPct: number;
  status: 'active' | 'probation' | 'terminated' | 'pending_renewal';
  performanceTier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'at_risk';
  createdAt: number;
}

interface FranchiseePerformanceRecord {
  recordId: string;
  franchiseeId: string;
  period: string;
  grossRevenue: number;
  royaltiesPaid: number;
  marketingFundPaid: number;
  customerSatisfactionScore: number;   // 0-100
  standardsComplianceScore: number;    // 0-100
  operationalScore: number;            // 0-100
  trainingCompletionPct: number;
  performanceScore: number;
  rankAmongFranchisees?: number;
  calculatedAt: number;
}

interface FranchiseComplianceRecord {
  recordId: string;
  franchiseeId: string;
  auditDate: number;
  auditType: 'scheduled' | 'random' | 'complaint_triggered';
  totalCheckpoints: number;
  passedCheckpoints: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
  complianceScore: number;
  correctiveActionsRequired: string[];
  followUpDate: number;
  auditorName: string;
  status: 'pass' | 'conditional_pass' | 'fail';
}

interface FranchiseExpansionRecord {
  recordId: string;
  region: string;
  targetLocations: number;
  approvedApplications: number;
  openedLocations: number;
  pipelineLocations: number;
  avgOpeningCostUSD: number;
  avgBreakevenMonths: number;
  marketSaturationPct: number;
  expansionScore: number;   // 0-100 attractiveness
  period: string;
  calculatedAt: number;
}

class FranchiseeManager {
  private franchisees: Map<string, FranchiseeRecord> = new Map();
  private counter = 0;

  onboard(name: string, owner: string, territory: string, contractEndDate: number, royaltyRate: number, marketingRate: number): FranchiseeRecord {
    const franchiseeId = `franch-${Date.now()}-${++this.counter}`;
    const record: FranchiseeRecord = {
      franchiseeId, franchiseeName: name, ownerName: owner, locationCount: 1,
      territory, openingDate: Date.now(), contractEndDate, royaltyRatePct: royaltyRate,
      marketingFundPct: marketingRate, status: 'active', performanceTier: 'silver', createdAt: Date.now()
    };
    this.franchisees.set(franchiseeId, record);
    logger.debug('Franchisee onboarded', { franchiseeId, name, territory });
    return record;
  }

  updateTier(franchiseeId: string, score: number): boolean {
    const f = this.franchisees.get(franchiseeId);
    if (!f) return false;
    f.performanceTier =
      score >= 90 ? 'platinum' : score >= 75 ? 'gold' : score >= 60 ? 'silver' :
      score >= 45 ? 'bronze' : 'at_risk';
    if (f.performanceTier === 'at_risk') f.status = 'probation';
    return true;
  }

  getExpiringContracts(days = 180): FranchiseeRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.franchisees.values())
      .filter(f => f.status === 'active' && f.contractEndDate <= horizon)
      .sort((a, b) => a.contractEndDate - b.contractEndDate);
  }

  getByTier(tier: FranchiseeRecord['performanceTier']): FranchiseeRecord[] {
    return Array.from(this.franchisees.values()).filter(f => f.performanceTier === tier);
  }

  getFranchisee(id: string): FranchiseeRecord | undefined {
    return this.franchisees.get(id);
  }
}

class FranchiseePerformanceTracker {
  private records: Map<string, FranchiseePerformanceRecord[]> = new Map();
  private counter = 0;

  record(franchiseeId: string, period: string, revenue: number, royaltyRate: number, marketingRate: number, csat: number, standardsScore: number, opsScore: number, trainingPct: number): FranchiseePerformanceRecord {
    const royaltiesPaid = revenue * (royaltyRate / 100);
    const marketingPaid = revenue * (marketingRate / 100);
    const performanceScore = csat * 0.3 + standardsScore * 0.3 + opsScore * 0.25 + trainingPct * 0.15;

    const recordId = `franchperf-${Date.now()}-${++this.counter}`;
    const record: FranchiseePerformanceRecord = {
      recordId, franchiseeId, period, grossRevenue: revenue, royaltiesPaid, marketingFundPaid: marketingPaid,
      customerSatisfactionScore: csat, standardsComplianceScore: standardsScore, operationalScore: opsScore,
      trainingCompletionPct: trainingPct, performanceScore: Math.max(0, Math.min(100, performanceScore)),
      calculatedAt: Date.now()
    };
    const history = this.records.get(franchiseeId) || [];
    history.push(record);
    this.records.set(franchiseeId, history);
    return record;
  }

  getTotalRoyalties(period?: string): number {
    return Array.from(this.records.values()).flat()
      .filter(r => !period || r.period === period)
      .reduce((s, r) => s + r.royaltiesPaid, 0);
  }

  getTopFranchisees(limit = 5): FranchiseePerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is FranchiseePerformanceRecord => !!r)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getLatest(franchiseeId: string): FranchiseePerformanceRecord | undefined {
    const history = this.records.get(franchiseeId) || [];
    return history[history.length - 1];
  }
}

class FranchiseComplianceManager {
  private audits: FranchiseComplianceRecord[] = [];
  private counter = 0;

  audit(franchiseeId: string, type: FranchiseComplianceRecord['auditType'], totalChecks: number, passed: number, critical: number, major: number, minor: number, actions: string[], auditor: string): FranchiseComplianceRecord {
    const score = totalChecks > 0 ? (passed / totalChecks) * 100 : 0;
    const status: FranchiseComplianceRecord['status'] =
      critical > 0 ? 'fail' : major > 2 ? 'conditional_pass' : 'pass';

    const recordId = `francomp-${Date.now()}-${++this.counter}`;
    const record: FranchiseComplianceRecord = {
      recordId, franchiseeId, auditDate: Date.now(), auditType: type, totalCheckpoints: totalChecks,
      passedCheckpoints: passed, criticalViolations: critical, majorViolations: major,
      minorViolations: minor, complianceScore: score, correctiveActionsRequired: actions,
      followUpDate: Date.now() + 30 * 86400000, auditorName: auditor, status
    };
    this.audits.push(record);
    return record;
  }

  getFailedAudits(): FranchiseComplianceRecord[] {
    return this.audits.filter(a => a.status === 'fail');
  }

  getAvgComplianceScore(): number {
    if (!this.audits.length) return 0;
    return this.audits.reduce((s, a) => s + a.complianceScore, 0) / this.audits.length;
  }

  getAuditsByFranchisee(franchiseeId: string): FranchiseComplianceRecord[] {
    return this.audits.filter(a => a.franchiseeId === franchiseeId);
  }
}

class FranchiseExpansionPlanner {
  private records: FranchiseExpansionRecord[] = [];
  private counter = 0;

  plan(region: string, targetLocations: number, approved: number, opened: number, pipeline: number, avgOpeningCost: number, avgBreakeven: number, marketSaturation: number, period: string): FranchiseExpansionRecord {
    const expansionScore = Math.max(0, 100 - marketSaturation) * 0.4 +
      (opened / Math.max(1, targetLocations)) * 100 * 0.3 +
      (100 / Math.max(1, avgBreakeven)) * 0.3;

    const recordId = `franexp-${Date.now()}-${++this.counter}`;
    const record: FranchiseExpansionRecord = {
      recordId, region, targetLocations, approvedApplications: approved, openedLocations: opened,
      pipelineLocations: pipeline, avgOpeningCostUSD: avgOpeningCost, avgBreakevenMonths: avgBreakeven,
      marketSaturationPct: marketSaturation, expansionScore: Math.min(100, expansionScore), period,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopExpansionMarkets(limit = 5): FranchiseExpansionRecord[] {
    return [...this.records].sort((a, b) => b.expansionScore - a.expansionScore).slice(0, limit);
  }

  getTotalOpenedLocations(): number {
    return this.records.reduce((s, r) => s + r.openedLocations, 0);
  }
}

export const franchiseeManager = new FranchiseeManager();
export const franchiseePerformanceTracker = new FranchiseePerformanceTracker();
export const franchiseComplianceManager = new FranchiseComplianceManager();
export const franchiseExpansionPlanner = new FranchiseExpansionPlanner();

export { FranchiseeRecord, FranchiseePerformanceRecord, FranchiseComplianceRecord, FranchiseExpansionRecord };
