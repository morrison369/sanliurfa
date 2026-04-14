/**
 * Phase 231: Compliance Evidence Market Network
 */

import { logger } from '../logger';

export interface EvidenceListing {
  listingId: string;
  owner: string;
  category: string;
  quality: number;
  price: number;
}

class EvidenceMarketRegistry {
  private listings: EvidenceListing[] = [];

  publish(listing: EvidenceListing): EvidenceListing {
    this.listings.push(listing);
    return listing;
  }

  list(): EvidenceListing[] {
    return this.listings;
  }
}

class EvidenceLiquidityAnalyzer {
  liquidity(listings: EvidenceListing[]): number {
    if (listings.length === 0) return 0;
    const liquidity = listings.reduce((sum, l) => sum + l.quality / Math.max(1, l.price), 0) / listings.length;
    return Math.round(liquidity * 100) / 100;
  }
}

class EvidenceExchangeMatcher {
  match(listings: EvidenceListing[], category: string, minQuality: number): EvidenceListing[] {
    return listings.filter(l => l.category === category && l.quality >= minQuality).sort((a, b) => b.quality - a.quality);
  }
}

class EvidenceSettlementTracker {
  private settlements: Array<{ listingId: string; buyer: string; timestamp: number }> = [];

  settle(listingId: string, buyer: string): void {
    this.settlements.push({ listingId, buyer, timestamp: Date.now() });
    logger.debug('Evidence settlement recorded', { listingId, buyer });
  }

  list() {
    return this.settlements;
  }
}

export const evidenceMarketRegistry = new EvidenceMarketRegistry();
export const evidenceLiquidityAnalyzer = new EvidenceLiquidityAnalyzer();
export const evidenceExchangeMatcher = new EvidenceExchangeMatcher();
export const evidenceSettlementTracker = new EvidenceSettlementTracker();

export {
  EvidenceMarketRegistry,
  EvidenceLiquidityAnalyzer,
  EvidenceExchangeMatcher,
  EvidenceSettlementTracker
};

