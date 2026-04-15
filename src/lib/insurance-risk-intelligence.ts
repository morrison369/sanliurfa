/**
 * Phase 288: Insurance & Risk Management Intelligence
 * Policy portfolio, claims management, risk exposure, actuarial analytics
 */

import { logger } from './logger';

interface InsurancePolicyRecord {
  policyId: string;
  policyNumber: string;
  policyType: 'property' | 'liability' | 'workers_comp' | 'cyber' | 'directors_officers' | 'professional_indemnity' | 'business_interruption';
  insurer: string;
  coverageAmount: number;
  annualPremium: number;
  deductible: number;
  effectiveDate: number;
  expiryDate: number;
  coverageScope: string[];
  exclusions: string[];
  status: 'active' | 'expired' | 'cancelled' | 'pending_renewal';
  createdAt: number;
}

interface InsuranceClaimRecord {
  claimId: string;
  policyId: string;
  claimType: string;
  incidentDate: number;
  reportedDate: number;
  claimedAmount: number;
  settledAmount: number;
  deductiblePaid: number;
  status: 'filed' | 'under_review' | 'approved' | 'denied' | 'settled' | 'appealed';
  daysToSettle?: number;
  adjusterNotes?: string;
  createdAt: number;
}

interface RiskExposureRecord {
  recordId: string;
  riskCategory: 'operational' | 'financial' | 'strategic' | 'compliance' | 'reputational' | 'cyber' | 'natural_disaster';
  description: string;
  likelihood: number;         // 1-5
  impact: number;             // 1-5
  riskScore: number;          // likelihood × impact
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentControls: string[];
  residualRiskScore: number;
  mitigationActions: string[];
  insuredPct: number;         // % of exposure covered by insurance
  estimatedMaxLoss: number;
  assessedAt: number;
}

interface InsuranceProgramRecord {
  reportId: string;
  period: string;
  totalPolicies: number;
  totalPremiumSpend: number;
  totalCoverageAmount: number;
  totalClaimsFiled: number;
  totalClaimsSettled: number;
  totalClaimsAmountPaid: number;
  lossRatioPct: number;         // claims paid / premiums × 100
  claimsFrequency: number;      // claims per policy
  renewalsDue: number;
  avgClaimSettlementDays: number;
  calculatedAt: number;
}

class InsurancePolicyManager {
  private policies: Map<string, InsurancePolicyRecord> = new Map();
  private counter = 0;

  add(policyNumber: string, type: InsurancePolicyRecord['policyType'], insurer: string, coverage: number, premium: number, deductible: number, effectiveDate: number, expiryDate: number, scope: string[]): InsurancePolicyRecord {
    const policyId = `inspol-${Date.now()}-${++this.counter}`;
    const policy: InsurancePolicyRecord = {
      policyId, policyNumber, policyType: type, insurer, coverageAmount: coverage,
      annualPremium: premium, deductible, effectiveDate, expiryDate, coverageScope: scope,
      exclusions: [], status: 'active', createdAt: Date.now()
    };
    this.policies.set(policyId, policy);
    logger.debug('Insurance policy added', { policyId, type, insurer, premium });
    return policy;
  }

  getExpiringPolicies(days = 60): InsurancePolicyRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.policies.values())
      .filter(p => p.status === 'active' && p.expiryDate <= horizon)
      .sort((a, b) => a.expiryDate - b.expiryDate);
  }

  getTotalPremiumSpend(): number {
    return Array.from(this.policies.values())
      .filter(p => p.status === 'active')
      .reduce((s, p) => s + p.annualPremium, 0);
  }

  getTotalCoverage(): number {
    return Array.from(this.policies.values())
      .filter(p => p.status === 'active')
      .reduce((s, p) => s + p.coverageAmount, 0);
  }

  getByType(type: InsurancePolicyRecord['policyType']): InsurancePolicyRecord[] {
    return Array.from(this.policies.values()).filter(p => p.policyType === type);
  }
}

class InsuranceClaimsManager {
  private claims: Map<string, InsuranceClaimRecord[]> = new Map();
  private counter = 0;

  file(policyId: string, claimType: string, incidentDate: number, claimedAmount: number): InsuranceClaimRecord {
    const claimId = `claim-${Date.now()}-${++this.counter}`;
    const claim: InsuranceClaimRecord = {
      claimId, policyId, claimType, incidentDate, reportedDate: Date.now(),
      claimedAmount, settledAmount: 0, deductiblePaid: 0, status: 'filed', createdAt: Date.now()
    };
    const existing = this.claims.get(policyId) || [];
    existing.push(claim);
    this.claims.set(policyId, existing);
    return claim;
  }

