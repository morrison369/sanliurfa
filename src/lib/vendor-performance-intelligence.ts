/**
 * Phase 304: Vendor Performance Intelligence
 * Vendor scorecards, SLA tracking, vendor risk, contract compliance
 */

import { logger } from './logger';

interface VendorScorecardRecord {
  scorecardId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  period: string;
  qualityScore: number;           // 0-100
  deliveryScore: number;          // 0-100
  pricingScore: number;           // 0-100
  responsivenessScore: number;    // 0-100
  innovationScore: number;        // 0-100
  complianceScore: number;        // 0-100
  overallScore: number;           // weighted composite
  tier: 'strategic' | 'preferred' | 'approved' | 'conditional' | 'at_risk';
  recommendation: 'expand' | 'maintain' | 'review' | 'remediate' | 'exit';
  annualSpendUSD: number;
  scoredAt: number;
}

interface VendorSLARecord {
  slaId: string;
  vendorId: string;
  vendorName: string;
  slaName: string;
  slaType: 'availability' | 'response_time' | 'delivery' | 'quality' | 'support';
  targetValuePct: number;
  measuredValuePct: number;
  breached: boolean;
  breachCount: number;
  penaltyApplicable: boolean;
  penaltyAmountUSD: number;
  period: string;
  measurementMethod: string;
  recordedAt: number;
}

interface VendorRiskRecord {
  riskId: string;
  vendorId: string;
  vendorName: string;
  riskCategory: 'financial' | 'operational' | 'geopolitical' | 'cyber' | 'compliance' | 'concentration';
  riskDescription: string;
  likelihood: number;             // 1-5
  impact: number;                 // 1-5
  riskScore: number;              // likelihood × impact
  mitigationActions: string[];
  mitigationStatus: 'none' | 'planned' | 'in_progress' | 'mitigated';
  residualRiskScore: number;
  concentrationRisk: boolean;     // single-source or >30% spend
  identifiedAt: number;
}

interface VendorContractComplianceRecord {
  recordId: string;
  vendorId: string;
  vendorName: string;
  contractId: string;
  period: string;
  totalObligations: number;
  metObligations: number;
  breachedObligations: number;
  complianceRatePct: number;
  creditsEarnedUSD: number;
  penaltiesLeviedUSD: number;
  renewalRecommendation: boolean;
  keyIssues: string[];
  recordedAt: number;
}

class VendorScorecardManager {
  private scorecards: Map<string, VendorScorecardRecord[]> = new Map();
  private counter = 0;

  score(vendorId: string, vendorName: string, category: string, period: string, quality: number, delivery: number, pricing: number, responsiveness: number, innovation: number, compliance: number, annualSpend: number): VendorScorecardRecord {
    const overall = quality * 0.25 + delivery * 0.25 + pricing * 0.2 + responsiveness * 0.15 + compliance * 0.1 + innovation * 0.05;

    const tier: VendorScorecardRecord['tier'] =
      overall >= 85 ? 'strategic' :
      overall >= 70 ? 'preferred' :
      overall >= 55 ? 'approved' :
      overall >= 40 ? 'conditional' : 'at_risk';

    const recommendation: VendorScorecardRecord['recommendation'] =
      overall >= 85 ? 'expand' :
      overall >= 70 ? 'maintain' :
      overall >= 55 ? 'review' :
      overall >= 40 ? 'remediate' : 'exit';

    const scorecardId = `vsc-${Date.now()}-${++this.counter}`;
    const record: VendorScorecardRecord = {
      scorecardId, vendorId, vendorName, vendorCategory: category, period,
      qualityScore: quality, deliveryScore: delivery, pricingScore: pricing,
      responsivenessScore: responsiveness, innovationScore: innovation, complianceScore: compliance,
      overallScore: Math.round(overall * 10) / 10, tier, recommendation,
      annualSpendUSD: annualSpend, scoredAt: Date.now()
    };
    const existing = this.scorecards.get(vendorId) || [];
    existing.push(record);
    this.scorecards.set(vendorId, existing);
    logger.debug('Vendor scored', { vendorId, vendorName, overall, tier });
    return record;
  }

  getAtRiskVendors(): VendorScorecardRecord[] {
    return Array.from(this.scorecards.values()).flat()
      .filter(s => s.tier === 'at_risk' || s.tier === 'conditional')
      .sort((a, b) => a.overallScore - b.overallScore);
  }

  getStrategicVendors(): VendorScorecardRecord[] {
    return Array.from(this.scorecards.values()).flat()
      .filter(s => s.tier === 'strategic');
  }

  getTotalSpendByTier(tier: VendorScorecardRecord['tier']): number {
    return Array.from(this.scorecards.values()).flat()
      .filter(s => s.tier === tier)
      .reduce((sum, s) => sum + s.annualSpendUSD, 0);
  }

  getLatestScorecard(vendorId: string): VendorScorecardRecord | undefined {
    const scores = this.scorecards.get(vendorId) || [];
    return scores[scores.length - 1];
  }
}

class VendorSLAMonitor {
  private records: VendorSLARecord[] = [];
  private counter = 0;

