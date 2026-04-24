/**
 * Phase 209: Supplier Risk Scoring
 * Supplier profile management, risk scoring, audit tracking, mitigation management
 */

import { logger } from './logger';

interface SupplierProfile {
  supplierId: string;
  name: string;
  country: string;
  category: 'raw_material' | 'component' | 'service' | 'logistics' | 'technology';
  tier: 1 | 2 | 3;
  annualSpend: number;
  contractStart: number;
  contractEnd: number;
  status: 'active' | 'probation' | 'suspended' | 'inactive';
  createdAt: number;
}

interface RiskScore {
  scoreId: string;
  supplierId: string;
  financialRisk: number;   // 0-100
  operationalRisk: number;
  geopoliticalRisk: number;
  complianceRisk: number;
  concentrationRisk: number;
  overallRisk: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  assessedAt: number;
}

interface SupplierAudit {
  auditId: string;
  supplierId: string;
  type: 'financial' | 'quality' | 'esg' | 'security' | 'full';
  auditedBy: string;
  findings: Array<{ area: string; severity: 'critical' | 'major' | 'minor'; description: string }>;
  score: number; // 0-100
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  scheduledAt: number;
  completedAt?: number;
}

interface RiskMitigation {
  mitigationId: string;
  supplierId: string;
  riskType: string;
  action: string;
  owner: string;
  dueDate: number;
  status: 'planned' | 'in_progress' | 'completed' | 'overdue';
  expectedRiskReduction: number;
  createdAt: number;
}

class SupplierProfileManager {
  private profiles: Map<string, SupplierProfile> = new Map();
  private counter = 0;

  register(name: string, country: string, category: SupplierProfile['category'], tier: SupplierProfile['tier'], annualSpend: number, contractDays = 365): SupplierProfile {
    const supplierId = `supplier-${Date.now()}-${++this.counter}`;
    const profile: SupplierProfile = {
      supplierId, name, country, category, tier, annualSpend,
      contractStart: Date.now(),
      contractEnd: Date.now() + contractDays * 86400000,
      status: 'active', createdAt: Date.now()
    };
    this.profiles.set(supplierId, profile);
    logger.debug('Supplier registered', { supplierId, name, country, category });
    return profile;
  }

  updateStatus(supplierId: string, status: SupplierProfile['status']): boolean {
    const p = this.profiles.get(supplierId);
    if (p) { p.status = status; return true; }
    return false;
  }

  getByCategory(category: SupplierProfile['category']): SupplierProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.category === category);
  }

  getCriticalSuppliers(spendThreshold = 100000): SupplierProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.tier === 1 && p.annualSpend >= spendThreshold && p.status === 'active')
      .sort((a, b) => b.annualSpend - a.annualSpend);
  }

  getProfile(supplierId: string): SupplierProfile | undefined {
    return this.profiles.get(supplierId);
  }
}

class RiskScoreCalculator {
  private scores: Map<string, RiskScore> = new Map();
  private counter = 0;

  calculate(supplierId: string, financial: number, operational: number, geopolitical: number, compliance: number, concentration: number): RiskScore {
    const overall = financial * 0.25 + operational * 0.25 + geopolitical * 0.2 + compliance * 0.2 + concentration * 0.1;
    const riskLevel: RiskScore['riskLevel'] = overall >= 70 ? 'critical' : overall >= 50 ? 'high' : overall >= 30 ? 'medium' : 'low';
    const scoreId = `rscore-${Date.now()}-${++this.counter}`;
    const score: RiskScore = {
      scoreId, supplierId,
      financialRisk: financial, operationalRisk: operational,
      geopoliticalRisk: geopolitical, complianceRisk: compliance,
      concentrationRisk: concentration, overallRisk: overall,
      riskLevel, assessedAt: Date.now()
    };
    this.scores.set(supplierId, score);
    logger.debug('Risk score calculated', { supplierId, overallRisk: overall.toFixed(1), riskLevel });
    return score;
  }

