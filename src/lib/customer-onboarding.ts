/**
 * Phase 86: Customer Onboarding
 * Onboarding workflows, training programs, adoption tracking, enablement resources
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type OnboardingStage = 'signup' | 'setup' | 'training' | 'go_live' | 'optimization';
export type AdoptionLevel = 'low' | 'medium' | 'high' | 'advanced';

export interface OnboardingProgram {
  id: string;
  customerId: string;
  accountId: string;
  stage: OnboardingStage;
  startDate: number;
  targetGoLiveDate: number;
  status: 'in_progress' | 'completed';
  createdAt: number;
}

export interface TrainingSession {
  id: string;
  customerId: string;
  programId: string;
  title: string;
  scheduledDate: number;
  completedDate?: number;
  attendees: string[];
  resourcesProvided: string[];
  createdAt: number;
}

export interface AdoptionMetrics {
  id: string;
  customerId: string;
  measuredDate: number;
  adoptionLevel: AdoptionLevel;
  featureUsage: Record<string, number>;
  userEngagement: number;
  trainingCompletion: number;
  createdAt: number;
}

// ==================== ONBOARDING MANAGER ====================

export class OnboardingManager {
  private programs = new Map<string, OnboardingProgram>();
  private programCount = 0;

  /**
   * Create program
   */
  createProgram(program: Omit<OnboardingProgram, 'id' | 'createdAt'>): OnboardingProgram {
    const id = 'onboard-' + Date.now() + '-' + this.programCount++;

    const newProgram: OnboardingProgram = {
      ...program,
      id,
      createdAt: Date.now()
    };

    this.programs.set(id, newProgram);
    logger.info('Onboarding program created', {
      programId: id,
      customerId: program.customerId,
      stage: program.stage
    });

    return newProgram;
  }

  /**
   * Get program
   */
  getProgram(programId: string): OnboardingProgram | null {
    return this.programs.get(programId) || null;
  }

  /**
   * Update stage
   */
  updateStage(programId: string, newStage: OnboardingStage): void {
    const program = this.programs.get(programId);
    if (program) {
      program.stage = newStage;
      logger.info('Onboarding stage updated', { programId, newStage });
    }
  }

  /**
   * Complete onboarding
   */
  completeOnboarding(programId: string): void {
    const program = this.programs.get(programId);
    if (program) {
      program.status = 'completed';
      program.stage = 'optimization';
      logger.info('Onboarding completed', { programId });
    }
  }

  /**
   * Get onboarding progress
   */
  getOnboardingProgress(programId: string): { completed: number; total: number } {
    const stages: OnboardingStage[] = ['signup', 'setup', 'training', 'go_live', 'optimization'];
    const program = this.getProgram(programId);

    if (!program) {
      return { completed: 0, total: stages.length };
    }

    const currentIndex = stages.indexOf(program.stage);
    return {
      completed: currentIndex + 1,
      total: stages.length
    };
  }
}

// ==================== TRAINING MANAGER ====================

export class TrainingManager {
  private sessions = new Map<string, TrainingSession>();
  private sessionCount = 0;

  /**
   * Schedule session
   */
  scheduleSession(session: Omit<TrainingSession, 'id' | 'createdAt'>): TrainingSession {
    const id = 'training-' + Date.now() + '-' + this.sessionCount++;

    const newSession: TrainingSession = {
      ...session,
      id,
      createdAt: Date.now()
    };

    this.sessions.set(id, newSession);
    logger.info('Training session scheduled', {
      sessionId: id,
      customerId: session.customerId,
      title: session.title,
      scheduledDate: session.scheduledDate,
      attendeeCount: session.attendees.length
    });

    return newSession;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): TrainingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get customer sessions
   */
  getCustomerSessions(customerId: string): TrainingSession[] {
    return Array.from(this.sessions.values()).filter(s => s.customerId === customerId);
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.completedDate = Date.now();
      logger.info('Training session completed', { sessionId });
    }
  }

  /**
   * Get resources for customer
   */
  getResourcesForCustomer(customerId: string): string[] {
    const sessions = this.getCustomerSessions(customerId);
    const resources = new Set<string>();

    sessions.forEach(s => {
      s.resourcesProvided.forEach(r => resources.add(r));
    });

    return Array.from(resources);
  }
}

// ==================== ADOPTION TRACKER ====================

export class AdoptionTracker {
  private metrics = new Map<string, AdoptionMetrics>();
  private metricCount = 0;
  private featureUsage = new Map<string, Record<string, number>>();

  /**
   * Record adoption
   */
  recordAdoption(metrics: Omit<AdoptionMetrics, 'id' | 'createdAt'>): AdoptionMetrics {
    const id = 'adoption-' + Date.now() + '-' + this.metricCount++;

    const newMetrics: AdoptionMetrics = {
      ...metrics,
      id,
      createdAt: Date.now()
    };

    this.metrics.set(id, newMetrics);
    logger.info('Adoption metrics recorded', {
      customerId: metrics.customerId,
      adoptionLevel: metrics.adoptionLevel,
      userEngagement: metrics.userEngagement,
      trainingCompletion: metrics.trainingCompletion
    });

    return newMetrics;
  }

  /**
   * Get adoption
   */
  getAdoption(customerId: string): AdoptionMetrics | null {
    const customerMetrics = Array.from(this.metrics.values())
      .filter(m => m.customerId === customerId)
      .sort((a, b) => b.measuredDate - a.measuredDate);

    return customerMetrics[0] || null;
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(customerId: string, feature: string, usageCount: number): void {
    const usage = this.featureUsage.get(customerId) || {};
    usage[feature] = (usage[feature] || 0) + usageCount;
    this.featureUsage.set(customerId, usage);
    logger.debug('Feature usage tracked', { customerId, feature, usageCount });
  }

  /**
   * Get adoption trend
   */
  getAdoptionTrend(customerId: string, months: number): AdoptionLevel[] {
    const customerMetrics = Array.from(this.metrics.values())
      .filter(m => m.customerId === customerId)
      .sort((a, b) => a.measuredDate - b.measuredDate)
      .slice(-months);

    return customerMetrics.map(m => m.adoptionLevel);
  }

  /**
   * Identify low adoption customers
   */
  identifyLowAdoptionCustomers(): string[] {
    const lowAdoption: string[] = [];

    Array.from(this.metrics.values()).forEach(metric => {
      if (metric.adoptionLevel === 'low') {
        lowAdoption.push(metric.customerId);
      }
    });

    return Array.from(new Set(lowAdoption));
  }
}

// ==================== EXPORTS ====================

export const onboardingManager = new OnboardingManager();
export const trainingManager = new TrainingManager();
export const adoptionTracker = new AdoptionTracker();
