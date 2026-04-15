/**
 * Phase 258: Vendor Risk Intelligence
 * Third-party risk assessment, vendor scorecards, concentration risk, continuous monitoring
 */

import { logger } from './logger';

interface VendorRiskProfile {
  profileId: string;
  vendorId: string;
  vendorName: string;
  category: 'technology' | 'professional_services' | 'logistics' | 'manufacturing' | 'financial' | 'cloud';
  criticality: 'critical' | 'high' | 'medium' | 'low';
  annualSpend: number;
  dataAccessLevel: 'none' | 'internal' | 'confidential' | 'restricted';
  geographicRisk: number;       // 0-100
  financialStabilityScore: number; // 0-100 (higher = more stable)
  cybersecurityScore: number;   // 0-100
  complianceScore: number;      // 0-100
  overallRiskScore: number;     // weighted (higher = more risk)
  riskRating: 'critical' | 'high' | 'medium' | 'low';
  lastAssessedAt: number;
}

interface VendorIncident {
  incidentId: string;
  vendorId: string;
  vendorName: string;
  incidentType: 'data_breach' | 'service_outage' | 'compliance_violation' | 'financial_instability' | 'geopolitical';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  businessImpact: string;
  occurredAt: number;
  resolvedAt?: number;
  status: 'open' | 'investigating' | 'resolved';
}

interface ConcentrationRiskReport {
  reportId: string;
  period: string;
  singleVendorMaxSpendPct: number;  // largest vendor as % of total spend
  top5VendorSpendPct: number;
  criticalVendorCount: number;
  singleSourceCategories: string[];  // categories with only 1 vendor
  concentrationRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  generatedAt: number;
}

interface VendorDueDiligenceItem {
  itemId: string;
  vendorId: string;
  checkType: 'financial' | 'security' | 'compliance' | 'operational' | 'reputational';
  finding: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  recommendation: string;
  checkedAt: number;
  checkedBy: string;
}

class VendorRiskProfiler {
  private profiles: Map<string, VendorRiskProfile> = new Map();
  private counter = 0;

  assess(vendorId: string, vendorName: string, category: VendorRiskProfile['category'], criticality: VendorRiskProfile['criticality'], annualSpend: number, dataAccessLevel: VendorRiskProfile['dataAccessLevel'], geographicRisk: number, financialStability: number, cybersecurity: number, compliance: number): VendorRiskProfile {
    // Risk score: lower stability/cyber/compliance + higher geo risk = higher risk
    const dataRiskMultiplier = { none: 0.8, internal: 1.0, confidential: 1.2, restricted: 1.5 }[dataAccessLevel];
    const rawRisk = (
      geographicRisk * 0.15 +
      (100 - financialStability) * 0.25 +
      (100 - cybersecurity) * 0.35 +
      (100 - compliance) * 0.25
    ) * dataRiskMultiplier;

    const overallRiskScore = Math.max(0, Math.min(100, rawRisk));
    const riskRating: VendorRiskProfile['riskRating'] =
      overallRiskScore >= 70 ? 'critical' : overallRiskScore >= 50 ? 'high' :
      overallRiskScore >= 25 ? 'medium' : 'low';

    const profileId = `vendorrisk-${Date.now()}-${++this.counter}`;
    const profile: VendorRiskProfile = {
      profileId, vendorId, vendorName, category, criticality, annualSpend, dataAccessLevel,
      geographicRisk, financialStabilityScore: financialStability, cybersecurityScore: cybersecurity,
      complianceScore: compliance, overallRiskScore, riskRating, lastAssessedAt: Date.now()
    };
    this.profiles.set(vendorId, profile);
    logger.debug('Vendor risk assessed', { vendorId, overallRiskScore, riskRating });
    return profile;
  }

  getHighRisk(): VendorRiskProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.riskRating === 'critical' || p.riskRating === 'high')
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  getTotalSpend(): number {
    return Array.from(this.profiles.values()).reduce((s, p) => s + p.annualSpend, 0);
  }

  getProfile(vendorId: string): VendorRiskProfile | undefined {
    return this.profiles.get(vendorId);
  }

  getAllProfiles(): VendorRiskProfile[] {
    return Array.from(this.profiles.values());
  }
}

class VendorIncidentTracker {
  private incidents: Map<string, VendorIncident[]> = new Map();
  private counter = 0;

