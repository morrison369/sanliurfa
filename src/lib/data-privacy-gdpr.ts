/**
 * Phase 79: Data Privacy & GDPR
 * Data privacy policies, consent management, data subject rights, GDPR compliance
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ConsentType = 'marketing' | 'analytics' | 'profiling' | 'third_party_sharing' | 'processing';
export type DataProcessingBasis = 'consent' | 'contract' | 'legal_obligation' | 'vital_interest' | 'public_task' | 'legitimate_interest';
export type RequestType = 'access' | 'rectification' | 'erasure' | 'restrict_processing' | 'data_portability' | 'object';
export type RequestStatus = 'received' | 'acknowledged' | 'in_progress' | 'completed' | 'denied';

export interface PrivacyPolicy {
  id: string;
  version: number;
  effectiveDate: number;
  content: string;
  categories: string[];
  lastReviewDate: number;
  nextReviewDate: number;
  createdAt: number;
}

export interface Consent {
  id: string;
  dataSubjectId: string;
  type: ConsentType;
  given: boolean;
  givenDate?: number;
  basis: DataProcessingBasis;
  expiryDate?: number;
  status: 'active' | 'withdrawn' | 'expired';
  createdAt: number;
}

export interface DataSubjectRequest {
  id: string;
  subjectId: string;
  type: RequestType;
  description: string;
  status: RequestStatus;
  submittedDate: number;
  dueDate: number;
  completedDate?: number;
  handledBy?: string;
  createdAt: number;
}

export interface ProcessingActivity {
  id: string;
  name: string;
  description: string;
  basis: DataProcessingBasis;
  categories: string[];
  recipients: string[];
  retentionPeriod: number;
  status: 'active' | 'archived';
  createdAt: number;
}

// ==================== PRIVACY POLICY MANAGER ====================

export class PrivacyPolicyManager {
  private policies: PrivacyPolicy[] = [];
  private policyCount = 0;

  /**
   * Create policy
   */
  createPolicy(policy: Omit<PrivacyPolicy, 'id' | 'createdAt'>): PrivacyPolicy {
    const id = 'policy-' + Date.now() + '-' + this.policyCount++;

    const newPolicy: PrivacyPolicy = {
      ...policy,
      id,
      createdAt: Date.now()
    };

    this.policies.push(newPolicy);
    logger.info('Privacy policy created', { policyId: id, version: policy.version });

    return newPolicy;
  }

  /**
   * Get policy
   */
  getPolicy(policyId: string): PrivacyPolicy | null {
    return this.policies.find(p => p.id === policyId) || null;
  }

  /**
   * Get current policy
   */
  getCurrentPolicy(): PrivacyPolicy | null {
    return this.policies.length > 0 ? this.policies[this.policies.length - 1] : null;
  }

  /**
   * Update policy
   */
  updatePolicy(policyId: string, updates: Partial<PrivacyPolicy>): void {
    const policy = this.getPolicy(policyId);
    if (policy) {
      Object.assign(policy, updates);
      logger.debug('Policy updated', { policyId });
    }
  }

  /**
   * Publish policy
   */
  publishPolicy(policyId: string): void {
    const policy = this.getPolicy(policyId);
    if (policy) {
      logger.info('Policy published', { policyId, effectiveDate: policy.effectiveDate });
    }
  }

  /**
   * Get policy history
   */
  getPolicyHistory(): PrivacyPolicy[] {
    return this.policies.slice().reverse();
  }
}

// ==================== CONSENT MANAGER ====================

export class ConsentManager {
  private consents = new Map<string, Consent>();
  private consentCount = 0;

  /**
   * Record consent
   */
  recordConsent(consent: Omit<Consent, 'id' | 'createdAt'>): Consent {
    const id = 'consent-' + Date.now() + '-' + this.consentCount++;

    const newConsent: Consent = {
      ...consent,
      id,
      createdAt: Date.now()
    };

    this.consents.set(id, newConsent);
    logger.info('Consent recorded', { consentId: id, dataSubjectId: consent.dataSubjectId, type: consent.type });

    return newConsent;
  }

  /**
   * Get consent
   */
  getConsent(consentId: string): Consent | null {
    return this.consents.get(consentId) || null;
  }

  /**
   * Get subject consents
   */
  getSubjectConsents(subjectId: string, type?: ConsentType): Consent[] {
    let consents = Array.from(this.consents.values()).filter(c => c.dataSubjectId === subjectId);

    if (type) {
      consents = consents.filter(c => c.type === type);
    }

    return consents;
  }

  /**
   * Withdraw consent
   */
  withdrawConsent(consentId: string): void {
    const consent = this.consents.get(consentId);
    if (consent) {
      consent.status = 'withdrawn';
      logger.info('Consent withdrawn', { consentId });
    }
  }

