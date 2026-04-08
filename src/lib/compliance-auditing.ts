/**
 * Phase 78: Compliance Management & Auditing
 * Regulatory compliance tracking, audit management, checklist management, compliance reporting
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ComplianceFramework = 'soc2' | 'iso27001' | 'hipaa' | 'pci-dss' | 'sox' | 'coso' | 'other';
export type AuditType = 'internal' | 'external' | 'regulatory' | 'third-party';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'remediation';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFramework;
  requirementId: string;
  title: string;
  description: string;
  owner: string;
  dueDate: number;
  status: 'compliant' | 'non_compliant' | 'in_progress';
  createdAt: number;
}

export interface Audit {
  id: string;
  type: AuditType;
  framework: ComplianceFramework;
  startDate: number;
  endDate?: number;
  status: AuditStatus;
  auditor: string;
  scope: string;
  findings: string[];
  createdAt: number;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  remediation?: string;
  dueDate?: number;
  owner?: string;
  status: 'open' | 'remediated';
  createdAt: number;
}

export interface ComplianceChecklist {
  id: string;
  framework: ComplianceFramework;
  name: string;
  items: { id: string; description: string; completed: boolean; completedDate?: number }[];
  progress: number;
  dueDate: number;
  createdAt: number;
}

// ==================== COMPLIANCE MANAGER ====================

export class ComplianceManager {
  private requirements = new Map<string, ComplianceRequirement>();
  private requirementCount = 0;

  /**
   * Create requirement
   */
  createRequirement(req: Omit<ComplianceRequirement, 'id' | 'createdAt'>): ComplianceRequirement {
    const id = 'req-' + Date.now() + '-' + this.requirementCount++;

    const newReq: ComplianceRequirement = {
      ...req,
      id,
      createdAt: Date.now()
    };

    this.requirements.set(id, newReq);
    logger.info('Compliance requirement created', { requirementId: id, framework: req.framework });

    return newReq;
  }

  /**
   * Get requirement
   */
  getRequirement(reqId: string): ComplianceRequirement | null {
    return this.requirements.get(reqId) || null;
  }

  /**
   * List requirements
   */
  listRequirements(framework?: ComplianceFramework): ComplianceRequirement[] {
    let requirements = Array.from(this.requirements.values());

    if (framework) {
      requirements = requirements.filter(r => r.framework === framework);
    }

    return requirements;
  }

  /**
   * Update requirement
   */
  updateRequirement(reqId: string, updates: Partial<ComplianceRequirement>): void {
    const requirement = this.requirements.get(reqId);
    if (requirement) {
      Object.assign(requirement, updates);
      logger.debug('Requirement updated', { requirementId: reqId });
    }
  }

  /**
   * Mark compliant
   */
  markCompliant(reqId: string): void {
    const requirement = this.requirements.get(reqId);
    if (requirement) {
      requirement.status = 'compliant';
      logger.info('Requirement marked compliant', { requirementId: reqId });
    }
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(framework: ComplianceFramework): { total: number; compliant: number; percentage: number } {
    const requirements = this.listRequirements(framework);
    const compliant = requirements.filter(r => r.status === 'compliant').length;
    const percentage = requirements.length > 0 ? (compliant / requirements.length) * 100 : 0;

    return { total: requirements.length, compliant, percentage: Math.round(percentage) };
  }
}

// ==================== AUDIT MANAGER ====================

export class AuditManager {
  private audits = new Map<string, Audit>();
  private auditCount = 0;

  /**
   * Create audit
   */
  createAudit(audit: Omit<Audit, 'id' | 'createdAt'>): Audit {
    const id = 'audit-' + Date.now() + '-' + this.auditCount++;

    const newAudit: Audit = {
      ...audit,
      id,
      createdAt: Date.now()
    };

    this.audits.set(id, newAudit);
    logger.info('Audit created', { auditId: id, type: audit.type, framework: audit.framework });

    return newAudit;
  }

  /**
   * Get audit
   */
  getAudit(auditId: string): Audit | null {
    return this.audits.get(auditId) || null;
  }

  /**
   * List audits
   */
  listAudits(status?: AuditStatus, framework?: ComplianceFramework): Audit[] {
    let audits = Array.from(this.audits.values());

    if (status) {
      audits = audits.filter(a => a.status === status);
    }

    if (framework) {
      audits = audits.filter(a => a.framework === framework);
    }

    return audits;
  }

  /**
   * Update audit
   */
  updateAudit(auditId: string, updates: Partial<Audit>): void {
    const audit = this.audits.get(auditId);
    if (audit) {
      Object.assign(audit, updates);
      logger.debug('Audit updated', { auditId });
    }
  }

