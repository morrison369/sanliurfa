/**
 * Phase 193: Subscription Analytics
 * Churn prediction, MRR analysis, cohort analysis, expansion revenue tracking
 */

import { logger } from './logger';

interface ChurnSignal {
  signalId: string;
  customerId: string;
  signalType: 'low_usage' | 'support_tickets' | 'payment_failure' | 'downgrade_inquiry' | 'login_drop';
  severity: 'low' | 'medium' | 'high';
  detectedAt: number;
  churnProbability: number; // 0-1
}

interface MRRSnapshot {
  snapshotId: string;
  period: string;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netMRR: number;
  totalMRR: number;
  capturedAt: number;
}

interface SubscriptionCohort {
  cohortId: string;
  cohortMonth: string;
  startingCount: number;
  retention: Record<number, number>; // month offset -> retained count
  revenue: Record<number, number>;   // month offset -> revenue
}

interface ExpansionEvent {
  eventId: string;
  customerId: string;
  type: 'upsell' | 'cross_sell' | 'seat_expansion' | 'usage_overage';
  previousMRR: number;
  newMRR: number;
  expansionAmount: number;
  occurredAt: number;
}

class ChurnPredictor {
  private signals: Map<string, ChurnSignal[]> = new Map();
  private counter = 0;

  recordSignal(customerId: string, signalType: ChurnSignal['signalType'], severity: ChurnSignal['severity']): ChurnSignal {
    const weights: Record<ChurnSignal['signalType'], number> = {
      low_usage: 0.3, support_tickets: 0.4, payment_failure: 0.7, downgrade_inquiry: 0.8, login_drop: 0.35
    };
    const severityMultiplier: Record<ChurnSignal['severity'], number> = { low: 0.5, medium: 0.75, high: 1.0 };
    const signalId = `signal-${Date.now()}-${++this.counter}`;
    const churnProbability = Math.min(1, weights[signalType] * severityMultiplier[severity]);
    const signal: ChurnSignal = { signalId, customerId, signalType, severity, detectedAt: Date.now(), churnProbability };
    const existing = this.signals.get(customerId) || [];
    existing.push(signal);
    this.signals.set(customerId, existing);
    logger.debug('Churn signal recorded', { signalId, customerId, signalType, churnProbability: churnProbability.toFixed(2) });
    return signal;
  }

  getChurnScore(customerId: string): number {
    const signals = this.signals.get(customerId) || [];
    if (!signals.length) return 0;
    const recent = signals.filter(s => s.detectedAt > Date.now() - 30 * 86400000);
    if (!recent.length) return 0;
    const combined = 1 - recent.reduce((prod, s) => prod * (1 - s.churnProbability), 1);
    return Math.min(1, combined);
  }

  getAtRiskCustomers(threshold = 0.6): Array<{ customerId: string; churnScore: number }> {
    return Array.from(this.signals.keys())
      .map(customerId => ({ customerId, churnScore: this.getChurnScore(customerId) }))
      .filter(c => c.churnScore >= threshold)
      .sort((a, b) => b.churnScore - a.churnScore);
  }

  getRecentSignals(customerId: string, limit = 5): ChurnSignal[] {
    return (this.signals.get(customerId) || []).slice(-limit);
  }
}

class MRRAnalyzer {
  private snapshots: MRRSnapshot[] = [];
  private counter = 0;

  record(period: string, newMRR: number, expansionMRR: number, contractionMRR: number, churnedMRR: number): MRRSnapshot {
    const prev = this.snapshots[this.snapshots.length - 1];
    const prevTotal = prev?.totalMRR || 0;
    const netMRR = newMRR + expansionMRR - contractionMRR - churnedMRR;
    const totalMRR = prevTotal + netMRR;

    const snapshot: MRRSnapshot = {
      snapshotId: `mrr-${Date.now()}-${++this.counter}`,
      period, newMRR, expansionMRR, contractionMRR, churnedMRR, netMRR, totalMRR,
      capturedAt: Date.now()
    };
    this.snapshots.push(snapshot);
    logger.debug('MRR recorded', { period, netMRR, totalMRR });
    return snapshot;
  }

