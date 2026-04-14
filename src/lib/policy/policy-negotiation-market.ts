/**
 * Phase 210: Policy Negotiation Market
 */

import { logger } from '../logger';

export interface PolicyBid {
  bidId: string;
  policyId: string;
  bidder: string;
  value: number;
  risk: number;
}

class PolicyBidBook {
  private bids: PolicyBid[] = [];
  private counter = 0;

  place(policyId: string, bidder: string, value: number, risk: number): PolicyBid {
    const bid: PolicyBid = {
      bidId: `bid-${Date.now()}-${++this.counter}`,
      policyId,
      bidder,
      value,
      risk
    };
    this.bids.push(bid);
    return bid;
  }

  list(policyId?: string): PolicyBid[] {
    return policyId ? this.bids.filter(b => b.policyId === policyId) : this.bids;
  }
}

class NegotiationClearingEngine {
  clear(bids: PolicyBid[]): PolicyBid | undefined {
    return [...bids].sort((a, b) => (b.value - b.risk) - (a.value - a.risk))[0];
  }
}

class FairnessConstraintChecker {
  check(bids: PolicyBid[]): { fair: boolean; spread: number } {
    if (bids.length < 2) return { fair: true, spread: 0 };
    const values = bids.map(b => b.value);
    const spread = Math.max(...values) - Math.min(...values);
    return { fair: spread <= 50, spread };
  }
}

class PolicyMarketReporter {
  summarize(bids: PolicyBid[]): { total: number; avgValue: number } {
    if (bids.length === 0) return { total: 0, avgValue: 0 };
    const avgValue = bids.reduce((a, b) => a + b.value, 0) / bids.length;
    logger.debug('Policy market summarized', { total: bids.length, avgValue });
    return { total: bids.length, avgValue: Math.round(avgValue * 10) / 10 };
  }
}

export const policyBidBook = new PolicyBidBook();
export const negotiationClearingEngine = new NegotiationClearingEngine();
export const fairnessConstraintChecker = new FairnessConstraintChecker();
export const policyMarketReporter = new PolicyMarketReporter();

export {
  PolicyBidBook,
  NegotiationClearingEngine,
  FairnessConstraintChecker,
  PolicyMarketReporter
};


