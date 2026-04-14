/**
 * Phase 262: Resilience Evidence Liquidity Exchange
 */

import { logger } from '../logger';

export interface EvidenceLiquidityLot {
  lotId: string;
  evidenceType: string;
  liquidity: number;
  price: number;
}

class LiquidityLotBook {
  private lots: EvidenceLiquidityLot[] = [];

  add(lot: EvidenceLiquidityLot): EvidenceLiquidityLot {
    this.lots.push(lot);
    return lot;
  }

  list(): EvidenceLiquidityLot[] {
    return this.lots;
  }
}

class LiquiditySpreadCalculator {
  spread(lots: EvidenceLiquidityLot[]): number {
    if (lots.length === 0) return 0;
    const prices = lots.map(l => l.price);
    return Math.round((Math.max(...prices) - Math.min(...prices)) * 10) / 10;
  }
}

class EvidenceLiquidityMatcher {
  match(lots: EvidenceLiquidityLot[], minLiquidity: number): EvidenceLiquidityLot[] {
    return lots.filter(l => l.liquidity >= minLiquidity);
  }
}

class LiquidityExchangeReporter {
  report(count: number, spread: number): string {
    const text = `Liquidity lots=${count}, spread=${spread}`;
    logger.debug('Liquidity exchange report', { count, spread });
    return text;
  }
}

export const liquidityLotBook = new LiquidityLotBook();
export const liquiditySpreadCalculator = new LiquiditySpreadCalculator();
export const evidenceLiquidityMatcher = new EvidenceLiquidityMatcher();
export const liquidityExchangeReporter = new LiquidityExchangeReporter();

export {
  LiquidityLotBook,
  LiquiditySpreadCalculator,
  EvidenceLiquidityMatcher,
  LiquidityExchangeReporter
};

