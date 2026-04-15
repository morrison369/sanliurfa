/**
 * Phase 218: Touchpoint Analytics
 * Touchpoint mapping, channel performance, journey orchestration, influence calculation
 */

import { logger } from './logger';

interface Touchpoint {
  touchpointId: string;
  name: string;
  channel: 'web' | 'mobile' | 'email' | 'phone' | 'chat' | 'in_store' | 'social';
  stage: 'awareness' | 'consideration' | 'purchase' | 'onboarding' | 'support' | 'retention';
  avgSatisfactionScore: number;
  interactionCount: number;
  conversionRate: number;
  dropoffRate: number;
  avgDurationSeconds: number;
  createdAt: number;
}

interface ChannelPerformance {
  performanceId: string;
  channel: Touchpoint['channel'];
  period: string;
  totalInteractions: number;
  satisfactionAvg: number;
  resolutionRate: number;
  avgHandleTimeSeconds: number;
  costPerInteraction: number;
  csat: number;
  capturedAt: number;
}

interface JourneyOrchestrationRule {
  ruleId: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  nextTouchpoint: string;
  priority: number;
  active: boolean;
  triggeredCount: number;
  createdAt: number;
}

interface TouchpointInfluence {
  influenceId: string;
  touchpointId: string;
  conversionInfluence: number;   // 0-1
  retentionInfluence: number;    // 0-1
  revenueInfluence: number;      // 0-1
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  calculatedAt: number;
}

class TouchpointMapper {
  private touchpoints: Map<string, Touchpoint> = new Map();
  private counter = 0;

  define(name: string, channel: Touchpoint['channel'], stage: Touchpoint['stage']): Touchpoint {
    const touchpointId = `tp-${Date.now()}-${++this.counter}`;
    const touchpoint: Touchpoint = {
      touchpointId, name, channel, stage,
      avgSatisfactionScore: 0, interactionCount: 0,
      conversionRate: 0, dropoffRate: 0, avgDurationSeconds: 0, createdAt: Date.now()
    };
    this.touchpoints.set(touchpointId, touchpoint);
    logger.debug('Touchpoint defined', { touchpointId, name, channel, stage });
    return touchpoint;
  }

  recordInteraction(touchpointId: string, satisfactionScore: number, durationSeconds: number, converted: boolean, dropped: boolean): void {
    const tp = this.touchpoints.get(touchpointId);
    if (!tp) return;
    const prev = tp.interactionCount;
    tp.interactionCount++;
    tp.avgSatisfactionScore = (tp.avgSatisfactionScore * prev + satisfactionScore) / tp.interactionCount;
    tp.avgDurationSeconds = (tp.avgDurationSeconds * prev + durationSeconds) / tp.interactionCount;
    tp.conversionRate = ((tp.conversionRate * prev) + (converted ? 100 : 0)) / tp.interactionCount;
    tp.dropoffRate = ((tp.dropoffRate * prev) + (dropped ? 100 : 0)) / tp.interactionCount;
  }

  getByStage(stage: Touchpoint['stage']): Touchpoint[] {
    return Array.from(this.touchpoints.values()).filter(tp => tp.stage === stage);
  }

  getHighDropoffTouchpoints(threshold = 30): Touchpoint[] {
    return Array.from(this.touchpoints.values())
      .filter(tp => tp.dropoffRate >= threshold)
      .sort((a, b) => b.dropoffRate - a.dropoffRate);
  }

  getTouchpoint(touchpointId: string): Touchpoint | undefined {
    return this.touchpoints.get(touchpointId);
  }
}

class ChannelPerformanceTracker {
  private performances: Map<string, ChannelPerformance[]> = new Map();
  private counter = 0;

  record(channel: Touchpoint['channel'], period: string, interactions: number, satisfactionAvg: number, resolutionRate: number, handleTimeSeconds: number, costPerInteraction: number): ChannelPerformance {
    const performanceId = `chanperf-${Date.now()}-${++this.counter}`;
    const csat = satisfactionAvg >= 4 ? (satisfactionAvg - 1) / 4 * 100 : 0;
    const perf: ChannelPerformance = {
      performanceId, channel, period, totalInteractions: interactions,
      satisfactionAvg, resolutionRate, avgHandleTimeSeconds: handleTimeSeconds,
      costPerInteraction, csat, capturedAt: Date.now()
    };
    const existing = this.performances.get(channel) || [];
    existing.push(perf);
    this.performances.set(channel, existing);
    logger.debug('Channel performance recorded', { channel, period, satisfactionAvg, resolutionRate });
    return perf;
  }

