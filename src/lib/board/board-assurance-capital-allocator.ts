/**
 * Phase 242: Board Assurance Capital Allocator
 */

import { logger } from '../logger';

export interface AssuranceCapitalRequest {
  requestId: string;
  initiative: string;
  requestedBudget: number;
  expectedRiskReduction: number;
}

class CapitalRequestBook {
  private requests: AssuranceCapitalRequest[] = [];

  submit(request: AssuranceCapitalRequest): AssuranceCapitalRequest {
    this.requests.push(request);
    return request;
  }

  list(): AssuranceCapitalRequest[] {
    return this.requests;
  }
}

class CapitalEfficiencyScorer {
  score(request: AssuranceCapitalRequest): number {
    if (request.requestedBudget === 0) return 0;
    return Math.round((request.expectedRiskReduction / request.requestedBudget) * 1000) / 1000;
  }
}

class CapitalAllocationSolver {
  allocate(requests: AssuranceCapitalRequest[], budget: number): AssuranceCapitalRequest[] {
    const sorted = [...requests].sort((a, b) => (b.expectedRiskReduction / b.requestedBudget) - (a.expectedRiskReduction / a.requestedBudget));
    const selected: AssuranceCapitalRequest[] = [];
    let spent = 0;
    for (const request of sorted) {
      if (spent + request.requestedBudget <= budget) {
        selected.push(request);
        spent += request.requestedBudget;
      }
    }
    return selected;
  }
}

class CapitalAllocationNarrator {
  narrate(selected: AssuranceCapitalRequest[]): string {
    const ids = selected.map(s => s.requestId).join(', ');
    const text = `Allocated capital to requests: ${ids || 'none'}.`;
    logger.debug('Capital allocation narrated', { count: selected.length });
    return text;
  }
}

export const capitalRequestBook = new CapitalRequestBook();
export const capitalEfficiencyScorer = new CapitalEfficiencyScorer();
export const capitalAllocationSolver = new CapitalAllocationSolver();
export const capitalAllocationNarrator = new CapitalAllocationNarrator();

export {
  CapitalRequestBook,
  CapitalEfficiencyScorer,
  CapitalAllocationSolver,
  CapitalAllocationNarrator
};

