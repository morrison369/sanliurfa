/**
 * Phase 178: Conversion Intelligence
 * Conversion prediction, optimization, abandonment detection, revenue attribution
 */

import { logger } from './logger';

interface ConversionSignal {
  userId: string;
  signals: Array<{ name: string; value: number; weight: number }>;
  probability: number;
  predictedAt: number;
}

interface AbandonmentEvent {
  eventId: string;
  userId: string;
  sessionId: string;
  abandonedAt: string;
  lastPage: string;
  cartValue?: number;
  recoveryAttempted: boolean;
  recoveredAt?: number;
}

interface AttributionTouchpoint {
  touchpointId: string;
  userId: string;
  channel: 'organic' | 'paid' | 'email' | 'social' | 'direct' | 'referral';
  campaign?: string;
  timestamp: number;
  attributed: boolean;
  attributionWeight: number;
}

interface ConversionOptimizationAction {
  actionId: string;
  userId: string;
  type: 'discount' | 'reminder' | 'social-proof' | 'urgency' | 'personalize';
  content: Record<string, any>;
  triggeredAt: number;
  converted: boolean;
}

function withOptional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  if (value === null || value === undefined) {
    return {} as { [P in K]?: V };
  }
  return { [key]: value } as { [P in K]?: V };
}

class ConversionPredictor {
  predict(userId: string, signals: Array<{ name: string; value: number; weight: number }>): ConversionSignal {
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const weightedScore = signals.reduce((sum, s) => sum + (s.value * s.weight), 0);
    const probability = totalWeight > 0 ? Math.min(1, Math.max(0, weightedScore / totalWeight)) : 0;

    const prediction: ConversionSignal = {
      userId,
      signals,
      probability,
      predictedAt: Date.now()
    };

    logger.debug('Conversion predicted', {
      userId,
      probability: (probability * 100).toFixed(1) + '%'
    });

    return prediction;
  }

  categorizeLead(probability: number): 'hot' | 'warm' | 'cold' {
    return probability >= 0.7 ? 'hot' : probability >= 0.3 ? 'warm' : 'cold';
  }

  predictBatch(userSignals: Record<string, Array<{ name: string; value: number; weight: number }>>): ConversionSignal[] {
    return Object.entries(userSignals).map(([userId, signals]) => this.predict(userId, signals));
  }
}

class ConversionOptimizer {
  private actions: Map<string, ConversionOptimizationAction> = new Map();
  private counter = 0;

  selectAction(userId: string, probability: number, cartValue: number): ConversionOptimizationAction {
    const actionId = `action-${Date.now()}-${++this.counter}`;
    let type: ConversionOptimizationAction['type'];
    let content: Record<string, any>;

    if (probability < 0.3 && cartValue > 50) {
      type = 'discount';
      content = { discountPct: 10, code: 'SAVE10', expiresIn: '2h' };
    } else if (probability < 0.5) {
      type = 'social-proof';
      content = { message: '127 people bought this today' };
    } else if (probability < 0.7) {
      type = 'urgency';
      content = { message: 'Only 3 left in stock' };
    } else {
      type = 'personalize';
      content = { message: 'Based on your interests...' };
    }

    const action: ConversionOptimizationAction = {
      actionId, userId, type, content,
      triggeredAt: Date.now(), converted: false
    };

    this.actions.set(actionId, action);

    logger.debug('Conversion action selected', { actionId, userId, type, probability: probability.toFixed(2) });

    return action;
  }

  recordConversion(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (action) { action.converted = true; return true; }
    return false;
  }

  getActionEffectiveness(): Record<string, { triggered: number; converted: number; rate: number }> {
    const stats: Record<string, { triggered: number; converted: number; rate: number }> = {};
    for (const action of this.actions.values()) {
      stats[action.type] = stats[action.type] || { triggered: 0, converted: 0, rate: 0 };
      stats[action.type].triggered++;
      if (action.converted) stats[action.type].converted++;
    }
    for (const s of Object.values(stats)) {
      s.rate = s.triggered > 0 ? (s.converted / s.triggered) * 100 : 0;
    }
    return stats;
  }
}

