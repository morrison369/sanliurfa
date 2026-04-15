/**
 * Phase 185: Partner Onboarding
 * Application management, onboarding orchestration, compliance checking, profile management
 */

import { logger } from './logger';

interface PartnerApplication {
  applicationId: string;
  companyName: string;
  contactEmail: string;
  partnerType: 'reseller' | 'technology' | 'referral' | 'implementation';
  website: string;
  region: string;
  submittedAt: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
}

interface OnboardingStep {
  stepId: string;
  name: string;
  type: 'document' | 'training' | 'technical' | 'legal' | 'financial';
  required: boolean;
  completedAt?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

interface PartnerProfile {
  partnerId: string;
  companyName: string;
  partnerType: PartnerApplication['partnerType'];
  tier: 'registered' | 'silver' | 'gold' | 'platinum';
  capabilities: string[];
  certifications: string[];
  region: string;
  joinedAt: number;
  status: 'active' | 'suspended' | 'churned';
}

class PartnerApplicationManager {
  private applications: Map<string, PartnerApplication> = new Map();
  private counter = 0;

  submit(companyName: string, contactEmail: string, partnerType: PartnerApplication['partnerType'], website: string, region: string): PartnerApplication {
    const applicationId = `app-${Date.now()}-${++this.counter}`;
    const application: PartnerApplication = {
      applicationId, companyName, contactEmail, partnerType, website, region,
      submittedAt: Date.now(), status: 'pending'
    };
    this.applications.set(applicationId, application);
    logger.debug('Partner application submitted', { applicationId, companyName, partnerType });
    return application;
  }

  review(applicationId: string): PartnerApplication | undefined {
    const app = this.applications.get(applicationId);
    if (app && app.status === 'pending') { app.status = 'under_review'; return app; }
    return undefined;
  }

  approve(applicationId: string, reviewedBy: string): PartnerApplication | undefined {
    const app = this.applications.get(applicationId);
    if (app) {
      app.status = 'approved';
      app.reviewedBy = reviewedBy;
      app.reviewedAt = Date.now();
      logger.debug('Partner application approved', { applicationId, reviewedBy });
      return app;
    }
    return undefined;
  }

  reject(applicationId: string, reviewedBy: string, reason: string): PartnerApplication | undefined {
    const app = this.applications.get(applicationId);
    if (app) {
      app.status = 'rejected';
      app.reviewedBy = reviewedBy;
      app.reviewedAt = Date.now();
      app.rejectionReason = reason;
      return app;
    }
    return undefined;
  }

  getApplication(applicationId: string): PartnerApplication | undefined {
    return this.applications.get(applicationId);
  }

  getPendingApplications(): PartnerApplication[] {
    return Array.from(this.applications.values()).filter(a => a.status === 'pending' || a.status === 'under_review');
  }
}

class PartnerOnboardingOrchestrator {
  private journeys: Map<string, OnboardingStep[]> = new Map();
  private counter = 0;

  initiate(partnerId: string, partnerType: PartnerApplication['partnerType']): OnboardingStep[] {
    const steps: OnboardingStep[] = [
      { stepId: `step-${++this.counter}`, name: 'Sign Partner Agreement', type: 'legal', required: true, status: 'pending' },
      { stepId: `step-${++this.counter}`, name: 'Complete Partner Training', type: 'training', required: true, status: 'pending' },
      { stepId: `step-${++this.counter}`, name: 'Technical Integration Setup', type: 'technical', required: partnerType === 'technology', status: 'pending' },
      { stepId: `step-${++this.counter}`, name: 'Submit Company Documents', type: 'document', required: true, status: 'pending' },
      { stepId: `step-${++this.counter}`, name: 'Banking & Payment Setup', type: 'financial', required: partnerType !== 'referral', status: 'pending' }
    ];
    this.journeys.set(partnerId, steps);
    logger.debug('Partner onboarding initiated', { partnerId, stepCount: steps.length });
    return steps;
  }

