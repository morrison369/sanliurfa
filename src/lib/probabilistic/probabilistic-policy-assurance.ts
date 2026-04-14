/**
 * Phase 216: Probabilistic Policy Assurance
 */

import { logger } from '../logger';

export interface PolicyEvidencePoint {
  policyId: string;
  evidenceStrength: number;
  testPassRate: number;
  driftRisk: number;
}

class AssuranceProbabilityModel {
  estimate(point: PolicyEvidencePoint): number {
    const p = point.evidenceStrength * 0.4 + point.testPassRate * 0.4 + (100 - point.driftRisk) * 0.2;
    return Math.max(0, Math.min(100, Math.round(p * 10) / 10));
  }
}

class UncertaintyQuantifier {
  interval(probability: number, confidence = 0.9): { low: number; high: number } {
    const m = confidence >= 0.9 ? 6 : 10;
    return { low: Math.max(0, probability - m), high: Math.min(100, probability + m) };
  }
}

class AssuranceThresholdEngine {
  classify(probability: number): 'strong' | 'moderate' | 'weak' {
    if (probability >= 85) return 'strong';
    if (probability >= 70) return 'moderate';
    return 'weak';
  }
}

class ProbabilisticAuditTrail {
  private logs: Array<{ policyId: string; probability: number; timestamp: number }> = [];

  record(policyId: string, probability: number): void {
    this.logs.push({ policyId, probability, timestamp: Date.now() });
    logger.debug('Probabilistic assurance recorded', { policyId, probability });
  }

  list() {
    return this.logs;
  }
}

export const assuranceProbabilityModel = new AssuranceProbabilityModel();
export const uncertaintyQuantifier = new UncertaintyQuantifier();
export const assuranceThresholdEngine = new AssuranceThresholdEngine();
export const probabilisticAuditTrail = new ProbabilisticAuditTrail();

export {
  AssuranceProbabilityModel,
  UncertaintyQuantifier,
  AssuranceThresholdEngine,
  ProbabilisticAuditTrail
};


