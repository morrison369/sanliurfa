/**
 * Phase 197: Product Analytics
 * Feature usage tracking, product event collection, user journey analysis, product health monitoring
 */

import { logger } from './logger';

interface FeatureUsageEvent {
  eventId: string;
  userId: string;
  featureKey: string;
  action: string;
  metadata: Record<string, any>;
  sessionId: string;
  occurredAt: number;
}

interface ProductEvent {
  productEventId: string;
  category: 'activation' | 'engagement' | 'retention' | 'monetization' | 'referral';
  eventName: string;
  userId: string;
  properties: Record<string, any>;
  timestamp: number;
}

interface UserJourneyStep {
  stepId: string;
  userId: string;
  stepName: string;
  enteredAt: number;
  exitedAt?: number;
  completedAt?: number;
  durationMs?: number;
  converted: boolean;
}

interface ProductHealthMetric {
  metricId: string;
  period: string;
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  featureAdoptionRate: number;
  avgSessionDurationMs: number;
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  capturedAt: number;
}

class FeatureUsageTracker {
  private events: FeatureUsageEvent[] = [];
  private counter = 0;

  track(userId: string, featureKey: string, action: string, metadata: Record<string, any> = {}, sessionId = 'default'): FeatureUsageEvent {
    const event: FeatureUsageEvent = {
      eventId: `fuse-${Date.now()}-${++this.counter}`,
      userId, featureKey, action, metadata, sessionId, occurredAt: Date.now()
    };
    this.events.push(event);
    return event;
  }

  getFeatureStats(featureKey: string): { uniqueUsers: number; totalEvents: number; lastUsedAt: number } {
    const featureEvents = this.events.filter(e => e.featureKey === featureKey);
    const uniqueUsers = new Set(featureEvents.map(e => e.userId)).size;
    const lastUsedAt = featureEvents.reduce((max, e) => Math.max(max, e.occurredAt), 0);
    return { uniqueUsers, totalEvents: featureEvents.length, lastUsedAt };
  }

  getUserFeatures(userId: string): string[] {
    return [...new Set(this.events.filter(e => e.userId === userId).map(e => e.featureKey))];
  }

  getMostUsedFeatures(limit = 10): Array<{ featureKey: string; eventCount: number; uniqueUsers: number }> {
    const map = new Map<string, Set<string>>();
    for (const e of this.events) {
      if (!map.has(e.featureKey)) map.set(e.featureKey, new Set());
      map.get(e.featureKey)!.add(e.userId);
    }
    return Array.from(map.entries())
      .map(([featureKey, users]) => ({ featureKey, eventCount: this.events.filter(e => e.featureKey === featureKey).length, uniqueUsers: users.size }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, limit);
  }
}

class ProductEventCollector {
  private events: ProductEvent[] = [];
  private counter = 0;

  collect(category: ProductEvent['category'], eventName: string, userId: string, properties: Record<string, any> = {}): ProductEvent {
    const event: ProductEvent = {
      productEventId: `pevent-${Date.now()}-${++this.counter}`,
      category, eventName, userId, properties, timestamp: Date.now()
    };
    this.events.push(event);
    logger.debug('Product event collected', { category, eventName, userId });
    return event;
  }

  getByCategory(category: ProductEvent['category']): ProductEvent[] {
    return this.events.filter(e => e.category === category);
  }

  getEventFunnel(eventNames: string[]): Array<{ eventName: string; count: number; conversionFromPrev: number }> {
    const result: Array<{ eventName: string; count: number; conversionFromPrev: number }> = [];
    let prevCount = 0;
    for (const eventName of eventNames) {
      const users = new Set(this.events.filter(e => e.eventName === eventName).map(e => e.userId));
      const count = users.size;
      const conversionFromPrev = prevCount > 0 ? (count / prevCount) * 100 : 100;
      result.push({ eventName, count, conversionFromPrev });
      prevCount = count;
    }
    return result;
  }