  completeStep(partnerId: string, stepId: string): OnboardingStep | undefined {
    const steps = this.journeys.get(partnerId) || [];
    const step = steps.find(s => s.stepId === stepId);
    if (step) {
      step.status = 'completed';
      step.completedAt = Date.now();
      return step;
    }
    return undefined;
  }

  getProgress(partnerId: string): { completed: number; total: number; percentage: number; ready: boolean } {
    const steps = this.journeys.get(partnerId) || [];
    const required = steps.filter(s => s.required);
    const completed = required.filter(s => s.status === 'completed').length;
    return {
      completed, total: required.length,
      percentage: required.length > 0 ? (completed / required.length) * 100 : 0,
      ready: completed === required.length
    };
  }

  getSteps(partnerId: string): OnboardingStep[] {
    return this.journeys.get(partnerId) || [];
  }
}

class PartnerComplianceChecker {
  private checks: Map<string, Array<{ requirement: string; status: 'passed' | 'failed' | 'pending'; checkedAt: number }>> = new Map();

  runChecks(partnerId: string, partnerData: Record<string, any>): Array<{ requirement: string; status: 'passed' | 'failed' | 'pending' }> {
    const requirements = [
      { requirement: 'valid_business_registration', check: () => !!partnerData.businessId },
      { requirement: 'data_processing_agreement', check: () => !!partnerData.dpaSignedAt },
      { requirement: 'security_assessment', check: () => !!partnerData.securityScore && partnerData.securityScore >= 70 },
      { requirement: 'insurance_coverage', check: () => !!partnerData.insuranceValid }
    ];

    const results = requirements.map(r => ({
      requirement: r.requirement,
      status: (r.check() ? 'passed' : 'failed') as 'passed' | 'failed' | 'pending',
      checkedAt: Date.now()
    }));

    this.checks.set(partnerId, results);
    logger.debug('Compliance checks run', { partnerId, passed: results.filter(r => r.status === 'passed').length });
    return results;
  }

  isCompliant(partnerId: string): boolean {
    const checks = this.checks.get(partnerId) || [];
    return checks.length > 0 && checks.every(c => c.status === 'passed');
  }

  getFailedRequirements(partnerId: string): string[] {
    return (this.checks.get(partnerId) || []).filter(c => c.status === 'failed').map(c => c.requirement);
  }
}

class PartnerProfileManager {
  private profiles: Map<string, PartnerProfile> = new Map();
  private counter = 0;

  create(application: PartnerApplication): PartnerProfile {
    const partnerId = `partner-${Date.now()}-${++this.counter}`;
    const profile: PartnerProfile = {
      partnerId, companyName: application.companyName,
      partnerType: application.partnerType, tier: 'registered',
      capabilities: [], certifications: [], region: application.region,
      joinedAt: Date.now(), status: 'active'
    };
    this.profiles.set(partnerId, profile);
    logger.debug('Partner profile created', { partnerId, companyName: application.companyName });
    return profile;
  }

  addCapability(partnerId: string, capability: string): boolean {
    const profile = this.profiles.get(partnerId);
    if (profile && !profile.capabilities.includes(capability)) {
      profile.capabilities.push(capability);
      return true;
    }
    return false;
  }

  upgradeTier(partnerId: string, tier: PartnerProfile['tier']): PartnerProfile | undefined {
    const profile = this.profiles.get(partnerId);
    if (profile) {
      profile.tier = tier;
      logger.debug('Partner tier upgraded', { partnerId, tier });
      return profile;
    }
    return undefined;
  }

  getProfile(partnerId: string): PartnerProfile | undefined {
    return this.profiles.get(partnerId);
  }

  getByTier(tier: PartnerProfile['tier']): PartnerProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.tier === tier && p.status === 'active');
  }
}

export const partnerApplicationManager = new PartnerApplicationManager();
export const partnerOnboardingOrchestrator = new PartnerOnboardingOrchestrator();
export const partnerComplianceChecker = new PartnerComplianceChecker();
export const partnerProfileManager = new PartnerProfileManager();

export { PartnerApplication, OnboardingStep, PartnerProfile };
