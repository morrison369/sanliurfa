/**
 * Phase 254: Customer Data Platform Intelligence
 * Unified customer profiles, identity resolution, segment management, data activation
 */

import { logger } from './logger';

interface UnifiedCustomerProfile {
  profileId: string;
  resolvedIdentities: string[];  // email, phone, cookie, device IDs merged
  primaryEmail?: string;
  attributes: Record<string, unknown>;
  segments: string[];
  ltv: number;
  acquisitionChannel: string;
  firstSeenAt: number;
  lastActiveAt: number;
  totalEvents: number;
  updatedAt: number;
}

interface IdentityResolutionRule {
  ruleId: string;
  name: string;
  matchType: 'deterministic' | 'probabilistic';
  signalType: 'email' | 'phone' | 'device_id' | 'cookie' | 'loyalty_id' | 'ip_address';
  confidence: number;   // 0-100
  priority: number;     // higher = applied first
  enabled: boolean;
  createdAt: number;
}

interface CustomerSegment {
  segmentId: string;
  name: string;
  description: string;
  type: 'behavioral' | 'demographic' | 'predictive' | 'value_based' | 'lifecycle';
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  memberCount: number;
  activationChannels: string[];
  refreshedAt: number;
  createdAt: number;
}

interface DataActivationJob {
  jobId: string;
  segmentId: string;
  destinationName: string;
  destinationType: 'email_platform' | 'ad_network' | 'crm' | 'push_notification' | 'sms';
  profilesExported: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  errorMessage?: string;
}

class UnifiedProfileManager {
  private profiles: Map<string, UnifiedCustomerProfile> = new Map();
  private identityIndex: Map<string, string> = new Map();  // identity → profileId
  private counter = 0;

  upsert(identities: string[], attributes: Record<string, unknown>, acquisitionChannel: string): UnifiedCustomerProfile {
    // Find existing profile by any matching identity
    let existingProfileId: string | undefined;
    for (const id of identities) {
      existingProfileId = this.identityIndex.get(id);
      if (existingProfileId) break;
    }

    if (existingProfileId) {
      const profile = this.profiles.get(existingProfileId)!;
      // Merge identities
      for (const id of identities) {
        if (!profile.resolvedIdentities.includes(id)) profile.resolvedIdentities.push(id);
        this.identityIndex.set(id, existingProfileId);
      }
      Object.assign(profile.attributes, attributes);
      profile.lastActiveAt = Date.now();
      profile.totalEvents++;
      profile.updatedAt = Date.now();
      return profile;
    }

    const profileId = `cdpprofile-${Date.now()}-${++this.counter}`;
    const profile: UnifiedCustomerProfile = {
      profileId, resolvedIdentities: identities,
      primaryEmail: identities.find(i => i.includes('@')),
      attributes, segments: [], ltv: 0, acquisitionChannel,
      firstSeenAt: Date.now(), lastActiveAt: Date.now(), totalEvents: 1, updatedAt: Date.now()
    };
    this.profiles.set(profileId, profile);
    for (const id of identities) this.identityIndex.set(id, profileId);
    logger.debug('CDP profile upserted', { profileId, identityCount: identities.length });
    return profile;
  }

  findByIdentity(identity: string): UnifiedCustomerProfile | undefined {
    const profileId = this.identityIndex.get(identity);
    return profileId ? this.profiles.get(profileId) : undefined;
  }

  addToSegment(profileId: string, segmentId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;
    if (!profile.segments.includes(segmentId)) profile.segments.push(segmentId);
    return true;
  }

  updateLTV(profileId: string, ltv: number): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;
    profile.ltv = ltv;
    profile.updatedAt = Date.now();
    return true;
  }

  getTotalProfiles(): number {
    return this.profiles.size;
  }

  getProfile(profileId: string): UnifiedCustomerProfile | undefined {
    return this.profiles.get(profileId);
  }
}

class IdentityResolutionEngine {
  private rules: Map<string, IdentityResolutionRule> = new Map();
  private counter = 0;

  addRule(name: string, matchType: IdentityResolutionRule['matchType'], signalType: IdentityResolutionRule['signalType'], confidence: number, priority: number): IdentityResolutionRule {
    const ruleId = `idrule-${Date.now()}-${++this.counter}`;
    const rule: IdentityResolutionRule = {
      ruleId, name, matchType, signalType, confidence, priority, enabled: true, createdAt: Date.now()
    };
    this.rules.set(ruleId, rule);
    return rule;
  }

  getActiveRules(): IdentityResolutionRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  getDeterministicRules(): IdentityResolutionRule[] {
    return Array.from(this.rules.values()).filter(r => r.matchType === 'deterministic' && r.enabled);
  }

  getAvgConfidence(): number {
    const active = this.getActiveRules();
    if (!active.length) return 0;
    return active.reduce((s, r) => s + r.confidence, 0) / active.length;
  }
}

class SegmentManager {
  private segments: Map<string, CustomerSegment> = new Map();
  private counter = 0;

  create(name: string, description: string, type: CustomerSegment['type'], conditions: CustomerSegment['conditions'], activationChannels: string[]): CustomerSegment {
    const segmentId = `seg-${Date.now()}-${++this.counter}`;
    const segment: CustomerSegment = {
      segmentId, name, description, type, conditions, memberCount: 0,
      activationChannels, refreshedAt: Date.now(), createdAt: Date.now()
    };
    this.segments.set(segmentId, segment);
    logger.debug('Segment created', { segmentId, name, type });
    return segment;
  }

  updateMemberCount(segmentId: string, count: number): boolean {
    const seg = this.segments.get(segmentId);
    if (!seg) return false;
    seg.memberCount = count;
    seg.refreshedAt = Date.now();
    return true;
  }

  getByType(type: CustomerSegment['type']): CustomerSegment[] {
    return Array.from(this.segments.values()).filter(s => s.type === type);
  }

  getLargestSegments(limit = 5): CustomerSegment[] {
    return Array.from(this.segments.values())
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, limit);
  }

  getSegment(segmentId: string): CustomerSegment | undefined {
    return this.segments.get(segmentId);
  }
}

class DataActivationManager {
  private jobs: Map<string, DataActivationJob> = new Map();
  private counter = 0;

  createJob(segmentId: string, destinationName: string, destinationType: DataActivationJob['destinationType']): DataActivationJob {
    const jobId = `actjob-${Date.now()}-${++this.counter}`;
    const job: DataActivationJob = {
      jobId, segmentId, destinationName, destinationType,
      profilesExported: 0, status: 'pending', startedAt: Date.now()
    };
    this.jobs.set(jobId, job);
    return job;
  }

  complete(jobId: string, profilesExported: number): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.profilesExported = profilesExported;
    job.status = 'completed';
    job.completedAt = Date.now();
    return true;
  }

  fail(jobId: string, errorMessage: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.status = 'failed';
    job.errorMessage = errorMessage;
    job.completedAt = Date.now();
    return true;
  }

  getSuccessRate(): number {
    const finished = Array.from(this.jobs.values()).filter(j => j.status === 'completed' || j.status === 'failed');
    if (!finished.length) return 0;
    return (finished.filter(j => j.status === 'completed').length / finished.length) * 100;
  }

  getRecentJobs(limit = 10): DataActivationJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }
}

export const unifiedProfileManager = new UnifiedProfileManager();
export const identityResolutionEngine = new IdentityResolutionEngine();
export const segmentManager = new SegmentManager();
export const dataActivationManager = new DataActivationManager();

export { UnifiedCustomerProfile, IdentityResolutionRule, CustomerSegment, DataActivationJob };
