/**
 * Phase 289: Mergers & Acquisitions Intelligence
 * Deal pipeline, due diligence tracking, valuation analytics, integration monitoring
 */

import { logger } from './logger';

interface MADealRecord {
  dealId: string;
  targetName: string;
  dealType: 'acquisition' | 'merger' | 'joint_venture' | 'divestiture' | 'minority_stake';
  targetIndustry: string;
  targetRevenue: number;
  targetEBITDA: number;
  targetHeadcount: number;
  dealValueUSD: number;
  evToEBITDA: number;             // Enterprise Value multiple
  priceToRevenue: number;
  strategicRationale: string;
  stage: 'screening' | 'loi' | 'due_diligence' | 'negotiation' | 'signed' | 'closed' | 'terminated';
  probability: number;            // 0-100
  expectedCloseDate: number;
  actualCloseDate?: number;
  leadAdvisor?: string;
  status: 'active' | 'closed' | 'terminated';
  createdAt: number;
}

interface DueDiligenceRecord {
  ddId: string;
  dealId: string;
  workstream: 'financial' | 'legal' | 'commercial' | 'operational' | 'hr' | 'it' | 'environmental';
  assignedTeam: string;
  totalItems: number;
  completedItems: number;
  criticalIssuesFound: number;
  dealBreakerFound: boolean;
  riskRating: 'low' | 'medium' | 'high' | 'critical';
  completionPct: number;
  estimatedCompletionDate: number;
  findings: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: number;
}

interface ValuationRecord {
  valuationId: string;
  dealId: string;
  valuationMethod: 'dcf' | 'comparable_companies' | 'precedent_transactions' | 'asset_based' | 'sum_of_parts';
  enterpriseValue: number;
  equityValue: number;
  evToRevenue: number;
  evToEBITDA: number;
  impliedPERatio: number;
  premiumToBVPct: number;        // premium to book value
  synergyValueUSD: number;       // expected synergies NPV
  valuedAt: number;
}

interface IntegrationTrackingRecord {
  integrationId: string;
  dealId: string;
  period: string;
  day100Milestones: number;
  day100Achieved: number;
  synergyTargetUSD: number;
  synergyRealizedUSD: number;
  synergyRealizationPct: number;
  employeeRetentionRatePct: number;
  systemsMigratedPct: number;
  customerRetentionRatePct: number;
  integrationCostUSD: number;
  overallHealthScore: number;   // 0-100
  calculatedAt: number;
}

class MADealPipelineManager {
  private deals: Map<string, MADealRecord> = new Map();
  private counter = 0;

  create(targetName: string, type: MADealRecord['dealType'], industry: string, revenue: number, ebitda: number, headcount: number, dealValue: number, rationale: string, expectedClose: number): MADealRecord {
    const dealId = `madeal-${Date.now()}-${++this.counter}`;
    const deal: MADealRecord = {
      dealId, targetName, dealType: type, targetIndustry: industry, targetRevenue: revenue,
      targetEBITDA: ebitda, targetHeadcount: headcount, dealValueUSD: dealValue,
      evToEBITDA: ebitda > 0 ? dealValue / ebitda : 0,
      priceToRevenue: revenue > 0 ? dealValue / revenue : 0,
      strategicRationale: rationale, stage: 'screening', probability: 20,
      expectedCloseDate: expectedClose, status: 'active', createdAt: Date.now()
    };
    this.deals.set(dealId, deal);
    logger.debug('M&A deal created', { dealId, targetName, type, dealValue });
    return deal;
  }

  advance(dealId: string, stage: MADealRecord['stage'], probability: number): boolean {
    const deal = this.deals.get(dealId);
    if (!deal) return false;
    deal.stage = stage;
    deal.probability = probability;
    if (stage === 'closed') { deal.status = 'closed'; deal.actualCloseDate = Date.now(); }
    if (stage === 'terminated') deal.status = 'terminated';
    return true;
  }

  getPipelineValue(): number {
    return Array.from(this.deals.values())
      .filter(d => d.status === 'active')
      .reduce((s, d) => s + d.dealValueUSD * (d.probability / 100), 0);
  }

  getActiveDeals(): MADealRecord[] {
    return Array.from(this.deals.values()).filter(d => d.status === 'active')
      .sort((a, b) => b.probability - a.probability);
  }

  getDeal(dealId: string): MADealRecord | undefined {
    return this.deals.get(dealId);
  }
}

class DueDiligenceTracker {
  private workstreams: Map<string, DueDiligenceRecord[]> = new Map();
  private counter = 0;

  initiate(dealId: string, workstream: DueDiligenceRecord['workstream'], team: string, totalItems: number, estimatedCompletion: number): DueDiligenceRecord {
    const ddId = `dd-${Date.now()}-${++this.counter}`;
    const record: DueDiligenceRecord = {
      ddId, dealId, workstream, assignedTeam: team, totalItems, completedItems: 0,
      criticalIssuesFound: 0, dealBreakerFound: false, riskRating: 'low',
      completionPct: 0, estimatedCompletionDate: estimatedCompletion,
      findings: [], status: 'not_started', createdAt: Date.now()
    };
    const existing = this.workstreams.get(dealId) || [];
    existing.push(record);
    this.workstreams.set(dealId, existing);
    return record;
  }