  settle(claimId: string, policyId: string, settledAmount: number, deductible: number): boolean {
    const claims = this.claims.get(policyId) || [];
    const claim = claims.find(c => c.claimId === claimId);
    if (!claim) return false;
    claim.settledAmount = settledAmount;
    claim.deductiblePaid = deductible;
    claim.status = 'settled';
    claim.daysToSettle = Math.floor((Date.now() - claim.reportedDate) / 86400000);
    return true;
  }

  getTotalPaid(): number {
    return Array.from(this.claims.values()).flat()
      .filter(c => c.status === 'settled')
      .reduce((s, c) => s + c.settledAmount, 0);
  }

  getOpenClaims(): InsuranceClaimRecord[] {
    return Array.from(this.claims.values())
      .flat()
      .filter(c => ['filed', 'under_review', 'approved'].includes(c.status));
  }

  getLossRatio(totalPremiums: number): number {
    const paid = this.getTotalPaid();
    return totalPremiums > 0 ? (paid / totalPremiums) * 100 : 0;
  }
}

class RiskExposureAnalyzer {
  private risks: Map<string, RiskExposureRecord> = new Map();
  private counter = 0;

  assess(category: RiskExposureRecord['riskCategory'], description: string, likelihood: number, impact: number, controls: string[], mitigations: string[], insuredPct: number, maxLoss: number): RiskExposureRecord {
    const riskScore = likelihood * impact;
    const controlReduction = controls.length * 2;
    const residualScore = Math.max(1, riskScore - controlReduction);
    const riskLevel: RiskExposureRecord['riskLevel'] =
      riskScore >= 20 ? 'critical' : riskScore >= 12 ? 'high' : riskScore >= 6 ? 'medium' : 'low';

    const recordId = `risk-${Date.now()}-${++this.counter}`;
    const record: RiskExposureRecord = {
      recordId, riskCategory: category, description, likelihood: Math.min(5, likelihood),
      impact: Math.min(5, impact), riskScore, riskLevel, currentControls: controls,
      residualRiskScore: residualScore, mitigationActions: mitigations, insuredPct,
      estimatedMaxLoss: maxLoss, assessedAt: Date.now()
    };
    this.risks.set(recordId, record);
    return record;
  }

  getCriticalRisks(): RiskExposureRecord[] {
    return Array.from(this.risks.values())
      .filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high')
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  getUninsuredExposure(): RiskExposureRecord[] {
    return Array.from(this.risks.values()).filter(r => r.insuredPct < 50);
  }

  getTotalMaxLoss(): number {
    return Array.from(this.risks.values()).reduce((s, r) => s + r.estimatedMaxLoss * (1 - r.insuredPct / 100), 0);
  }
}

class InsuranceProgramAnalyzer {
  private reports: InsuranceProgramRecord[] = [];
  private counter = 0;

  analyze(period: string, policies: InsurancePolicyRecord[], claims: InsuranceClaimRecord[]): InsuranceProgramRecord {
    const active = policies.filter(p => p.status === 'active');
    const totalPremium = active.reduce((s, p) => s + p.annualPremium, 0);
    const settled = claims.filter(c => c.status === 'settled');
    const totalPaid = settled.reduce((s, c) => s + c.settledAmount, 0);
    const expiring = policies.filter(p => {
      const horizon = Date.now() + 90 * 86400000;
      return p.status === 'active' && p.expiryDate <= horizon;
    }).length;
    const avgSettlement = settled.length > 0
      ? settled.reduce((s, c) => s + (c.daysToSettle || 0), 0) / settled.length : 0;

    const reportId = `insrep-${Date.now()}-${++this.counter}`;
    const record: InsuranceProgramRecord = {
      reportId, period, totalPolicies: active.length, totalPremiumSpend: totalPremium,
      totalCoverageAmount: active.reduce((s, p) => s + p.coverageAmount, 0),
      totalClaimsFiled: claims.length, totalClaimsSettled: settled.length,
      totalClaimsAmountPaid: totalPaid,
      lossRatioPct: totalPremium > 0 ? (totalPaid / totalPremium) * 100 : 0,
      claimsFrequency: active.length > 0 ? claims.length / active.length : 0,
      renewalsDue: expiring, avgClaimSettlementDays: avgSettlement, calculatedAt: Date.now()
    };
    this.reports.push(record);
    return record;
  }

  getLatest(): InsuranceProgramRecord | undefined {
    return this.reports[this.reports.length - 1];
  }

  getLossRatioTrend(): number[] {
    return this.reports.map(r => r.lossRatioPct);
  }
}

export const insurancePolicyManager = new InsurancePolicyManager();
export const insuranceClaimsManager = new InsuranceClaimsManager();
export const riskExposureAnalyzer = new RiskExposureAnalyzer();
export const insuranceProgramAnalyzer = new InsuranceProgramAnalyzer();

export { InsurancePolicyRecord, InsuranceClaimRecord, RiskExposureRecord, InsuranceProgramRecord };
