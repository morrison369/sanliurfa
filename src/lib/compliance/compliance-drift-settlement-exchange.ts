/**
 * Phase 266: Compliance Drift Settlement Exchange
 */

import { logger } from '../logger';

export interface DriftSettlement {
  settlementId: string;
  jurisdiction: string;
  driftSeverity: number;
  amount: number;
}

class DriftSettlementBook {
  private settlements: DriftSettlement[] = [];

  create(settlement: DriftSettlement): DriftSettlement {
    this.settlements.push(settlement);
    return settlement;
  }

  list(): DriftSettlement[] {
    return this.settlements;
  }
}

class DriftSettlementPricer {
  price(settlement: DriftSettlement): number {
    return Math.round((settlement.amount * (1 + settlement.driftSeverity / 100)) * 10) / 10;
  }
}

class DriftSettlementMatcher {
  match(settlements: DriftSettlement[], maxSeverity: number): DriftSettlement[] {
    return settlements.filter(s => s.driftSeverity <= maxSeverity);
  }
}

class DriftSettlementAudit {
  summary(settlements: DriftSettlement[]): { count: number; totalAmount: number } {
    const totalAmount = settlements.reduce((a, b) => a + b.amount, 0);
    logger.debug('Drift settlement summary', { count: settlements.length, totalAmount });
    return { count: settlements.length, totalAmount: Math.round(totalAmount * 10) / 10 };
  }
}

export const driftSettlementBook = new DriftSettlementBook();
export const driftSettlementPricer = new DriftSettlementPricer();
export const driftSettlementMatcher = new DriftSettlementMatcher();
export const driftSettlementAudit = new DriftSettlementAudit();

export {
  DriftSettlementBook,
  DriftSettlementPricer,
  DriftSettlementMatcher,
  DriftSettlementAudit
};