  updateProgress(ddId: string, dealId: string, completed: number, criticalIssues: number, dealBreaker: boolean, findings: string[]): boolean {
    const workstreams = this.workstreams.get(dealId) || [];
    const record = workstreams.find(w => w.ddId === ddId);
    if (!record) return false;
    record.completedItems = completed;
    record.completionPct = record.totalItems > 0 ? (completed / record.totalItems) * 100 : 0;
    record.criticalIssuesFound = criticalIssues;
    record.dealBreakerFound = dealBreaker;
    record.findings = findings;
    record.riskRating = dealBreaker ? 'critical' : criticalIssues >= 3 ? 'high' : criticalIssues >= 1 ? 'medium' : 'low';
    record.status = record.completionPct >= 100 ? 'completed' : 'in_progress';
    return true;
  }

  getOverallProgress(dealId: string): number {
    const workstreams = this.workstreams.get(dealId) || [];
    if (!workstreams.length) return 0;
    return workstreams.reduce((s, w) => s + w.completionPct, 0) / workstreams.length;
  }

  hasDealBreaker(dealId: string): boolean {
    return (this.workstreams.get(dealId) || []).some(w => w.dealBreakerFound);
  }

  getWorkstreams(dealId: string): DueDiligenceRecord[] {
    return this.workstreams.get(dealId) || [];
  }
}

class MAValuationEngine {
  private valuations: Map<string, ValuationRecord[]> = new Map();
  private counter = 0;

  value(dealId: string, method: ValuationRecord['valuationMethod'], ev: number, equity: number, revenue: number, ebitda: number, netIncome: number, bookValue: number, synergyNPV: number): ValuationRecord {
    const valuationId = `maval-${Date.now()}-${++this.counter}`;
    const record: ValuationRecord = {
      valuationId, dealId, valuationMethod: method, enterpriseValue: ev, equityValue: equity,
      evToRevenue: revenue > 0 ? ev / revenue : 0, evToEBITDA: ebitda > 0 ? ev / ebitda : 0,
      impliedPERatio: netIncome > 0 ? equity / netIncome : 0,
      premiumToBVPct: bookValue > 0 ? ((equity - bookValue) / bookValue) * 100 : 0,
      synergyValueUSD: synergyNPV, valuedAt: Date.now()
    };
    const existing = this.valuations.get(dealId) || [];
    existing.push(record);
    this.valuations.set(dealId, existing);
    return record;
  }

  getLatest(dealId: string): ValuationRecord | undefined {
    const history = this.valuations.get(dealId) || [];
    return history[history.length - 1];
  }

  getAvgEVMultiple(dealId: string): number {
    const valuations = this.valuations.get(dealId) || [];
    if (!valuations.length) return 0;
    return valuations.reduce((s, v) => s + v.evToEBITDA, 0) / valuations.length;
  }
}

class IntegrationMonitor {
  private records: Map<string, IntegrationTrackingRecord[]> = new Map();
  private counter = 0;

  track(dealId: string, period: string, milestones: number, achieved: number, synergyTarget: number, synergyRealized: number, empRetention: number, systemsMigrated: number, custRetention: number, integrationCost: number): IntegrationTrackingRecord {
    const synergyPct = synergyTarget > 0 ? (synergyRealized / synergyTarget) * 100 : 0;
    const healthScore =
      (achieved / Math.max(1, milestones)) * 30 +
      synergyPct * 0.25 +
      empRetention * 0.2 +
      systemsMigrated * 0.15 +
      custRetention * 0.1;

    const integrationId = `integ-${Date.now()}-${++this.counter}`;
    const record: IntegrationTrackingRecord = {
      integrationId, dealId, period, day100Milestones: milestones, day100Achieved: achieved,
      synergyTargetUSD: synergyTarget, synergyRealizedUSD: synergyRealized,
      synergyRealizationPct: synergyPct, employeeRetentionRatePct: empRetention,
      systemsMigratedPct: systemsMigrated, customerRetentionRatePct: custRetention,
      integrationCostUSD: integrationCost, overallHealthScore: Math.max(0, Math.min(100, healthScore)),
      calculatedAt: Date.now()
    };
    const existing = this.records.get(dealId) || [];
    existing.push(record);
    this.records.set(dealId, existing);
    return record;
  }

  getLatest(dealId: string): IntegrationTrackingRecord | undefined {
    const history = this.records.get(dealId) || [];
    return history[history.length - 1];
  }

  getAtRiskIntegrations(threshold = 60): IntegrationTrackingRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is IntegrationTrackingRecord => !!r && r.overallHealthScore < threshold)
      .sort((a, b) => a.overallHealthScore - b.overallHealthScore);
  }
}

export const maDealPipelineManager = new MADealPipelineManager();
export const dueDiligenceTracker = new DueDiligenceTracker();
export const maValuationEngine = new MAValuationEngine();
export const integrationMonitor = new IntegrationMonitor();

export { MADealRecord, DueDiligenceRecord, ValuationRecord, IntegrationTrackingRecord };
