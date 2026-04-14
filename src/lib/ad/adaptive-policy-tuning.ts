/**
 * Phase 192: Adaptive Policy Tuning
 */

import { logger } from '../logger';

export interface PolicyMetric {
  policyId: string;
  allowRate: number;
  denyRate: number;
  falsePositiveRate: number;
  evaluationLatencyMs: number;
}

class PolicyTuningAdvisor {
  recommend(metric: PolicyMetric): string[] {
    const suggestions: string[] = [];
    if (metric.falsePositiveRate > 10) suggestions.push('relax-overly-strict-rules');
    if (metric.evaluationLatencyMs > 100) suggestions.push('optimize-condition-order');
    if (metric.denyRate > 95) suggestions.push('review-default-deny-bias');
    return suggestions.length ? suggestions : ['no-change'];
  }
}

class RuleWeightOptimizer {
  optimize(weights: number[], penaltyIndex?: number): number[] {
    const next = [...weights];
    if (penaltyIndex !== undefined && penaltyIndex >= 0 && penaltyIndex < next.length) {
      next[penaltyIndex] = Math.max(0, next[penaltyIndex] - 0.1);
    }
    const sum = next.reduce((a, b) => a + b, 0) || 1;
    return next.map(w => Math.round((w / sum) * 1000) / 1000);
  }
}

class PolicyLearningLoop {
  iterate(metric: PolicyMetric): { iterationApproved: boolean; confidence: number } {
    const confidence = Math.max(0, Math.min(100, 100 - metric.falsePositiveRate * 3 - metric.evaluationLatencyMs / 10));
    return { iterationApproved: confidence >= 60, confidence: Math.round(confidence * 10) / 10 };
  }
}

class TuningRollbackGuard {
  shouldRollback(beforeErrorRate: number, afterErrorRate: number, threshold = 2): boolean {
    const regression = afterErrorRate - beforeErrorRate;
    logger.debug('Tuning rollback check', { regression, threshold });
    return regression > threshold;
  }
}

export const policyTuningAdvisor = new PolicyTuningAdvisor();
export const ruleWeightOptimizer = new RuleWeightOptimizer();
export const policyLearningLoop = new PolicyLearningLoop();
export const tuningRollbackGuard = new TuningRollbackGuard();

export {
  PolicyTuningAdvisor,
  RuleWeightOptimizer,
  PolicyLearningLoop,
  TuningRollbackGuard
};