  getScore(supplierId: string): RiskScore | undefined {
    return this.scores.get(supplierId);
  }

  getHighRiskSuppliers(): RiskScore[] {
    return Array.from(this.scores.values())
      .filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high')
      .sort((a, b) => b.overallRisk - a.overallRisk);
  }

  getPortfolioRiskAvg(): number {
    const scores = Array.from(this.scores.values());
    if (!scores.length) return 0;
    return scores.reduce((s, r) => s + r.overallRisk, 0) / scores.length;
  }
}

class SupplierAuditTracker {
  private audits: Map<string, SupplierAudit[]> = new Map();
  private counter = 0;

  schedule(supplierId: string, type: SupplierAudit['type'], auditedBy: string, scheduledDays = 30): SupplierAudit {
    const auditId = `audit-${Date.now()}-${++this.counter}`;
    const audit: SupplierAudit = {
      auditId, supplierId, type, auditedBy, findings: [], score: 0,
      status: 'scheduled',
      scheduledAt: Date.now() + scheduledDays * 86400000
    };
    const existing = this.audits.get(supplierId) || [];
    existing.push(audit);
    this.audits.set(supplierId, existing);
    return audit;
  }

  complete(auditId: string, score: number, findings: SupplierAudit['findings']): boolean {
    for (const audits of this.audits.values()) {
      const audit = audits.find(a => a.auditId === auditId);
      if (audit) {
        audit.score = Math.max(0, Math.min(100, score));
        audit.findings = findings;
        audit.status = findings.some(f => f.severity === 'critical') ? 'failed' : 'completed';
        audit.completedAt = Date.now();
        return true;
      }
    }
    return false;
  }

  getLatestAudit(supplierId: string): SupplierAudit | undefined {
    const audits = this.audits.get(supplierId) || [];
    return audits.filter(a => a.completedAt).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
  }

  getFailedAudits(): SupplierAudit[] {
    return Array.from(this.audits.values()).flat().filter(a => a.status === 'failed');
  }
}

class RiskMitigationManager {
  private mitigations: Map<string, RiskMitigation[]> = new Map();
  private counter = 0;

  create(supplierId: string, riskType: string, action: string, owner: string, dueDays: number, expectedReduction: number): RiskMitigation {
    const mitigationId = `mitigate-${Date.now()}-${++this.counter}`;
    const mitigation: RiskMitigation = {
      mitigationId, supplierId, riskType, action, owner,
      dueDate: Date.now() + dueDays * 86400000,
      status: 'planned', expectedRiskReduction: expectedReduction,
      createdAt: Date.now()
    };
    const existing = this.mitigations.get(supplierId) || [];
    existing.push(mitigation);
    this.mitigations.set(supplierId, existing);
    logger.debug('Risk mitigation created', { mitigationId, supplierId, riskType, action });
    return mitigation;
  }

  advance(mitigationId: string, status: RiskMitigation['status']): boolean {
    for (const mitigations of this.mitigations.values()) {
      const m = mitigations.find(m => m.mitigationId === mitigationId);
      if (m) { m.status = status; return true; }
    }
    return false;
  }

  getOpenMitigations(supplierId?: string): RiskMitigation[] {
    return Array.from(this.mitigations.values()).flat()
      .filter(m => m.status !== 'completed' && (!supplierId || m.supplierId === supplierId));
  }

  getTotalExpectedReduction(supplierId: string): number {
    return (this.mitigations.get(supplierId) || [])
      .filter(m => m.status === 'completed')
      .reduce((s, m) => s + m.expectedRiskReduction, 0);
  }
}

export const supplierProfileManager = new SupplierProfileManager();
export const riskScoreCalculator = new RiskScoreCalculator();
export const supplierAuditTracker = new SupplierAuditTracker();
export const riskMitigationManager = new RiskMitigationManager();

export {SupplierProfile, RiskScore, SupplierAudit, RiskMitigation};