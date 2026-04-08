/**
 * Phase 14: Security & Compliance
 * Audit logging, GDPR compliance, data retention, encryption, penetration testing
 */

import { logger } from './logging';
import { createHmac } from 'crypto';

// ==================== AUDIT LOGGING ====================

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, { before: any; after: any }>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  failureReason?: string;
}

/**
 * Audit logger for compliance and security
 */
export class AuditLogger {
  private logs: AuditLog[] = [];
  private readonly maxLogs = 100000;
  private readonly logToFile = true;

  /**
   * Log audit event
   */
  logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    options?: {
      changes?: Record<string, { before: any; after: any }>;
      ipAddress?: string;
      userAgent?: string;
      status?: 'success' | 'failure';
      failureReason?: string;
    }
  ): AuditLog {
    const log: AuditLog = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId,
      action,
      resource,
      resourceId,
      changes: options?.changes || {},
      ipAddress: options?.ipAddress || 'unknown',
      userAgent: options?.userAgent || 'unknown',
      status: options?.status || 'success',
      failureReason: options?.failureReason
    };

    this.logs.push(log);

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to file
    if (this.logToFile) {
      logger.info('Audit event', {
        action,
        resource,
        userId,
        status: log.status
      });
    }

    return log;
  }

  /**
   * Query audit logs
   */
  queryLogs(options: {
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): AuditLog[] {
    let results = [...this.logs];

    if (options.userId) {
      results = results.filter(l => l.userId === options.userId);
    }

    if (options.resource) {
      results = results.filter(l => l.resource === options.resource);
    }

    if (options.action) {
      results = results.filter(l => l.action === options.action);
    }

    if (options.startDate) {
      results = results.filter(l => l.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      results = results.filter(l => l.timestamp <= options.endDate!);
    }

    return results.slice(0, options.limit || 100);
  }

  /**
   * Get audit trail for resource
   */
  getResourceHistory(resourceId: string): AuditLog[] {
    return this.logs.filter(l => l.resourceId === resourceId);
  }
}

// ==================== GDPR COMPLIANCE ====================

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'data_processing' | 'cookies';
  granted: boolean;
  grantedAt: number;
  expiresAt?: number; // Auto-expire consent every 12 months
  source: 'ui' | 'email' | 'api';
}

/**
 * GDPR consent management
 */
export class GDPRManager {
  private consentRecords = new Map<string, ConsentRecord[]>();
  private dataExportRequests = new Map<string, { requestedAt: number; status: 'pending' | 'completed' }>();
  private dataDeleteRequests = new Map<string, { requestedAt: number; status: 'pending' | 'deleted' }>();

  /**
   * Record consent
   */
  recordConsent(
    userId: string,
    consentType: 'marketing' | 'analytics' | 'data_processing' | 'cookies',
    granted: boolean,
    source: 'ui' | 'email' | 'api' = 'ui'
  ): ConsentRecord {
    const consent: ConsentRecord = {
      userId,
      consentType,
      granted,
      grantedAt: Date.now(),
      expiresAt: Date.now() + 12 * 30 * 24 * 60 * 60 * 1000, // 12 months
      source
    };

    if (!this.consentRecords.has(userId)) {
      this.consentRecords.set(userId, []);
    }

    this.consentRecords.get(userId)!.push(consent);

    return consent;
  }

  /**
   * Check if user has given consent
   */
  hasConsent(userId: string, consentType: string): boolean {
    const consents = this.consentRecords.get(userId) || [];
    const latestConsent = consents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => b.grantedAt - a.grantedAt)[0];

    if (!latestConsent) return false;

    // Check if expired
    if (latestConsent.expiresAt && latestConsent.expiresAt < Date.now()) {
      return false;
    }

    return latestConsent.granted;
  }

  /**
   * Request data export (GDPR right to data portability)
   */
  requestDataExport(userId: string): { requestId: string; status: string } {
    const requestId = `EXPORT-${userId}-${Date.now()}`;
    this.dataExportRequests.set(userId, {
      requestedAt: Date.now(),
      status: 'pending'
    });

    logger.info('Data export request received', { userId, requestId });

    return { requestId, status: 'pending' };
  }

  /**
   * Request data deletion (GDPR right to be forgotten)
   */
  requestDataDeletion(userId: string): { requestId: string; delayDays: number } {
    const requestId = `DELETE-${userId}-${Date.now()}`;
    this.dataDeleteRequests.set(userId, {
      requestedAt: Date.now(),
      status: 'pending'
    });

    const delayDays = 30; // 30-day grace period for user to cancel

    logger.warn('Data deletion request received', { userId, requestId, delayDays });

    return { requestId, delayDays };
  }

  /**
   * Get all consent records for user
   */
  getUserConsent(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }
}

