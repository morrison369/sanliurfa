/**
 * Phase 278: Compliance Scenario Liquidity Allocator
 */

import { logger } from '../logger';

export interface ScenarioLiquidityRequest {
  scenarioId: string;
  liquidityNeed: number;
  urgency: number;
  confidence: number;
}

class LiquidityRequestBook {
  private requests: ScenarioLiquidityRequest[] = [];

  add(request: ScenarioLiquidityRequest): ScenarioLiquidityRequest {
    this.requests.push(request);
    return request;
  }

  list(): ScenarioLiquidityRequest[] {
    return this.requests;
  }
}

class LiquidityAllocationScorer {
  score(request: ScenarioLiquidityRequest): number {
    return Math.round((request.urgency * 0.5 + request.confidence * 0.3 + request.liquidityNeed * 0.2) * 10) / 10;
  }
}

class LiquidityAllocator {
  allocate(requests: ScenarioLiquidityRequest[], budget: number): ScenarioLiquidityRequest[] {
    const sorted = [...requests].sort((a, b) => (b.urgency + b.confidence) - (a.urgency + a.confidence));
    const selected: ScenarioLiquidityRequest[] = [];
    let used = 0;
    for (const req of sorted) {
      if (used + req.liquidityNeed <= budget) {
        selected.push(req);
        used += req.liquidityNeed;
      }
    }
    return selected;
  }
}

class LiquidityAllocationReporter {
  report(selected: number, budget: number): string {
    const text = `Liquidity allocations selected=${selected}, budget=${budget}`;
    logger.debug('Liquidity allocation report', { selected, budget });
    return text;
  }
}

export const liquidityRequestBook = new LiquidityRequestBook();
export const liquidityAllocationScorer = new LiquidityAllocationScorer();
export const liquidityAllocator = new LiquidityAllocator();
export const liquidityAllocationReporter = new LiquidityAllocationReporter();

export {
  LiquidityRequestBook,
  LiquidityAllocationScorer,
  LiquidityAllocator,
  LiquidityAllocationReporter
};

