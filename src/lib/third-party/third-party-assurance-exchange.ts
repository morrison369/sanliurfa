/**
 * Phase 187: Third-Party Assurance Exchange
 */

import { logger } from '../logger';

export interface VendorAssuranceProfile {
  vendorId: string;
  name: string;
  trustTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastAssessmentAt: number;
}

class VendorAssuranceRegistry {
  private vendors = new Map<string, VendorAssuranceProfile>();

  upsert(profile: VendorAssuranceProfile): VendorAssuranceProfile {
    this.vendors.set(profile.vendorId, profile);
    return profile;
  }

  list(): VendorAssuranceProfile[] {
    return Array.from(this.vendors.values());
  }
}

class AssuranceDocumentExchange {
  private docs = new Map<string, string[]>();

  share(vendorId: string, documentRef: string): string[] {
    const arr = this.docs.get(vendorId) || [];
    arr.push(documentRef);
    this.docs.set(vendorId, arr);
    return arr;
  }

  list(vendorId: string): string[] {
    return this.docs.get(vendorId) || [];
  }
}

class VendorRiskScorer {
  score(input: { trustTier: VendorAssuranceProfile['trustTier']; openFindings: number; overdueDays: number }): number {
    const base = input.trustTier === 'platinum' ? 10 : input.trustTier === 'gold' ? 20 : input.trustTier === 'silver' ? 35 : 50;
    return Math.min(100, base + input.openFindings * 5 + Math.round(input.overdueDays / 7));
  }
}

class AssuranceSLATracker {
  overdue(lastAssessmentAt: number, thresholdDays: number, now = Date.now()): boolean {
    const age = now - lastAssessmentAt;
    const threshold = thresholdDays * 24 * 60 * 60 * 1000;
    const out = age > threshold;
    logger.debug('Vendor SLA checked', { overdue: out, thresholdDays });
    return out;
  }
}

export const vendorAssuranceRegistry = new VendorAssuranceRegistry();
export const assuranceDocumentExchange = new AssuranceDocumentExchange();
export const vendorRiskScorer = new VendorRiskScorer();
export const assuranceSlaTracker = new AssuranceSLATracker();

export {
  VendorAssuranceRegistry,
  AssuranceDocumentExchange,
  VendorRiskScorer,
  AssuranceSLATracker
};


