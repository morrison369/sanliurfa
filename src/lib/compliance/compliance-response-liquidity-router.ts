/**
 * Phase 271: Compliance Response Liquidity Router
 */

import { logger } from '../logger';

export interface ResponseLiquidityUnit {
  unitId: string;
  capacity: number;
  responseTime: number;
  priority: number;
}

class ResponseLiquidityPool {
  private units: ResponseLiquidityUnit[] = [];

  add(unit: ResponseLiquidityUnit): ResponseLiquidityUnit {
    this.units.push(unit);
    return unit;
  }

  list(): ResponseLiquidityUnit[] {
    return this.units;
  }
}

class LiquidityRouteSelector {
  select(units: ResponseLiquidityUnit[]): ResponseLiquidityUnit | undefined {
    return [...units].sort((a, b) => (b.capacity * b.priority - b.responseTime) - (a.capacity * a.priority - a.responseTime))[0];
  }
}

class ResponseCapacityGuard {
  canHandle(unit: ResponseLiquidityUnit, requiredCapacity: number): boolean {
    return unit.capacity >= requiredCapacity;
  }
}

class LiquidityRoutingReporter {
  report(unitId: string, selected: boolean): string {
    const text = `Liquidity route unit=${unitId}, selected=${selected}`;
    logger.debug('Liquidity route report', { unitId, selected });
    return text;
  }
}

export const responseLiquidityPool = new ResponseLiquidityPool();
export const liquidityRouteSelector = new LiquidityRouteSelector();
export const responseCapacityGuard = new ResponseCapacityGuard();
export const liquidityRoutingReporter = new LiquidityRoutingReporter();

export {
  ResponseLiquidityPool,
  LiquidityRouteSelector,
  ResponseCapacityGuard,
  LiquidityRoutingReporter
};

