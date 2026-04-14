/**
 * Phase 204: Autonomous Exception Negotiation
 */

import { logger } from '../logger';

export interface NegotiationCase {
  caseId: string;
  requester: string;
  approver: string;
  controlId: string;
  requestedHours: number;
}

class ExceptionNegotiationEngine {
  private counter = 0;

  openCase(requester: string, approver: string, controlId: string, requestedHours: number): NegotiationCase {
    return {
      caseId: `neg-${Date.now()}-${++this.counter}`,
      requester,
      approver,
      controlId,
      requestedHours
    };
  }
}

class NegotiationStrategySelector {
  choose(requestedHours: number, criticality: 'low' | 'medium' | 'high'): 'fast-track' | 'standard' | 'strict' {
    if (criticality === 'high' || requestedHours > 72) return 'strict';
    if (requestedHours <= 24) return 'fast-track';
    return 'standard';
  }
}

class NegotiationOutcomeScorer {
  score(input: { risk: number; businessNeed: number; controlsInPlace: number }): number {
    return Math.round((input.businessNeed * 0.5 + input.controlsInPlace * 0.3 - input.risk * 0.2) * 10) / 10;
  }
}

class NegotiationAuditRecorder {
  private logs: Array<{ caseId: string; decision: string; timestamp: number }> = [];

  record(caseId: string, decision: string): void {
    this.logs.push({ caseId, decision, timestamp: Date.now() });
    logger.debug('Exception negotiation decision recorded', { caseId, decision });
  }

  list() {
    return this.logs;
  }
}

export const exceptionNegotiationEngine = new ExceptionNegotiationEngine();
export const negotiationStrategySelector = new NegotiationStrategySelector();
export const negotiationOutcomeScorer = new NegotiationOutcomeScorer();
export const negotiationAuditRecorder = new NegotiationAuditRecorder();

export {
  ExceptionNegotiationEngine,
  NegotiationStrategySelector,
  NegotiationOutcomeScorer,
  NegotiationAuditRecorder
};


