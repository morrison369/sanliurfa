/**
 * Phase 200: Product-Led Growth
 * PLG funnel tracking, viral loop analysis, activation tracking, expansion signal detection
 */

import { logger } from './logger';

interface PLGFunnelEvent {
  eventId: string;
  userId: string;
  stage: 'visitor' | 'signup' | 'activated' | 'retained' | 'expanded' | 'referred';
  triggeredAt: number;
  source: string;
  metadata: Record<string, any>;
}

interface ViralLoop {
  loopId: string;
  userId: string;
  referralCode: string;
  invitesSent: number;
  invitesConverted: number;
  viralCoefficient: number;
  createdAt: number;
}

interface ActivationMilestone {
  milestoneId: string;
  userId: string;
  milestoneName: string;
  requiredActions: string[];
  completedActions: string[];
  completedAt?: number;
  isComplete: boolean;
  activationScore: number;
}

interface ExpansionSignal {
  signalId: string;
  userId: string;
  accountId: string;
  signalType: 'usage_spike' | 'feature_limit_hit' | 'team_growth' | 'integration_request' | 'export_request';
  strength: 'weak' | 'moderate' | 'strong';
  detectedAt: number;
  actedOn: boolean;
}

class PLGFunnelTracker {
  private events: PLGFunnelEvent[] = [];
  private counter = 0;

  record(userId: string, stage: PLGFunnelEvent['stage'], source = 'organic', metadata: Record<string, any> = {}): PLGFunnelEvent {
    const event: PLGFunnelEvent = {
      eventId: `plg-${Date.now()}-${++this.counter}`,
      userId, stage, triggeredAt: Date.now(), source, metadata
    };
    this.events.push(event);
    logger.debug('PLG funnel event recorded', { userId, stage, source });
    return event;
  }

  getFunnelMetrics(): Record<PLGFunnelEvent['stage'], number> {
    const stages: PLGFunnelEvent['stage'][] = ['visitor', 'signup', 'activated', 'retained', 'expanded', 'referred'];
    const metrics: Record<string, number> = {};
    for (const stage of stages) {
      metrics[stage] = new Set(this.events.filter(e => e.stage === stage).map(e => e.userId)).size;
    }
    return metrics as Record<PLGFunnelEvent['stage'], number>;
  }

  getConversionRates(): Array<{ from: string; to: string; rate: number }> {
    const metrics = this.getFunnelMetrics();
    const stages: PLGFunnelEvent['stage'][] = ['visitor', 'signup', 'activated', 'retained', 'expanded'];
    return stages.slice(0, -1).map((stage, i) => {
      const next = stages[i + 1];
      const rate = metrics[stage] > 0 ? (metrics[next] / metrics[stage]) * 100 : 0;
      return { from: stage, to: next, rate };
    });
  }

  getUserStage(userId: string): PLGFunnelEvent['stage'] | undefined {
    const stageOrder: PLGFunnelEvent['stage'][] = ['visitor', 'signup', 'activated', 'retained', 'expanded', 'referred'];
    const userEvents = this.events.filter(e => e.userId === userId);
    if (!userEvents.length) return undefined;
    const stages = new Set(userEvents.map(e => e.stage));
    return stageOrder.filter(s => stages.has(s)).pop();
  }
}

class ViralLoopAnalyzer {
  private loops: Map<string, ViralLoop> = new Map();
  private counter = 0;

