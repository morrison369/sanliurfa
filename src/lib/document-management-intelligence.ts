/**
 * Phase 283: Document & Records Management Intelligence
 * Document lifecycle, retention policies, access analytics, compliance tracking
 */

import { logger } from './logger';

interface DocumentRecord {
  documentId: string;
  title: string;
  documentType: 'policy' | 'contract' | 'report' | 'procedure' | 'form' | 'specification' | 'correspondence';
  ownerId: string;
  department: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'archived' | 'expired' | 'superseded';
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionYears: number;
  expiryDate?: number;
  tags: string[];
  accessCount: number;
  lastAccessedAt?: number;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

interface RetentionPolicyRecord {
  policyId: string;
  policyName: string;
  documentType: string;
  department: string;
  retentionYears: number;
  legalBasis: string;
  disposalMethod: 'delete' | 'archive' | 'shred' | 'transfer';
  reviewFrequencyYears: number;
  appliesTo: string[];
  status: 'active' | 'pending_review' | 'superseded';
  createdAt: number;
}

interface DocumentAccessRecord {
  recordId: string;
  period: string;
  totalDocuments: number;
  activeDocuments: number;
  totalAccessEvents: number;
  uniqueUsers: number;
  avgAccessesPerDoc: number;
  staleDocumentCount: number;     // not accessed in 90+ days
  expiringDocumentCount: number;  // expiring in 30 days
  complianceScore: number;        // 0-100
  calculatedAt: number;
}

interface DocumentComplianceRecord {
  recordId: string;
  auditPeriod: string;
  totalDocumentsAudited: number;
  documentsWithPolicy: number;
  expiredDocumentsRetained: number;
  unauthorizedAccessCount: number;
  misclassifiedCount: number;
  complianceRatePct: number;
  riskLevel: 'low' | 'medium' | 'high';
  findings: string[];
  auditedAt: number;
}

class DocumentLifecycleManager {
  private documents: Map<string, DocumentRecord> = new Map();
  private counter = 0;

  create(title: string, type: DocumentRecord['documentType'], ownerId: string, department: string, confidentiality: DocumentRecord['confidentiality'], retentionYears: number, tags: string[]): DocumentRecord {
    const documentId = `doc-${Date.now()}-${++this.counter}`;
    const expiryDate = Date.now() + retentionYears * 365 * 86400000;
    const document: DocumentRecord = {
      documentId, title, documentType: type, ownerId, department, version: '1.0',
      status: 'draft', confidentiality, retentionYears, expiryDate, tags,
      accessCount: 0, sizeBytes: 0, createdAt: Date.now(), updatedAt: Date.now()
    };
    this.documents.set(documentId, document);
    logger.debug('Document created', { documentId, title, type, confidentiality });
    return document;
  }

  approve(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;
    doc.status = 'approved';
    doc.updatedAt = Date.now();
    return true;
  }

  recordAccess(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;
    doc.accessCount++;
    doc.lastAccessedAt = Date.now();
    return true;
  }

  getExpiringDocuments(days = 30): DocumentRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.documents.values())
      .filter(d => d.status === 'approved' && d.expiryDate && d.expiryDate <= horizon)
      .sort((a, b) => (a.expiryDate || 0) - (b.expiryDate || 0));
  }

  getStaleDocuments(days = 90): DocumentRecord[] {
    const threshold = Date.now() - days * 86400000;
    return Array.from(this.documents.values())
      .filter(d => d.status === 'approved' && (!d.lastAccessedAt || d.lastAccessedAt < threshold));
  }

  getByDepartment(department: string): DocumentRecord[] {
    return Array.from(this.documents.values()).filter(d => d.department === department);
  }

  getDocument(documentId: string): DocumentRecord | undefined {
    return this.documents.get(documentId);
  }
}

class RetentionPolicyEngine {
  private policies: Map<string, RetentionPolicyRecord> = new Map();
  private counter = 0;

  create(name: string, docType: string, department: string, retentionYears: number, legalBasis: string, disposalMethod: RetentionPolicyRecord['disposalMethod']): RetentionPolicyRecord {
    const policyId = `retpol-${Date.now()}-${++this.counter}`;
    const policy: RetentionPolicyRecord = {
      policyId, policyName: name, documentType: docType, department, retentionYears,
      legalBasis, disposalMethod, reviewFrequencyYears: 3, appliesTo: [docType],
      status: 'active', createdAt: Date.now()
    };
    this.policies.set(policyId, policy);
    return policy;
  }