  /**
   * Check consent
   */
  checkConsent(subjectId: string, type: ConsentType): boolean {
    const consent = this.getSubjectConsents(subjectId, type).find(
      c => c.status === 'active' && (!c.expiryDate || c.expiryDate > Date.now())
    );
    return !!consent && consent.given;
  }

  /**
   * Get consent status
   */
  getConsentStatus(subjectId: string): Record<ConsentType, boolean> {
    const types: ConsentType[] = ['marketing', 'analytics', 'profiling', 'third_party_sharing', 'processing'];
    const status: Record<ConsentType, boolean> = {} as Record<ConsentType, boolean>;

    types.forEach(type => {
      status[type] = this.checkConsent(subjectId, type);
    });

    return status;
  }
}

// ==================== DATA SUBJECT REQUEST MANAGER ====================

export class DataSubjectRequestManager {
  private requests = new Map<string, DataSubjectRequest>();
  private requestCount = 0;

  /**
   * Create request
   */
  createRequest(request: Omit<DataSubjectRequest, 'id' | 'createdAt'>): DataSubjectRequest {
    const id = 'dsar-' + Date.now() + '-' + this.requestCount++;

    const newRequest: DataSubjectRequest = {
      ...request,
      id,
      createdAt: Date.now()
    };

    this.requests.set(id, newRequest);
    logger.info('Data subject request created', { requestId: id, type: request.type, subjectId: request.subjectId });

    return newRequest;
  }

  /**
   * Get request
   */
  getRequest(requestId: string): DataSubjectRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * List requests
   */
  listRequests(status?: RequestStatus, type?: RequestType): DataSubjectRequest[] {
    let requests = Array.from(this.requests.values());

    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    if (type) {
      requests = requests.filter(r => r.type === type);
    }

    return requests;
  }

  /**
   * Update request
   */
  updateRequest(requestId: string, updates: Partial<DataSubjectRequest>): void {
    const request = this.requests.get(requestId);
    if (request) {
      Object.assign(request, updates);
      logger.debug('Request updated', { requestId });
    }
  }

  /**
   * Complete request
   */
  completeRequest(requestId: string): void {
    const request = this.requests.get(requestId);
    if (request) {
      request.status = 'completed';
      request.completedDate = Date.now();
      logger.info('Request completed', { requestId });
    }
  }

  /**
   * Get overdue requests
   */
  getOverdueRequests(): DataSubjectRequest[] {
    const now = Date.now();
    return this.listRequests().filter(r => r.dueDate < now && r.status !== 'completed');
  }
}

// ==================== PROCESSING ACTIVITY MANAGER ====================

export class ProcessingActivityManager {
  private activities = new Map<string, ProcessingActivity>();
  private activityCount = 0;

  /**
   * Record activity
   */
  recordActivity(activity: Omit<ProcessingActivity, 'id' | 'createdAt'>): ProcessingActivity {
    const id = 'activity-' + Date.now() + '-' + this.activityCount++;

    const newActivity: ProcessingActivity = {
      ...activity,
      id,
      createdAt: Date.now()
    };

    this.activities.set(id, newActivity);
    logger.info('Processing activity recorded', { activityId: id, name: activity.name });

    return newActivity;
  }

  /**
   * Get activity
   */
  getActivity(activityId: string): ProcessingActivity | null {
    return this.activities.get(activityId) || null;
  }

  /**
   * List activities
   */
  listActivities(status?: string): ProcessingActivity[] {
    let activities = Array.from(this.activities.values());

    if (status) {
      activities = activities.filter(a => a.status === status);
    }

    return activities;
  }

  /**
   * Update activity
   */
  updateActivity(activityId: string, updates: Partial<ProcessingActivity>): void {
    const activity = this.activities.get(activityId);
    if (activity) {
      Object.assign(activity, updates);
      logger.debug('Activity updated', { activityId });
    }
  }

  /**
   * Get data inventory
   */
  getDataInventory(): Record<string, ProcessingActivity[]> {
    const inventory: Record<string, ProcessingActivity[]> = {};

    Array.from(this.activities.values()).forEach(activity => {
      activity.categories.forEach(cat => {
        if (!inventory[cat]) {
          inventory[cat] = [];
        }
        inventory[cat].push(activity);
      });
    });

    return inventory;
  }
}

// ==================== EXPORTS ====================

export const privacyPolicyManager = new PrivacyPolicyManager();
export const consentManager = new ConsentManager();
export const dataSubjectRequestManager = new DataSubjectRequestManager();
export const processingActivityManager = new ProcessingActivityManager();