  createLoop(userId: string): ViralLoop {
    const existing = Array.from(this.loops.values()).find(l => l.userId === userId);
    if (existing) return existing;
    const loopId = `loop-${Date.now()}-${++this.counter}`;
    const referralCode = `REF-${userId.toUpperCase().slice(0, 6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const loop: ViralLoop = {
      loopId, userId, referralCode, invitesSent: 0, invitesConverted: 0,
      viralCoefficient: 0, createdAt: Date.now()
    };
    this.loops.set(userId, loop);
    return loop;
  }

  recordInvite(userId: string): void {
    const loop = this.loops.get(userId);
    if (loop) { loop.invitesSent++; this._updateCoefficient(loop); }
  }

  recordConversion(userId: string): void {
    const loop = this.loops.get(userId);
    if (loop) { loop.invitesConverted++; this._updateCoefficient(loop); }
  }

  private _updateCoefficient(loop: ViralLoop): void {
    loop.viralCoefficient = loop.invitesSent > 0 ? loop.invitesConverted / loop.invitesSent : 0;
  }

  getOverallViralCoefficient(): number {
    const loops = Array.from(this.loops.values());
    if (!loops.length) return 0;
    const totalInvites = loops.reduce((s, l) => s + l.invitesSent, 0);
    const totalConverted = loops.reduce((s, l) => s + l.invitesConverted, 0);
    return totalInvites > 0 ? totalConverted / totalInvites : 0;
  }

  getTopReferrers(limit = 5): ViralLoop[] {
    return Array.from(this.loops.values())
      .sort((a, b) => b.invitesConverted - a.invitesConverted)
      .slice(0, limit);
  }
}

class ActivationTracker {
  private milestones: Map<string, ActivationMilestone> = new Map();
  private counter = 0;

  define(userId: string, milestoneName: string, requiredActions: string[]): ActivationMilestone {
    const milestoneId = `milestone-${Date.now()}-${++this.counter}`;
    const milestone: ActivationMilestone = {
      milestoneId, userId, milestoneName, requiredActions,
      completedActions: [], isComplete: false, activationScore: 0
    };
    this.milestones.set(milestoneId, milestone);
    return milestone;
  }

  completeAction(milestoneId: string, action: string): ActivationMilestone | undefined {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone || milestone.isComplete) return undefined;
    if (!milestone.completedActions.includes(action) && milestone.requiredActions.includes(action)) {
      milestone.completedActions.push(action);
      milestone.activationScore = (milestone.completedActions.length / milestone.requiredActions.length) * 100;
      if (milestone.completedActions.length === milestone.requiredActions.length) {
        milestone.isComplete = true;
        milestone.completedAt = Date.now();
      }
    }
    return milestone;
  }

  getActivationRate(milestoneName: string): number {
    const relevant = Array.from(this.milestones.values()).filter(m => m.milestoneName === milestoneName);
    if (!relevant.length) return 0;
    return (relevant.filter(m => m.isComplete).length / relevant.length) * 100;
  }

  getUserMilestones(userId: string): ActivationMilestone[] {
    return Array.from(this.milestones.values()).filter(m => m.userId === userId);
  }
}

class ExpansionSignalDetector {
  private signals: Map<string, ExpansionSignal[]> = new Map();
  private counter = 0;

  detect(userId: string, accountId: string, signalType: ExpansionSignal['signalType'], strength: ExpansionSignal['strength']): ExpansionSignal {
    const signalId = `expsig-${Date.now()}-${++this.counter}`;
    const signal: ExpansionSignal = {
      signalId, userId, accountId, signalType, strength,
      detectedAt: Date.now(), actedOn: false
    };
    const accountSignals = this.signals.get(accountId) || [];
    accountSignals.push(signal);
    this.signals.set(accountId, accountSignals);
    logger.debug('Expansion signal detected', { signalId, accountId, signalType, strength });
    return signal;
  }

  markActedOn(signalId: string): boolean {
    for (const signals of this.signals.values()) {
      const signal = signals.find(s => s.signalId === signalId);
      if (signal) { signal.actedOn = true; return true; }
    }
    return false;
  }

  getExpansionReadyAccounts(minStrength: ExpansionSignal['strength'] = 'moderate'): string[] {
    const strengthOrder: Record<ExpansionSignal['strength'], number> = { weak: 1, moderate: 2, strong: 3 };
    const minLevel = strengthOrder[minStrength];
    const readyAccounts = new Set<string>();
    for (const [accountId, signals] of this.signals.entries()) {
      if (signals.some(s => !s.actedOn && strengthOrder[s.strength] >= minLevel)) {
        readyAccounts.add(accountId);
      }
    }
    return Array.from(readyAccounts);
  }

  getAccountSignals(accountId: string): ExpansionSignal[] {
    return this.signals.get(accountId) || [];
  }
}

export const plgFunnelTracker = new PLGFunnelTracker();
export const viralLoopAnalyzer = new ViralLoopAnalyzer();
export const activationTracker = new ActivationTracker();
export const expansionSignalDetector = new ExpansionSignalDetector();

export { PLGFunnelEvent, ViralLoop, ActivationMilestone, ExpansionSignal };