  measure(vendorId: string, vendorName: string, slaName: string, type: VendorSLARecord['slaType'], target: number, measured: number, period: string, method: string, penaltyIfBreached: number): VendorSLARecord {
    const breached = measured < target;
    const slaId = `sla-${Date.now()}-${++this.counter}`;
    const record: VendorSLARecord = {
      slaId, vendorId, vendorName, slaName, slaType: type, targetValuePct: target,
      measuredValuePct: measured, breached, breachCount: breached ? 1 : 0,
      penaltyApplicable: breached && penaltyIfBreached > 0,
      penaltyAmountUSD: breached ? penaltyIfBreached : 0,
      period, measurementMethod: method, recordedAt: Date.now()
    };
    this.records.push(record);
    if (breached) logger.debug('SLA breach detected', { slaId, vendorName, slaName, target, measured });
    return record;
  }

  getBreachedSLAs(period?: string): VendorSLARecord[] {
    return this.records.filter(r => r.breached && (!period || r.period === period));
  }

  getTotalPenalties(period?: string): number {
    return this.records
      .filter(r => r.penaltyApplicable && (!period || r.period === period))
      .reduce((s, r) => s + r.penaltyAmountUSD, 0);
  }

  getSLAComplianceByVendor(vendorId: string): number {
    const vendorSLAs = this.records.filter(r => r.vendorId === vendorId);
    if (!vendorSLAs.length) return 100;
    return Math.round(((vendorSLAs.length - vendorSLAs.filter(r => r.breached).length) / vendorSLAs.length) * 100);
  }
}

class VendorRiskAnalyzer {
  private risks: Map<string, VendorRiskRecord[]> = new Map();
  private counter = 0;

  assess(vendorId: string, vendorName: string, category: VendorRiskRecord['riskCategory'], description: string, likelihood: number, impact: number, mitigations: string[], concentrationRisk: boolean): VendorRiskRecord {
    const riskScore = likelihood * impact;
    const residualScore = Math.max(1, riskScore - mitigations.length);
    const riskId = `vrisk-${Date.now()}-${++this.counter}`;
    const record: VendorRiskRecord = {
      riskId, vendorId, vendorName, riskCategory: category, riskDescription: description,
      likelihood: Math.max(1, Math.min(5, likelihood)), impact: Math.max(1, Math.min(5, impact)),
      riskScore, mitigationActions: mitigations,
      mitigationStatus: mitigations.length > 0 ? 'planned' : 'none',
      residualRiskScore: residualScore, concentrationRisk, identifiedAt: Date.now()
    };
    const existing = this.risks.get(vendorId) || [];
    existing.push(record);
    this.risks.set(vendorId, existing);
    return record;
  }

  getCriticalRisks(threshold = 15): VendorRiskRecord[] {
    return Array.from(this.risks.values()).flat()
      .filter(r => r.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  getConcentrationRisks(): VendorRiskRecord[] {
    return Array.from(this.risks.values()).flat().filter(r => r.concentrationRisk);
  }

  getVendorRiskScore(vendorId: string): number {
    const vendorRisks = this.risks.get(vendorId) || [];
    if (!vendorRisks.length) return 0;
    return Math.round(vendorRisks.reduce((s, r) => s + r.residualRiskScore, 0) / vendorRisks.length * 10) / 10;
  }
}

class VendorContractComplianceTracker {
  private records: VendorContractComplianceRecord[] = [];
  private counter = 0;

  track(vendorId: string, vendorName: string, contractId: string, period: string, totalObligs: number, metObligs: number, breached: number, creditsEarned: number, penaltiesLevied: number, issues: string[]): VendorContractComplianceRecord {
    const complianceRate = totalObligs > 0 ? Math.round((metObligs / totalObligs) * 100) : 100;
    const recordId = `vcc-${Date.now()}-${++this.counter}`;
    const record: VendorContractComplianceRecord = {
      recordId, vendorId, vendorName, contractId, period,
      totalObligations: totalObligs, metObligations: metObligs, breachedObligations: breached,
      complianceRatePct: complianceRate, creditsEarnedUSD: creditsEarned,
      penaltiesLeviedUSD: penaltiesLevied,
      renewalRecommendation: complianceRate >= 80 && breached === 0,
      keyIssues: issues, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLowComplianceVendors(threshold = 80): VendorContractComplianceRecord[] {
    return this.records.filter(r => r.complianceRatePct < threshold)
      .sort((a, b) => a.complianceRatePct - b.complianceRatePct);
  }

  getTotalPenalties(): number {
    return this.records.reduce((s, r) => s + r.penaltiesLeviedUSD, 0);
  }

  getNotRecommendedForRenewal(): VendorContractComplianceRecord[] {
    return this.records.filter(r => !r.renewalRecommendation);
  }
}

export const vendorScorecardManager = new VendorScorecardManager();
export const vendorSLAMonitor = new VendorSLAMonitor();
export const vendorRiskAnalyzer = new VendorRiskAnalyzer();
export const vendorContractComplianceTracker = new VendorContractComplianceTracker();

export { VendorScorecardRecord, VendorSLARecord, VendorRiskRecord, VendorContractComplianceRecord };
