/**
 * Phase 229: Control Negotiation Simulator
 */

import { logger } from '../logger';

export interface NegotiationParty {
  id: string;
  priorityWeight: number;
  minimumScore: number;
}

class NegotiationScenarioBuilder {
  build(controlId: string, parties: NegotiationParty[]): { controlId: string; parties: NegotiationParty[]; complexity: number } {
    const complexity = Math.round(parties.reduce((sum, p) => sum + p.priorityWeight, 0) * 10) / 10;
    return { controlId, parties, complexity };
  }
}

class ConcessionEngine {
  concede(initial: number, rounds: number, pressureFactor: number): number {
    return Math.max(0, Math.round((initial - rounds * pressureFactor) * 10) / 10);
  }
}

class NegotiationEquilibriumSolver {
  solve(scores: number[]): number {
    if (scores.length === 0) return 0;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }
}

class NegotiationTelemetry {
  private records: Array<{ controlId: string; equilibrium: number; timestamp: number }> = [];

  log(controlId: string, equilibrium: number): void {
    this.records.push({ controlId, equilibrium, timestamp: Date.now() });
    logger.debug('Negotiation equilibrium logged', { controlId, equilibrium });
  }

  list() {
    return this.records;
  }
}

export const negotiationScenarioBuilder = new NegotiationScenarioBuilder();
export const concessionEngine = new ConcessionEngine();
export const negotiationEquilibriumSolver = new NegotiationEquilibriumSolver();
export const negotiationTelemetry = new NegotiationTelemetry();

export {
  NegotiationScenarioBuilder,
  ConcessionEngine,
  NegotiationEquilibriumSolver,
  NegotiationTelemetry
};