  record(vendorId: string, vendorName: string, incidentType: VendorIncident['incidentType'], severity: VendorIncident['severity'], description: string, businessImpact: string): VendorIncident {
    const incidentId = `vendorinc-${Date.now()}-${++this.counter}`;
    const incident: VendorIncident = {
      incidentId, vendorId, vendorName, incidentType, severity, description,
      businessImpact, occurredAt: Date.now(), status: 'open'
    };
    const existing = this.incidents.get(vendorId) || [];
    existing.push(incident);
    this.incidents.set(vendorId, existing);
    return incident;
  }

  resolve(incidentId: string): boolean {
    for (const list of this.incidents.values()) {
      const inc = list.find(i => i.incidentId === incidentId);
      if (inc) { inc.status = 'resolved'; inc.resolvedAt = Date.now(); return true; }
    }
    return false;
  }

  getOpenBySeverity(severity: VendorIncident['severity']): VendorIncident[] {
    return Array.from(this.incidents.values()).flat()
      .filter(i => i.status === 'open' && i.severity === severity);
  }

  getVendorHistory(vendorId: string): VendorIncident[] {
    return this.incidents.get(vendorId) || [];
  }
}

class ConcentrationRiskAnalyzer {
  private reports: ConcentrationRiskReport[] = [];
  private counter = 0;

  analyze(period: string, vendorSpends: Record<string, number>, criticalVendorCount: number, singleSourceCategories: string[]): ConcentrationRiskReport {
    const totalSpend = Object.values(vendorSpends).reduce((s, v) => s + v, 0);
    const sorted = Object.values(vendorSpends).sort((a, b) => b - a);
    const singleVendorMaxSpendPct = totalSpend > 0 ? (sorted[0] / totalSpend) * 100 : 0;
    const top5 = sorted.slice(0, 5).reduce((s, v) => s + v, 0);
    const top5VendorSpendPct = totalSpend > 0 ? (top5 / totalSpend) * 100 : 0;

    const concentrationRiskLevel: ConcentrationRiskReport['concentrationRiskLevel'] =
      singleVendorMaxSpendPct >= 40 ? 'critical' :
      singleVendorMaxSpendPct >= 25 ? 'high' :
      singleVendorMaxSpendPct >= 15 ? 'medium' : 'low';

    const reportId = `concrisk-${Date.now()}-${++this.counter}`;
    const report: ConcentrationRiskReport = {
      reportId, period, singleVendorMaxSpendPct, top5VendorSpendPct,
      criticalVendorCount, singleSourceCategories, concentrationRiskLevel, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): ConcentrationRiskReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

class VendorDueDiligenceTracker {
  private items: Map<string, VendorDueDiligenceItem[]> = new Map();
  private counter = 0;

  record(vendorId: string, checkType: VendorDueDiligenceItem['checkType'], finding: string, riskLevel: VendorDueDiligenceItem['riskLevel'], recommendation: string, checkedBy: string): VendorDueDiligenceItem {
    const itemId = `dd-${Date.now()}-${++this.counter}`;
    const item: VendorDueDiligenceItem = {
      itemId, vendorId, checkType, finding, riskLevel, recommendation, checkedAt: Date.now(), checkedBy
    };
    const existing = this.items.get(vendorId) || [];
    existing.push(item);
    this.items.set(vendorId, existing);
    return item;
  }

  getVendorFindings(vendorId: string): VendorDueDiligenceItem[] {
    return this.items.get(vendorId) || [];
  }

  getCriticalFindings(): VendorDueDiligenceItem[] {
    return Array.from(this.items.values()).flat().filter(i => i.riskLevel === 'critical' || i.riskLevel === 'high');
  }

  getVendorRiskSummary(vendorId: string): { totalChecks: number; criticalFindings: number; highFindings: number } {
    const findings = this.items.get(vendorId) || [];
    return {
      totalChecks: findings.length,
      criticalFindings: findings.filter(f => f.riskLevel === 'critical').length,
      highFindings: findings.filter(f => f.riskLevel === 'high').length
    };
  }
}

export const vendorRiskProfiler = new VendorRiskProfiler();
export const vendorIncidentTracker = new VendorIncidentTracker();
export const concentrationRiskAnalyzer = new ConcentrationRiskAnalyzer();
export const vendorDueDiligenceTracker = new VendorDueDiligenceTracker();

export { VendorRiskProfile, VendorIncident, ConcentrationRiskReport, VendorDueDiligenceItem };
