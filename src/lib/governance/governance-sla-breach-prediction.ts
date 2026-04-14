/**
 * Phase 191: Governance SLA Breach Prediction
 */

import { logger } from '../logger';

export interface SlaSignal {
  itemId: string;
  remainingMs: number;
  avgCompletionMs: number;
  backlogSize: number;
}

class SLABreachPredictor {
  predict(signal: SlaSignal): { breachProbability: number; risk: 'low' | 'medium' | 'high' } {
    const timePressure = signal.avgCompletionMs > 0 ? signal.avgCompletionMs / Math.max(1, signal.remainingMs) : 0;
    const loadFactor = Math.min(3, signal.backlogSize / 10);
    const probability = Math.min(100, Math.round((timePressure * 45 + loadFactor * 20) * 10) / 10);
    const risk: 'low' | 'medium' | 'high' = probability >= 70 ? 'high' : probability >= 40 ? 'medium' : 'low';
    return { breachProbability: probability, risk };
  }
}

class SLATrendEstimator {
  trend(values: number[]): { slope: number; direction: 'improving' | 'degrading' | 'flat' } {
    if (values.length < 2) return { slope: 0, direction: 'flat' };
    const slope = Math.round((values[values.length - 1] - values[0]) * 10) / 10;
    const direction: 'improving' | 'degrading' | 'flat' = slope < -1 ? 'improving' : slope > 1 ? 'degrading' : 'flat';
    return { slope, direction };
  }
}

class SLARiskSegmenter {
  segment(probability: number): 'green' | 'amber' | 'red' {
    if (probability >= 70) return 'red';
    if (probability >= 40) return 'amber';
    return 'green';
  }
}

class SLAPreventionPlanner {
  suggest(risk: 'low' | 'medium' | 'high'): string[] {
    if (risk === 'high') return ['escalate-owner', 'reassign-work', 'open-war-room'];
    if (risk === 'medium') return ['notify-owner', 'increase-check-frequency'];
    logger.debug('SLA prevention plan generated', { risk });
    return ['monitor'];
  }
}

export const slaBreachPredictor = new SLABreachPredictor();
export const slaTrendEstimator = new SLATrendEstimator();
export const slaRiskSegmenter = new SLARiskSegmenter();
export const slaPreventionPlanner = new SLAPreventionPlanner();

export {
  SLABreachPredictor,
  SLATrendEstimator,
  SLARiskSegmenter,
  SLAPreventionPlanner
};


