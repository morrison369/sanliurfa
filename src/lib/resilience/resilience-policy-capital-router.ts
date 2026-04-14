/**
 * Phase 268: Resilience Policy Capital Router
 */

import { logger } from '../logger';

export interface CapitalPolicyFlow {
  flowId: string;
  policyId: string;
  capital: number;
  resilienceYield: number;
}

class CapitalFlowBook {
  private flows: CapitalPolicyFlow[] = [];

  add(flow: CapitalPolicyFlow): CapitalPolicyFlow {
    this.flows.push(flow);
    return flow;
  }

  list(): CapitalPolicyFlow[] {
    return this.flows;
  }
}

class CapitalYieldScorer {
  score(flow: CapitalPolicyFlow): number {
    if (flow.capital === 0) return 0;
    return Math.round((flow.resilienceYield / flow.capital) * 1000) / 1000;
  }
}

class CapitalRouteOptimizer {
  optimize(flows: CapitalPolicyFlow[], budget: number): CapitalPolicyFlow[] {
    const sorted = [...flows].sort((a, b) => (b.resilienceYield / Math.max(1, b.capital)) - (a.resilienceYield / Math.max(1, a.capital)));
    const selected: CapitalPolicyFlow[] = [];
    let spent = 0;
    for (const flow of sorted) {
      if (spent + flow.capital <= budget) {
        selected.push(flow);
        spent += flow.capital;
      }
    }
    return selected;
  }
}

class CapitalRoutingReporter {
  report(selected: number, budget: number): string {
    const text = `Capital routes selected=${selected} within budget=${budget}`;
    logger.debug('Capital routing report', { selected, budget });
    return text;
  }
}

export const capitalFlowBook = new CapitalFlowBook();
export const capitalYieldScorer = new CapitalYieldScorer();
export const capitalRouteOptimizer = new CapitalRouteOptimizer();
export const capitalRoutingReporter = new CapitalRoutingReporter();

export {
  CapitalFlowBook,
  CapitalYieldScorer,
  CapitalRouteOptimizer,
  CapitalRoutingReporter
};

