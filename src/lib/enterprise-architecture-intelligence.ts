/**
 * Phase 298: Enterprise Architecture Intelligence
 * Application portfolio, technology debt, architecture compliance, capability mapping
 */

import { logger } from './logger';

interface ApplicationRecord {
  applicationId: string;
  name: string;
  appType: 'core' | 'supporting' | 'legacy' | 'strategic' | 'experimental';
  businessDomain: string;
  ownerTeam: string;
  technology: string;
  deploymentModel: 'cloud' | 'on_premise' | 'hybrid' | 'saas';
  userCount: number;
  businessCriticality: 'mission_critical' | 'high' | 'medium' | 'low';
  technicalHealthScore: number;    // 0-100
  businessValueScore: number;      // 0-100
  totalCostOfOwnershipUSD: number;
  retirementRecommendation: boolean;
  replacementApplicationId?: string;
  status: 'active' | 'retiring' | 'retired' | 'planned';
  createdAt: number;
}

interface TechnicalDebtRecord {
  debtId: string;
  applicationId: string;
  debtType: 'code' | 'architecture' | 'infrastructure' | 'security' | 'documentation' | 'test_coverage';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedRemediationDays: number;
  estimatedCostUSD: number;
  businessImpact: string;
  deferralRisk: string;
  identifiedAt: number;
  resolvedAt?: number;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
}

interface ArchitectureComplianceRecord {
  recordId: string;
  period: string;
  totalApplicationsAudited: number;
  compliantApplications: number;
  complianceRatePct: number;
  securityStandardsCompliance: number;     // 0-100
  apiStandardsCompliance: number;          // 0-100
  cloudFirstAdoptionPct: number;
  microservicesAdoptionPct: number;
  cicdAdoptionPct: number;
  documentationCompletenessPct: number;
  overallMaturityScore: number;
  calculatedAt: number;
}

interface CapabilityMapRecord {
  capabilityId: string;
  capabilityName: string;
  domain: string;
  currentMaturityLevel: number;    // 1-5
  targetMaturityLevel: number;
  supportingApplications: string[];
  investmentUSD: number;
  strategicImportance: 'high' | 'medium' | 'low';
  gapToTarget: number;
  roadmapInitiatives: string[];
  assessedAt: number;
}

class ApplicationPortfolioManager {
  private applications: Map<string, ApplicationRecord> = new Map();
  private counter = 0;

  register(name: string, type: ApplicationRecord['appType'], domain: string, owner: string, tech: string, deployment: ApplicationRecord['deploymentModel'], users: number, criticality: ApplicationRecord['businessCriticality'], annualCost: number): ApplicationRecord {
    const applicationId = `app-${Date.now()}-${++this.counter}`;
    const app: ApplicationRecord = {
      applicationId, name, appType: type, businessDomain: domain, ownerTeam: owner,
      technology: tech, deploymentModel: deployment, userCount: users, businessCriticality: criticality,
      technicalHealthScore: type === 'legacy' ? 30 : 70, businessValueScore: 50,
      totalCostOfOwnershipUSD: annualCost, retirementRecommendation: type === 'legacy',
      status: 'active', createdAt: Date.now()
    };
    this.applications.set(applicationId, app);
    logger.debug('Application registered', { applicationId, name, type, criticality });
    return app;
  }

  updateHealth(applicationId: string, techHealth: number, bizValue: number): boolean {
    const app = this.applications.get(applicationId);
    if (!app) return false;
    app.technicalHealthScore = Math.max(0, Math.min(100, techHealth));
    app.businessValueScore = Math.max(0, Math.min(100, bizValue));
    app.retirementRecommendation = techHealth < 40 && bizValue < 40;
    return true;
  }

  getCandidatesForRetirement(): ApplicationRecord[] {
    return Array.from(this.applications.values())
      .filter(a => a.retirementRecommendation && a.status === 'active')
      .sort((a, b) => a.technicalHealthScore - b.technicalHealthScore);
  }

  getLegacyApplications(): ApplicationRecord[] {
    return Array.from(this.applications.values()).filter(a => a.appType === 'legacy' && a.status === 'active');
  }

  getTotalTCO(): number {
    return Array.from(this.applications.values())
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + a.totalCostOfOwnershipUSD, 0);
  }

  getApplication(id: string): ApplicationRecord | undefined {
    return this.applications.get(id);
  }
}

class TechnicalDebtTracker {
  private debts: Map<string, TechnicalDebtRecord[]> = new Map();
  private counter = 0;