  getUserEventHistory(userId: string, limit = 20): ProductEvent[] {
    return this.events.filter(e => e.userId === userId).slice(-limit);
  }
}

class UserJourneyAnalyzer {
  private steps: Map<string, UserJourneyStep[]> = new Map();
  private counter = 0;

  enterStep(userId: string, stepName: string): UserJourneyStep {
    const stepId = `step-${Date.now()}-${++this.counter}`;
    const step: UserJourneyStep = { stepId, userId, stepName, enteredAt: Date.now(), converted: false };
    const userSteps = this.steps.get(userId) || [];
    userSteps.push(step);
    this.steps.set(userId, userSteps);
    return step;
  }

  completeStep(userId: string, stepName: string): boolean {
    const steps = this.steps.get(userId) || [];
    const step = steps.findLast(s => s.stepName === stepName && !s.completedAt);
    if (step) {
      step.completedAt = Date.now();
      step.durationMs = step.completedAt - step.enteredAt;
      step.converted = true;
      return true;
    }
    return false;
  }

  getJourney(userId: string): UserJourneyStep[] {
    return this.steps.get(userId) || [];
  }

  getStepConversionRate(stepName: string): number {
    let entered = 0, completed = 0;
    for (const steps of this.steps.values()) {
      const stepEvents = steps.filter(s => s.stepName === stepName);
      entered += stepEvents.length;
      completed += stepEvents.filter(s => s.converted).length;
    }
    return entered > 0 ? (completed / entered) * 100 : 0;
  }

  getAvgStepDuration(stepName: string): number {
    const completed: number[] = [];
    for (const steps of this.steps.values()) {
      for (const s of steps) {
        if (s.stepName === stepName && s.durationMs !== undefined) completed.push(s.durationMs);
      }
    }
    return completed.length > 0 ? completed.reduce((s, v) => s + v, 0) / completed.length : 0;
  }
}

class ProductHealthMonitor {
  private metrics: ProductHealthMetric[] = [];
  private counter = 0;

  record(period: string, dau: number, wau: number, mau: number, featureAdoptionRate: number, avgSessionMs: number, d1: number, d7: number, d30: number): ProductHealthMetric {
    const metric: ProductHealthMetric = {
      metricId: `health-${Date.now()}-${++this.counter}`,
      period, dau, wau, mau,
      dauMauRatio: mau > 0 ? (dau / mau) * 100 : 0,
      featureAdoptionRate, avgSessionDurationMs: avgSessionMs,
      retentionD1: d1, retentionD7: d7, retentionD30: d30,
      capturedAt: Date.now()
    };
    this.metrics.push(metric);
    logger.debug('Product health recorded', { period, dauMauRatio: metric.dauMauRatio.toFixed(1), d30 });
    return metric;
  }

  getHealthScore(): number {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return 0;
    const engagementScore = Math.min(100, latest.dauMauRatio * 2);
    const retentionScore = (latest.retentionD1 + latest.retentionD7 + latest.retentionD30) / 3;
    const adoptionScore = Math.min(100, latest.featureAdoptionRate);
    return (engagementScore * 0.3 + retentionScore * 0.5 + adoptionScore * 0.2);
  }

  getTrend(field: 'dau' | 'mau' | 'retentionD30'): 'improving' | 'declining' | 'stable' {
    if (this.metrics.length < 2) return 'stable';
    const prev = this.metrics[this.metrics.length - 2][field] as number;
    const curr = this.metrics[this.metrics.length - 1][field] as number;
    const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return pct > 3 ? 'improving' : pct < -3 ? 'declining' : 'stable';
  }

  getLatest(): ProductHealthMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }
}

export const featureUsageTracker = new FeatureUsageTracker();
export const productEventCollector = new ProductEventCollector();
export const userJourneyAnalyzer = new UserJourneyAnalyzer();
export const productHealthMonitor = new ProductHealthMonitor();

export { FeatureUsageEvent, ProductEvent, UserJourneyStep, ProductHealthMetric };