class AbandonmentDetector {
  private events: Map<string, AbandonmentEvent> = new Map();
  private counter = 0;

  detectAbandonment(userId: string, sessionId: string, lastPage: string, cartValue?: number): AbandonmentEvent {
    const eventId = `abandon-${Date.now()}-${++this.counter}`;
    const event: AbandonmentEvent = {
      eventId, userId, sessionId,
      abandonedAt: new Date().toISOString(),
      lastPage,
      recoveryAttempted: false
    };
    if (cartValue !== undefined) {
      event.cartValue = cartValue;
    }
    this.events.set(eventId, event);
    logger.debug('Abandonment detected', { eventId, userId, lastPage, cartValue });
    return event;
  }

  triggerRecovery(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (event && !event.recoveryAttempted) {
      event.recoveryAttempted = true;
      return true;
    }
    return false;
  }

  recordRecovery(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (event) {
      event.recoveredAt = Date.now();
      return true;
    }
    return false;
  }

  getAbandonmentMetrics(): { total: number; recovered: number; recoveryRate: number; avgCartValue: number } {
    const events = Array.from(this.events.values());
    const recovered = events.filter(e => e.recoveredAt).length;
    const withCart = events.filter(e => e.cartValue);
    const avgCartValue = withCart.length > 0 ? withCart.reduce((sum, e) => sum + (e.cartValue || 0), 0) / withCart.length : 0;
    return {
      total: events.length,
      recovered,
      recoveryRate: events.length > 0 ? (recovered / events.length) * 100 : 0,
      avgCartValue
    };
  }
}

class RevenueAttributionTracker {
  private touchpoints: Map<string, AttributionTouchpoint[]> = new Map();
  private counter = 0;

  recordTouchpoint(userId: string, channel: AttributionTouchpoint['channel'], campaign?: string): AttributionTouchpoint {
    const touchpointId = `tp-${Date.now()}-${++this.counter}`;
    const tp: AttributionTouchpoint = {
      touchpointId, userId, channel,
      timestamp: Date.now(),
      attributed: false, attributionWeight: 0
    };
    Object.assign(tp, withOptional('campaign', campaign));

    const existing = this.touchpoints.get(userId) || [];
    existing.push(tp);
    this.touchpoints.set(userId, existing);
    return tp;
  }

  attributeConversion(userId: string, model: 'first-touch' | 'last-touch' | 'linear'): AttributionTouchpoint[] {
    const tps = this.touchpoints.get(userId) || [];
    if (tps.length === 0) return [];

    if (model === 'first-touch') {
      tps[0].attributed = true;
      tps[0].attributionWeight = 1.0;
    } else if (model === 'last-touch') {
      tps[tps.length - 1].attributed = true;
      tps[tps.length - 1].attributionWeight = 1.0;
    } else {
      const weight = 1 / tps.length;
      for (const tp of tps) { tp.attributed = true; tp.attributionWeight = weight; }
    }

    logger.debug('Revenue attributed', { userId, model, touchpoints: tps.length });
    return tps;
  }

  getChannelAttribution(): Record<string, { touchpoints: number; totalWeight: number }> {
    const result: Record<string, { touchpoints: number; totalWeight: number }> = {};
    for (const tps of this.touchpoints.values()) {
      for (const tp of tps.filter(t => t.attributed)) {
        result[tp.channel] = result[tp.channel] || { touchpoints: 0, totalWeight: 0 };
        result[tp.channel].touchpoints++;
        result[tp.channel].totalWeight += tp.attributionWeight;
      }
    }
    return result;
  }

  getUserTouchpoints(userId: string): AttributionTouchpoint[] {
    return this.touchpoints.get(userId) || [];
  }
}

export const conversionPredictor = new ConversionPredictor();
export const conversionOptimizer = new ConversionOptimizer();
export const abandonmentDetector = new AbandonmentDetector();
export const revenueAttributionTracker = new RevenueAttributionTracker();

export type {ConversionSignal, AbandonmentEvent, AttributionTouchpoint, ConversionOptimizationAction};