// ==================== DATA RETENTION POLICY ====================

export interface DataRetentionRule {
  dataType: string;
  retentionDays: number;
  anonymizeAfter?: number; // Days before anonymization
  deleteAfter: number;
}

export const DATA_RETENTION_POLICY: DataRetentionRule[] = [
  {
    dataType: 'user_activity_logs',
    retentionDays: 90,
    anonymizeAfter: 30,
    deleteAfter: 90
  },
  {
    dataType: 'payment_transactions',
    retentionDays: 2555, // 7 years for tax compliance
    deleteAfter: 2555
  },
  {
    dataType: 'user_profile',
    retentionDays: 365,
    deleteAfter: 365
  },
  {
    dataType: 'temporary_files',
    retentionDays: 1,
    deleteAfter: 1
  },
  {
    dataType: 'error_logs',
    retentionDays: 30,
    deleteAfter: 30
  }
];

/**
 * Enforce data retention policy
 */
export class DataRetentionManager {
  /**
   * Get retention rule for data type
   */
  getRetentionRule(dataType: string): DataRetentionRule | undefined {
    return DATA_RETENTION_POLICY.find(r => r.dataType === dataType);
  }

  /**
   * Check if data should be deleted
   */
  shouldDelete(dataType: string, createdAt: number): boolean {
    const rule = this.getRetentionRule(dataType);
    if (!rule) return false;

    const ageInDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
    return ageInDays > rule.deleteAfter;
  }

  /**
   * Check if data should be anonymized
   */
  shouldAnonymize(dataType: string, createdAt: number): boolean {
    const rule = this.getRetentionRule(dataType);
    if (!rule || !rule.anonymizeAfter) return false;

    const ageInDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
    return ageInDays > rule.anonymizeAfter;
  }
}

// ==================== ENCRYPTION UTILITIES ====================

/**
 * Encryption at rest helper
 */
export class EncryptionManager {
  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string, encryptionKey: string): string {
    // Simplified - use full AES-256-GCM in production
    const hmac = createHmac('sha256', encryptionKey);
    hmac.update(data);
    return Buffer.from(data).toString('base64') + '.' + hmac.digest('hex');
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encrypted: string, encryptionKey: string): string | null {
    try {
      const [encodedData, hash] = encrypted.split('.');
      const hmac = createHmac('sha256', encryptionKey);
      const data = Buffer.from(encodedData, 'base64').toString('utf-8');

      hmac.update(data);
      const expectedHash = hmac.digest('hex');

      if (hash !== expectedHash) {
        return null; // Integrity check failed
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data: string, salt: string): string {
    const hmac = createHmac('sha256', salt);
    hmac.update(data);
    return hmac.digest('hex');
  }
}

// ==================== PENETRATION TESTING HOOKS ====================

export interface PenetrationTest {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  results?: { vulnerabilitiesFound: number; details: string[] };
}

/**
 * Penetration testing framework hooks
 */
export class PenetrationTestHooks {
  private tests: PenetrationTest[] = [];

  /**
   * Register penetration test
   */
  registerTest(name: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.tests.push({
      name,
      description,
      severity,
      status: 'scheduled'
    });
  }

  /**
   * Start penetration test
   */
  startTest(testName: string): void {
    const test = this.tests.find(t => t.name === testName);
    if (test) {
      test.status = 'running';
      logger.warn('Penetration test started', { testName });
    }
  }

  /**
   * Report test results
   */
  reportResults(testName: string, vulnerabilitiesFound: number, details: string[]): void {
    const test = this.tests.find(t => t.name === testName);
    if (test) {
      test.status = 'completed';
      test.results = { vulnerabilitiesFound, details };

      if (vulnerabilitiesFound > 0) {
        logger.error('Penetration test found vulnerabilities', {
          testName,
          count: vulnerabilitiesFound
        });
      }
    }
  }

  /**
   * Get all test results
   */
  getResults(): PenetrationTest[] {
    return this.tests;
  }
}

// ==================== EXPORTS ====================

export const auditLogger = new AuditLogger();
export const gdprManager = new GDPRManager();
export const dataRetentionManager = new DataRetentionManager();
export const penetrationTestHooks = new PenetrationTestHooks();