  getLatest(channel: Touchpoint['channel']): ChannelPerformance | undefined {
    const history = this.performances.get(channel) || [];
    return history[history.length - 1];
  }

  getBestChannel(metric: 'satisfactionAvg' | 'resolutionRate' | 'csat'): string | undefined {
    let best: string | undefined;
    let bestVal = -Infinity;
    for (const [channel, history] of this.performances.entries()) {
      const latest = history[history.length - 1];
      if (latest && (latest[metric] as number) > bestVal) { bestVal = latest[metric] as number; best = channel; }
    }
    return best;
  }

  getCostEfficiencyRanking(): Array<{ channel: string; costPerInteraction: number }> {
    return Array.from(this.performances.entries())
      .map(([channel, history]) => ({ channel, costPerInteraction: history[history.length - 1]?.costPerInteraction || Infinity }))
      .sort((a, b) => a.costPerInteraction - b.costPerInteraction);
  }
}

class JourneyOrchestrationAnalyzer {
  private rules: Map<string, JourneyOrchestrationRule> = new Map();
  private counter = 0;

  addRule(name: string, trigger: string, condition: string, action: string, nextTouchpoint: string, priority = 1): JourneyOrchestrationRule {
    const ruleId = `jorule-${Date.now()}-${++this.counter}`;
    const rule: JourneyOrchestrationRule = {
      ruleId, name, trigger, condition, action, nextTouchpoint,
      priority, active: true, triggeredCount: 0, createdAt: Date.now()
    };
    this.rules.set(ruleId, rule);
    return rule;
  }

  evaluate(trigger: string, context: Record<string, any>): JourneyOrchestrationRule[] {
    const matching = Array.from(this.rules.values())
      .filter(r => r.active && r.trigger === trigger)
      .sort((a, b) => b.priority - a.priority);
    for (const rule of matching) rule.triggeredCount++;
    return matching;
  }

  deactivate(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) { rule.active = false; return true; }
    return false;
  }

  getMostTriggered(limit = 5): JourneyOrchestrationRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.triggeredCount - a.triggeredCount)
      .slice(0, limit);
  }

  getActiveRules(): JourneyOrchestrationRule[] {
    return Array.from(this.rules.values()).filter(r => r.active);
  }
}

class TouchpointInfluenceCalculator {
  private influences: Map<string, TouchpointInfluence> = new Map();
  private counter = 0;

  calculate(touchpointId: string, conversionInfluence: number, retentionInfluence: number, revenueInfluence: number, model: TouchpointInfluence['model']): TouchpointInfluence {
    const influenceId = `tpinfl-${Date.now()}-${++this.counter}`;
    const influence: TouchpointInfluence = {
      influenceId, touchpointId,
      conversionInfluence: Math.max(0, Math.min(1, conversionInfluence)),
      retentionInfluence: Math.max(0, Math.min(1, retentionInfluence)),
      revenueInfluence: Math.max(0, Math.min(1, revenueInfluence)),
      model, calculatedAt: Date.now()
    };
    this.influences.set(touchpointId, influence);
    return influence;
  }

  getTopInfluencers(metric: 'conversionInfluence' | 'retentionInfluence' | 'revenueInfluence', limit = 5): TouchpointInfluence[] {
    return Array.from(this.influences.values())
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, limit);
  }

  getInfluence(touchpointId: string): TouchpointInfluence | undefined {
    return this.influences.get(touchpointId);
  }
}

export const touchpointMapper = new TouchpointMapper();
export const channelPerformanceTracker = new ChannelPerformanceTracker();
export const journeyOrchestrationAnalyzer = new JourneyOrchestrationAnalyzer();
export const touchpointInfluenceCalculator = new TouchpointInfluenceCalculator();

export { Touchpoint, ChannelPerformance, JourneyOrchestrationRule, TouchpointInfluence };
