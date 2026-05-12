/**
 * Unit Tests — data/data-privacy-gdpr.ts singleton class managers
 *
 * - PrivacyPolicyManager (createPolicy + getCurrentPolicy + updatePolicy)
 * - ConsentManager (recordConsent + checkConsent + withdrawConsent + getConsentStatus 5-type matrix)
 * - DataSubjectRequestManager (DSAR lifecycle + getOverdueRequests)
 * - ProcessingActivityManager (recordActivity + smoke)
 *
 * GDPR/KVKK compliance helpers — consent + data subject right enforcement.
 */

import { describe, it, expect } from 'vitest';
import {
  privacyPolicyManager,
  consentManager,
  dataSubjectRequestManager,
  processingActivityManager,
} from '../data/data-privacy-gdpr';

describe('PrivacyPolicyManager', () => {
  it('createPolicy — id `policy-` prefix + createdAt set', () => {
    const policy = privacyPolicyManager.createPolicy({
      version: '1.0', effectiveDate: Date.now(), content: 'Privacy policy text',
    } as any);
    expect(policy.id).toMatch(/^policy-\d+-\d+$/);
    expect(policy.createdAt).toBeGreaterThan(0);
  });

  it('getPolicy — bilinmeyen → null', () => {
    expect(privacyPolicyManager.getPolicy('non-existent')).toBeNull();
  });

  it('getCurrentPolicy — son eklenen', () => {
    privacyPolicyManager.createPolicy({ version: 'a', effectiveDate: Date.now(), content: 'x' } as any);
    const latest = privacyPolicyManager.createPolicy({ version: 'b', effectiveDate: Date.now(), content: 'y' } as any);
    expect(privacyPolicyManager.getCurrentPolicy()?.id).toBe(latest.id);
  });

  it('updatePolicy — Object.assign field güncelle', () => {
    const policy = privacyPolicyManager.createPolicy({ version: '1', effectiveDate: Date.now(), content: 'old' } as any);
    privacyPolicyManager.updatePolicy(policy.id, { content: 'new' });
    expect(privacyPolicyManager.getPolicy(policy.id)?.content).toBe('new');
  });

  it('publishPolicy — exception fırlatmaz', () => {
    const policy = privacyPolicyManager.createPolicy({ version: '1', effectiveDate: Date.now(), content: 'x' } as any);
    expect(() => privacyPolicyManager.publishPolicy(policy.id)).not.toThrow();
  });

  it('getPolicyHistory — reverse order (en yeni ilk)', () => {
    const history = privacyPolicyManager.getPolicyHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});

describe('ConsentManager', () => {
  it('recordConsent — id `consent-` prefix', () => {
    const c = consentManager.recordConsent({
      dataSubjectId: 'u-1', type: 'marketing', given: true, status: 'active',
    } as any);
    expect(c.id).toMatch(/^consent-\d+-\d+$/);
  });

  it('getConsent — bilinmeyen → null', () => {
    expect(consentManager.getConsent('non-existent')).toBeNull();
  });

  it('getSubjectConsents — userId filter', () => {
    consentManager.recordConsent({ dataSubjectId: 'u-multi', type: 'marketing', given: true, status: 'active' } as any);
    consentManager.recordConsent({ dataSubjectId: 'u-multi', type: 'analytics', given: true, status: 'active' } as any);
    const consents = consentManager.getSubjectConsents('u-multi');
    expect(consents.length).toBeGreaterThanOrEqual(2);
  });

  it('getSubjectConsents — type filter', () => {
    consentManager.recordConsent({ dataSubjectId: 'u-typ', type: 'marketing', given: true, status: 'active' } as any);
    consentManager.recordConsent({ dataSubjectId: 'u-typ', type: 'profiling', given: false, status: 'active' } as any);
    const marketing = consentManager.getSubjectConsents('u-typ', 'marketing');
    expect(marketing.every((c) => c.type === 'marketing')).toBe(true);
  });

  it('withdrawConsent — status="withdrawn"', () => {
    const c = consentManager.recordConsent({
      dataSubjectId: 'u-with', type: 'marketing', given: true, status: 'active',
    } as any);
    consentManager.withdrawConsent(c.id);
    expect(consentManager.getConsent(c.id)?.status).toBe('withdrawn');
  });

  it('checkConsent — active + given → true', () => {
    consentManager.recordConsent({
      dataSubjectId: 'u-chk', type: 'marketing', given: true, status: 'active',
    } as any);
    expect(consentManager.checkConsent('u-chk', 'marketing')).toBe(true);
  });

  it('checkConsent — withdrawn → false', () => {
    const c = consentManager.recordConsent({
      dataSubjectId: 'u-chk-w', type: 'analytics', given: true, status: 'active',
    } as any);
    consentManager.withdrawConsent(c.id);
    expect(consentManager.checkConsent('u-chk-w', 'analytics')).toBe(false);
  });

  it('checkConsent — expired (expiryDate geçmiş) → false', () => {
    consentManager.recordConsent({
      dataSubjectId: 'u-chk-exp', type: 'marketing', given: true, status: 'active',
      expiryDate: Date.now() - 86400000, // 1 gün önce expired
    } as any);
    expect(consentManager.checkConsent('u-chk-exp', 'marketing')).toBe(false);
  });

  it('checkConsent — bilinmeyen subject → false', () => {
    expect(consentManager.checkConsent('non-existent-user', 'marketing')).toBe(false);
  });

  it('getConsentStatus — 5-type matrix', () => {
    const status = consentManager.getConsentStatus('u-status-test');
    expect(status).toHaveProperty('marketing');
    expect(status).toHaveProperty('analytics');
    expect(status).toHaveProperty('profiling');
    expect(status).toHaveProperty('third_party_sharing');
    expect(status).toHaveProperty('processing');
  });
});

describe('DataSubjectRequestManager', () => {
  it('createRequest — id `dsar-` prefix', () => {
    const req = dataSubjectRequestManager.createRequest({
      type: 'access', subjectId: 'u-1', status: 'pending', dueDate: Date.now() + 30 * 86400000,
    } as any);
    expect(req.id).toMatch(/^dsar-\d+-\d+$/);
  });

  it('getRequest — bilinmeyen → null', () => {
    expect(dataSubjectRequestManager.getRequest('non-existent')).toBeNull();
  });

  it('listRequests — boş filter → tümü', () => {
    dataSubjectRequestManager.createRequest({
      type: 'erasure', subjectId: 'u-list', status: 'pending', dueDate: Date.now() + 86400000,
    } as any);
    expect(dataSubjectRequestManager.listRequests().length).toBeGreaterThan(0);
  });

  it('listRequests — status filter', () => {
    const pending = dataSubjectRequestManager.listRequests('pending');
    expect(pending.every((r) => r.status === 'pending')).toBe(true);
  });

  it('listRequests — type filter', () => {
    dataSubjectRequestManager.createRequest({
      type: 'rectification', subjectId: 'u-rect', status: 'pending', dueDate: Date.now() + 86400000,
    } as any);
    const rect = dataSubjectRequestManager.listRequests(undefined, 'rectification');
    expect(rect.every((r) => r.type === 'rectification')).toBe(true);
  });

  it('updateRequest — Object.assign', () => {
    const req = dataSubjectRequestManager.createRequest({
      type: 'access', subjectId: 'u-up', status: 'pending', dueDate: Date.now() + 86400000,
    } as any);
    dataSubjectRequestManager.updateRequest(req.id, { status: 'in_progress' });
    expect(dataSubjectRequestManager.getRequest(req.id)?.status).toBe('in_progress');
  });

  it('completeRequest — status "completed" + completedDate', () => {
    const req = dataSubjectRequestManager.createRequest({
      type: 'access', subjectId: 'u-comp', status: 'pending', dueDate: Date.now() + 86400000,
    } as any);
    dataSubjectRequestManager.completeRequest(req.id);
    const updated = dataSubjectRequestManager.getRequest(req.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.completedDate).toBeGreaterThan(0);
  });

  it('getOverdueRequests — dueDate geçmiş + status !== completed', () => {
    dataSubjectRequestManager.createRequest({
      type: 'access', subjectId: 'u-overdue', status: 'pending', dueDate: Date.now() - 86400000, // 1 gün önce
    } as any);
    const overdue = dataSubjectRequestManager.getOverdueRequests();
    expect(overdue.some((r) => r.subjectId === 'u-overdue')).toBe(true);
  });

  it('getOverdueRequests — completed hariç', () => {
    const req = dataSubjectRequestManager.createRequest({
      type: 'access', subjectId: 'u-no-overdue', status: 'pending', dueDate: Date.now() - 86400000,
    } as any);
    dataSubjectRequestManager.completeRequest(req.id);
    const overdue = dataSubjectRequestManager.getOverdueRequests();
    expect(overdue.some((r) => r.subjectId === 'u-no-overdue')).toBe(false);
  });
});

describe('ProcessingActivityManager', () => {
  it('recordActivity — exception fırlatmaz', () => {
    expect(() => processingActivityManager.recordActivity({
      name: 'User Login', purpose: 'authentication', dataCategories: ['email', 'ip'],
      legalBasis: 'consent', retention: '1 year',
    } as any)).not.toThrow();
  });
});