  getForDocument(docType: string, department: string): RetentionPolicyRecord | undefined {
    return Array.from(this.policies.values()).find(p =>
      p.status === 'active' && p.documentType === docType && p.department === department
    );
  }

  getPoliciesForReview(): RetentionPolicyRecord[] {
    const reviewThreshold = Date.now() - 3 * 365 * 86400000;
    return Array.from(this.policies.values())
      .filter(p => p.status === 'active' && p.createdAt < reviewThreshold);
  }

  getAll(): RetentionPolicyRecord[] {
    return Array.from(this.policies.values()).filter(p => p.status === 'active');
  }
}

class DocumentAccessAnalyzer {
  private records: DocumentAccessRecord[] = [];
  private counter = 0;

  analyze(period: string, documents: DocumentRecord[]): DocumentAccessRecord {
    const active = documents.filter(d => d.status === 'approved');
    const totalAccess = documents.reduce((s, d) => s + d.accessCount, 0);
    const stale = documents.filter(d => {
      const threshold = Date.now() - 90 * 86400000;
      return d.status === 'approved' && (!d.lastAccessedAt || d.lastAccessedAt < threshold);
    }).length;
    const expiring = documents.filter(d => {
      const horizon = Date.now() + 30 * 86400000;
      return d.status === 'approved' && d.expiryDate && d.expiryDate <= horizon;
    }).length;
    const complianceScore = Math.max(0, 100 - stale * 2 - expiring * 5);

    const recordId = `docaccess-${Date.now()}-${++this.counter}`;
    const record: DocumentAccessRecord = {
      recordId, period, totalDocuments: documents.length, activeDocuments: active.length,
      totalAccessEvents: totalAccess, uniqueUsers: Math.ceil(totalAccess * 0.3),
      avgAccessesPerDoc: active.length > 0 ? totalAccess / active.length : 0,
      staleDocumentCount: stale, expiringDocumentCount: expiring,
      complianceScore: Math.min(100, complianceScore), calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): DocumentAccessRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getComplianceTrend(): number[] {
    return this.records.map(r => r.complianceScore);
  }
}

class DocumentComplianceAuditor {
  private audits: DocumentComplianceRecord[] = [];
  private counter = 0;

  audit(period: string, documentsAudited: number, withPolicy: number, expiredRetained: number, unauthorizedAccess: number, misclassified: number, findings: string[]): DocumentComplianceRecord {
    const complianceRate = documentsAudited > 0
      ? ((documentsAudited - expiredRetained - misclassified) / documentsAudited) * 100 : 0;
    const riskLevel: DocumentComplianceRecord['riskLevel'] =
      complianceRate >= 90 && unauthorizedAccess === 0 ? 'low' :
      complianceRate >= 75 ? 'medium' : 'high';

    const recordId = `docaudit-${Date.now()}-${++this.counter}`;
    const record: DocumentComplianceRecord = {
      recordId, auditPeriod: period, totalDocumentsAudited: documentsAudited,
      documentsWithPolicy: withPolicy, expiredDocumentsRetained: expiredRetained,
      unauthorizedAccessCount: unauthorizedAccess, misclassifiedCount: misclassified,
      complianceRatePct: Math.max(0, complianceRate), riskLevel, findings, auditedAt: Date.now()
    };
    this.audits.push(record);
    logger.debug('Document compliance audit completed', { period, complianceRate, riskLevel });
    return record;
  }

  getLatest(): DocumentComplianceRecord | undefined {
    return this.audits[this.audits.length - 1];
  }

  getHighRiskAudits(): DocumentComplianceRecord[] {
    return this.audits.filter(a => a.riskLevel === 'high');
  }
}

export const documentLifecycleManager = new DocumentLifecycleManager();
export const retentionPolicyEngine = new RetentionPolicyEngine();
export const documentAccessAnalyzer = new DocumentAccessAnalyzer();
export const documentComplianceAuditor = new DocumentComplianceAuditor();

export { DocumentRecord, RetentionPolicyRecord, DocumentAccessRecord, DocumentComplianceRecord };