  /**
   * Complete audit
   */
  completeAudit(auditId: string): void {
    const audit = this.audits.get(auditId);
    if (audit) {
      audit.status = 'completed';
      audit.endDate = Date.now();
      logger.info('Audit completed', { auditId });
    }
  }

  /**
   * Get audit history
   */
  getAuditHistory(framework: ComplianceFramework, limit?: number): Audit[] {
    return this.listAudits(undefined, framework)
      .sort((a, b) => b.startDate - a.startDate)
      .slice(0, limit || 10);
  }
}

// ==================== FINDING MANAGER ====================

export class FindingManager {
  private findings = new Map<string, AuditFinding>();
  private findingCount = 0;

  /**
   * Record finding
   */
  recordFinding(finding: Omit<AuditFinding, 'id' | 'createdAt'>): AuditFinding {
    const id = 'finding-' + Date.now() + '-' + this.findingCount++;

    const newFinding: AuditFinding = {
      ...finding,
      id,
      createdAt: Date.now()
    };

    this.findings.set(id, newFinding);
    logger.info('Finding recorded', { findingId: id, severity: finding.severity, auditId: finding.auditId });

    return newFinding;
  }

  /**
   * Get finding
   */
  getFinding(findingId: string): AuditFinding | null {
    return this.findings.get(findingId) || null;
  }

  /**
   * Get audit findings
   */
  getAuditFindings(auditId: string): AuditFinding[] {
    return Array.from(this.findings.values()).filter(f => f.auditId === auditId);
  }

  /**
   * Update finding
   */
  updateFinding(findingId: string, updates: Partial<AuditFinding>): void {
    const finding = this.findings.get(findingId);
    if (finding) {
      Object.assign(finding, updates);
      logger.debug('Finding updated', { findingId });
    }
  }

  /**
   * Remediate finding
   */
  remediateFinding(findingId: string, remediationDetails: string): void {
    const finding = this.findings.get(findingId);
    if (finding) {
      finding.status = 'remediated';
      finding.remediation = remediationDetails;
      logger.info('Finding remediated', { findingId });
    }
  }

  /**
   * Get open findings
   */
  getOpenFindings(severity?: FindingSeverity): AuditFinding[] {
    let findings = Array.from(this.findings.values()).filter(f => f.status === 'open');

    if (severity) {
      findings = findings.filter(f => f.severity === severity);
    }

    return findings;
  }
}

// ==================== CHECKLIST MANAGER ====================

export class ChecklistManager {
  private checklists = new Map<string, ComplianceChecklist>();
  private checklistCount = 0;

  /**
   * Create checklist
   */
  createChecklist(checklist: Omit<ComplianceChecklist, 'id' | 'createdAt'>): ComplianceChecklist {
    const id = 'checklist-' + Date.now() + '-' + this.checklistCount++;

    const newChecklist: ComplianceChecklist = {
      ...checklist,
      id,
      createdAt: Date.now()
    };

    this.checklists.set(id, newChecklist);
    logger.info('Checklist created', { checklistId: id, framework: checklist.framework });

    return newChecklist;
  }

  /**
   * Get checklist
   */
  getChecklist(checklistId: string): ComplianceChecklist | null {
    return this.checklists.get(checklistId) || null;
  }

  /**
   * List checklists
   */
  listChecklists(framework?: ComplianceFramework): ComplianceChecklist[] {
    let checklists = Array.from(this.checklists.values());

    if (framework) {
      checklists = checklists.filter(c => c.framework === framework);
    }

    return checklists;
  }

  /**
   * Update checklist item
   */
  updateChecklistItem(checklistId: string, itemId: string, completed: boolean): void {
    const checklist = this.checklists.get(checklistId);
    if (checklist) {
      const item = checklist.items.find(i => i.id === itemId);
      if (item) {
        item.completed = completed;
        if (completed) {
          item.completedDate = Date.now();
        }
        logger.debug('Checklist item updated', { checklistId, itemId });
      }
    }
  }

  /**
   * Get checklist progress
   */
  getChecklistProgress(checklistId: string): { completed: number; total: number; percentage: number } {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = checklist.items.filter(i => i.completed).length;
    const total = checklist.items.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage: Math.round(percentage) };
  }
}

// ==================== EXPORTS ====================

export const complianceManager = new ComplianceManager();
export const auditManager = new AuditManager();
export const findingManager = new FindingManager();
export const checklistManager = new ChecklistManager();