  getGrowthRate(): number {
    if (this.snapshots.length < 2) return 0;
    const prev = this.snapshots[this.snapshots.length - 2].totalMRR;
    const curr = this.snapshots[this.snapshots.length - 1].totalMRR;
    return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  getChurnRate(): number {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest || latest.totalMRR === 0) return 0;
    return (latest.churnedMRR / latest.totalMRR) * 100;
  }

  getARR(): number {
    const latest = this.snapshots[this.snapshots.length - 1];
    return latest ? latest.totalMRR * 12 : 0;
  }

  getSnapshots(): MRRSnapshot[] {
    return this.snapshots;
  }
}

class SubscriptionCohortAnalyzer {
  private cohorts: Map<string, SubscriptionCohort> = new Map();
  private counter = 0;

  createCohort(cohortMonth: string, startingCount: number): SubscriptionCohort {
    const cohortId = `cohort-${Date.now()}-${++this.counter}`;
    const cohort: SubscriptionCohort = {
      cohortId, cohortMonth, startingCount,
      retention: { 0: startingCount },
      revenue: {}
    };
    this.cohorts.set(cohortMonth, cohort);
    return cohort;
  }

  recordRetention(cohortMonth: string, monthOffset: number, retainedCount: number, revenue: number): void {
    const cohort = this.cohorts.get(cohortMonth);
    if (cohort) {
      cohort.retention[monthOffset] = retainedCount;
      cohort.revenue[monthOffset] = revenue;
    }
  }

  getRetentionRate(cohortMonth: string, monthOffset: number): number {
    const cohort = this.cohorts.get(cohortMonth);
    if (!cohort || cohort.startingCount === 0) return 0;
    const retained = cohort.retention[monthOffset] ?? 0;
    return (retained / cohort.startingCount) * 100;
  }

  getAverageRetentionByOffset(monthOffset: number): number {
    const cohorts = Array.from(this.cohorts.values()).filter(c => c.retention[monthOffset] !== undefined);
    if (!cohorts.length) return 0;
    return cohorts.reduce((sum, c) => sum + this.getRetentionRate(c.cohortMonth, monthOffset), 0) / cohorts.length;
  }

  getCohort(cohortMonth: string): SubscriptionCohort | undefined {
    return this.cohorts.get(cohortMonth);
  }
}

class ExpansionRevenueTracker {
  private events: Map<string, ExpansionEvent> = new Map();
  private counter = 0;

  record(customerId: string, type: ExpansionEvent['type'], previousMRR: number, newMRR: number): ExpansionEvent {
    const eventId = `expansion-${Date.now()}-${++this.counter}`;
    const event: ExpansionEvent = {
      eventId, customerId, type, previousMRR, newMRR,
      expansionAmount: newMRR - previousMRR,
      occurredAt: Date.now()
    };
    this.events.set(eventId, event);
    logger.debug('Expansion revenue recorded', { eventId, customerId, type, expansionAmount: event.expansionAmount });
    return event;
  }

  getTotalExpansionMRR(period?: string): number {
    return Array.from(this.events.values())
      .filter(e => e.expansionAmount > 0)
      .reduce((sum, e) => sum + e.expansionAmount, 0);
  }

  getByType(type: ExpansionEvent['type']): ExpansionEvent[] {
    return Array.from(this.events.values()).filter(e => e.type === type);
  }

  getTopExpanders(limit = 5): Array<{ customerId: string; totalExpansion: number }> {
    const customerMap = new Map<string, number>();
    for (const event of this.events.values()) {
      if (event.expansionAmount > 0) {
        customerMap.set(event.customerId, (customerMap.get(event.customerId) || 0) + event.expansionAmount);
      }
    }
    return Array.from(customerMap.entries())
      .map(([customerId, totalExpansion]) => ({ customerId, totalExpansion }))
      .sort((a, b) => b.totalExpansion - a.totalExpansion)
      .slice(0, limit);
  }
}

export const churnPredictor = new ChurnPredictor();
export const mrrAnalyzer = new MRRAnalyzer();
export const subscriptionCohortAnalyzer = new SubscriptionCohortAnalyzer();
export const expansionRevenueTracker = new ExpansionRevenueTracker();

export { ChurnSignal, MRRSnapshot, SubscriptionCohort, ExpansionEvent };
