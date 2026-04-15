/**
 * Phase 173: Journey Orchestration
 * Customer journey building, progress tracking, trigger engine, analytics
 */

import { logger } from './logger';

interface JourneyStep {
  stepId: string;
  name: string;
  type: 'email' | 'push' | 'inapp' | 'sms' | 'wait' | 'condition';
  delayMs?: number;
  condition?: Record<string, any>;
  content?: Record<string, any>;
  nextStepId?: string;
  nextStepOnFalse?: string;
}

interface Journey {
  journeyId: string;
  name: string;
  trigger: { event: string; conditions: Record<string, any> };
  steps: JourneyStep[];
  createdAt: number;
  status: 'draft' | 'active' | 'paused' | 'archived';
  enrolledCount: number;
  completedCount: number;
}

interface JourneyProgress {
  progressId: string;
  journeyId: string;
  userId: string;
  currentStepId: string;
  startedAt: number;
  lastUpdatedAt: number;
  status: 'active' | 'completed' | 'exited';
  stepsCompleted: string[];
}

class JourneyBuilder {
  private journeys: Map<string, Journey> = new Map();
  private counter = 0;

  createJourney(name: string, triggerEvent: string, triggerConditions: Record<string, any> = {}): Journey {
    const journeyId = `journey-${Date.now()}-${++this.counter}`;
    const journey: Journey = {
      journeyId,
      name,
      trigger: { event: triggerEvent, conditions: triggerConditions },
      steps: [],
      createdAt: Date.now(),
      status: 'draft',
      enrolledCount: 0,
      completedCount: 0
    };
    this.journeys.set(journeyId, journey);
    logger.debug('Journey created', { journeyId, name, triggerEvent });
    return journey;
  }

  addStep(journeyId: string, step: Omit<JourneyStep, 'stepId'>): JourneyStep | undefined {
    const journey = this.journeys.get(journeyId);
    if (!journey) return undefined;
    const stepId = `step-${Date.now()}-${++this.counter}`;
    const fullStep: JourneyStep = { stepId, ...step };
    journey.steps.push(fullStep);
    return fullStep;
  }

  activateJourney(journeyId: string): Journey | undefined {
    const journey = this.journeys.get(journeyId);
    if (journey && journey.steps.length > 0) {
      journey.status = 'active';
      logger.debug('Journey activated', { journeyId, steps: journey.steps.length });
      return journey;
    }
    return undefined;
  }

  getJourney(journeyId: string): Journey | undefined {
    return this.journeys.get(journeyId);
  }

  listActiveJourneys(): Journey[] {
    return Array.from(this.journeys.values()).filter(j => j.status === 'active');
  }
}

class JourneyProgressTracker {
  private progress: Map<string, JourneyProgress> = new Map();
  private counter = 0;

  enroll(journeyId: string, userId: string, firstStepId: string): JourneyProgress {
    const progressId = `progress-${Date.now()}-${++this.counter}`;
    const prog: JourneyProgress = {
      progressId,
      journeyId,
      userId,
      currentStepId: firstStepId,
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      status: 'active',
      stepsCompleted: []
    };
    this.progress.set(progressId, prog);
    logger.debug('User enrolled in journey', { progressId, journeyId, userId });
    return prog;
  }

  advance(progressId: string, completedStepId: string, nextStepId: string): JourneyProgress | undefined {
    const prog = this.progress.get(progressId);
    if (prog && prog.status === 'active') {
      prog.stepsCompleted.push(completedStepId);
      prog.currentStepId = nextStepId;
      prog.lastUpdatedAt = Date.now();
      return prog;
    }
    return undefined;
  }

  complete(progressId: string): JourneyProgress | undefined {
    const prog = this.progress.get(progressId);
    if (prog) {
      prog.status = 'completed';
      prog.lastUpdatedAt = Date.now();
      return prog;
    }
    return undefined;
  }

  getUserProgress(userId: string): JourneyProgress[] {
    return Array.from(this.progress.values()).filter(p => p.userId === userId && p.status === 'active');
  }

  getJourneyProgress(journeyId: string): JourneyProgress[] {
    return Array.from(this.progress.values()).filter(p => p.journeyId === journeyId);
  }
}

class JourneyTriggerEngine {
  private rules: Map<string, { event: string; conditions: Record<string, any>; journeyId: string }[]> = new Map();

  registerTrigger(event: string, conditions: Record<string, any>, journeyId: string): void {
    const existing = this.rules.get(event) || [];
    existing.push({ event, conditions, journeyId });
    this.rules.set(event, existing);
    logger.debug('Journey trigger registered', { event, journeyId });
  }

  evaluate(event: string, context: Record<string, any>): string[] {
    const triggers = this.rules.get(event) || [];
    const matched: string[] = [];

    for (const trigger of triggers) {
      let conditionsMet = true;
      for (const [key, value] of Object.entries(trigger.conditions)) {
        if (context[key] !== value) { conditionsMet = false; break; }
      }
      if (conditionsMet) matched.push(trigger.journeyId);
    }

    return matched;
  }

  removeTrigger(event: string, journeyId: string): void {
    const triggers = this.rules.get(event) || [];
    this.rules.set(event, triggers.filter(t => t.journeyId !== journeyId));
  }

  listTriggers(event: string): Array<{ conditions: Record<string, any>; journeyId: string }> {
    return (this.rules.get(event) || []).map(({ conditions, journeyId }) => ({ conditions, journeyId }));
  }
}

class JourneyAnalytics {
  getConversionRate(journeys: JourneyProgress[]): { enrolled: number; completed: number; rate: number } {
    const enrolled = journeys.length;
    const completed = journeys.filter(j => j.status === 'completed').length;
    return { enrolled, completed, rate: enrolled > 0 ? (completed / enrolled) * 100 : 0 };
  }

  getDropoffByStep(journeys: JourneyProgress[]): Record<string, number> {
    const dropoffs: Record<string, number> = {};
    for (const prog of journeys.filter(j => j.status === 'exited')) {
      dropoffs[prog.currentStepId] = (dropoffs[prog.currentStepId] || 0) + 1;
    }
    return dropoffs;
  }

  getAverageCompletionTime(journeys: JourneyProgress[]): number {
    const completed = journeys.filter(j => j.status === 'completed');
    if (completed.length === 0) return 0;
    return completed.reduce((sum, j) => sum + (j.lastUpdatedAt - j.startedAt), 0) / completed.length;
  }

  getStepEngagement(journeys: JourneyProgress[]): Record<string, number> {
    const engagement: Record<string, number> = {};
    for (const prog of journeys) {
      for (const stepId of prog.stepsCompleted) {
        engagement[stepId] = (engagement[stepId] || 0) + 1;
      }
    }
    return engagement;
  }
}

export const journeyBuilder = new JourneyBuilder();
export const journeyProgressTracker = new JourneyProgressTracker();
export const journeyTriggerEngine = new JourneyTriggerEngine();
export const journeyAnalytics = new JourneyAnalytics();

export { Journey, JourneyStep, JourneyProgress };