  register(applicationId: string, type: TechnicalDebtRecord['debtType'], severity: TechnicalDebtRecord['severity'], description: string, remediationDays: number, cost: number, impact: string, deferralRisk: string): TechnicalDebtRecord {
    const debtId = `debt-${Date.now()}-${++this.counter}`;
    const record: TechnicalDebtRecord = {
      debtId, applicationId, debtType: type, severity, description, estimatedRemediationDays: remediationDays,
      estimatedCostUSD: cost, businessImpact: impact, deferralRisk, identifiedAt: Date.now(), status: 'open'
    };
    const existing = this.debts.get(applicationId) || [];
    existing.push(record);
    this.debts.set(applicationId, existing);
    return record;
  }

  resolve(debtId: string, applicationId: string): boolean {
    const debts = this.debts.get(applicationId) || [];
    const debt = debts.find(d => d.debtId === debtId);
    if (!debt) return false;
    debt.status = 'resolved';
    debt.resolvedAt = Date.now();
    return true;
  }

  getTotalDebtCost(): number {
    return Array.from(this.debts.values()).flat()
      .filter(d => d.status === 'open' || d.status === 'in_progress')
      .reduce((s, d) => s + d.estimatedCostUSD, 0);
  }

  getCriticalDebts(): TechnicalDebtRecord[] {
    return Array.from(this.debts.values()).flat()
      .filter(d => d.severity === 'critical' && d.status !== 'resolved')
      .sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);
  }

  getDebtByApplication(applicationId: string): TechnicalDebtRecord[] {
    return this.debts.get(applicationId) || [];
  }
}

class ArchitectureComplianceAnalyzer {
  private records: ArchitectureComplianceRecord[] = [];
  private counter = 0;

  audit(period: string, totalAudited: number, compliant: number, securityScore: number, apiScore: number, cloudFirstPct: number, microservicesPct: number, cicdPct: number, docPct: number): ArchitectureComplianceRecord {
    const overallMaturity =
      securityScore * 0.25 + apiScore * 0.2 + cloudFirstPct * 0.2 +
      microservicesPct * 0.15 + cicdPct * 0.15 + docPct * 0.05;

    const recordId = `archcomp-${Date.now()}-${++this.counter}`;
    const record: ArchitectureComplianceRecord = {
      recordId, period, totalApplicationsAudited: totalAudited, compliantApplications: compliant,
      complianceRatePct: totalAudited > 0 ? (compliant / totalAudited) * 100 : 0,
      securityStandardsCompliance: securityScore, apiStandardsCompliance: apiScore,
      cloudFirstAdoptionPct: cloudFirstPct, microservicesAdoptionPct: microservicesPct,
      cicdAdoptionPct: cicdPct, documentationCompletenessPct: docPct,
      overallMaturityScore: Math.max(0, Math.min(100, overallMaturity)), calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Architecture compliance audited', { period, overallMaturity: record.overallMaturityScore });
    return record;
  }

  getLatest(): ArchitectureComplianceRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getMaturityTrend(): number[] {
    return this.records.map(r => r.overallMaturityScore);
  }
}

class CapabilityMapper {
  private capabilities: Map<string, CapabilityMapRecord> = new Map();
  private counter = 0;

  map(name: string, domain: string, currentMaturity: number, targetMaturity: number, apps: string[], investment: number, importance: CapabilityMapRecord['strategicImportance'], initiatives: string[]): CapabilityMapRecord {
    const capabilityId = `cap-${Date.now()}-${++this.counter}`;
    const record: CapabilityMapRecord = {
      capabilityId, capabilityName: name, domain, currentMaturityLevel: Math.max(1, Math.min(5, currentMaturity)),
      targetMaturityLevel: Math.max(1, Math.min(5, targetMaturity)), supportingApplications: apps,
      investmentUSD: investment, strategicImportance: importance,
      gapToTarget: targetMaturity - currentMaturity, roadmapInitiatives: initiatives,
      assessedAt: Date.now()
    };
    this.capabilities.set(capabilityId, record);
    return record;
  }

  getCapabilityGaps(minGap = 1): CapabilityMapRecord[] {
    return Array.from(this.capabilities.values())
      .filter(c => c.gapToTarget >= minGap)
      .sort((a, b) => b.gapToTarget - a.gapToTarget);
  }

  getHighImportanceLowMaturity(): CapabilityMapRecord[] {
    return Array.from(this.capabilities.values())
      .filter(c => c.strategicImportance === 'high' && c.currentMaturityLevel <= 2);
  }

  getTotalInvestment(): number {
    return Array.from(this.capabilities.values()).reduce((s, c) => s + c.investmentUSD, 0);
  }
}

export const applicationPortfolioManager = new ApplicationPortfolioManager();
export const technicalDebtTracker = new TechnicalDebtTracker();
export const architectureComplianceAnalyzer = new ArchitectureComplianceAnalyzer();
export const capabilityMapper = new CapabilityMapper();

export { ApplicationRecord, TechnicalDebtRecord, ArchitectureComplianceRecord, CapabilityMapRecord };
