/**
 * Phase 225: Assurance SLA Marketplace
 */

import { logger } from '../logger';

export interface SLAOffer {
  offerId: string;
  provider: string;
  slaHours: number;
  price: number;
  qualityScore: number;
}

class SLAMarketRegistry {
  private offers: SLAOffer[] = [];
  private counter = 0;

  list(): SLAOffer[] {
    return this.offers;
  }

  create(provider: string, slaHours: number, price: number, qualityScore: number): SLAOffer {
    const offer: SLAOffer = {
      offerId: `sla-offer-${Date.now()}-${++this.counter}`,
      provider,
      slaHours,
      price,
      qualityScore
    };
    this.offers.push(offer);
    return offer;
  }
}

class MarketplaceMatchEngine {
  best(offers: SLAOffer[], targetHours: number): SLAOffer | undefined {
    return [...offers].sort((a, b) => {
      const scoreA = Math.abs(a.slaHours - targetHours) + a.price / 100 - a.qualityScore / 10;
      const scoreB = Math.abs(b.slaHours - targetHours) + b.price / 100 - b.qualityScore / 10;
      return scoreA - scoreB;
    })[0];
  }
}

class SLAValueScorer {
  score(offer: SLAOffer): number {
    return Math.round((offer.qualityScore * 10 - offer.price / Math.max(1, offer.slaHours)) * 10) / 10;
  }
}

class MarketplaceAuditReporter {
  summarize(offers: SLAOffer[]): { count: number; avgPrice: number } {
    const avgPrice = offers.length ? offers.reduce((a, b) => a + b.price, 0) / offers.length : 0;
    logger.debug('SLA marketplace summary', { count: offers.length, avgPrice });
    return { count: offers.length, avgPrice: Math.round(avgPrice * 10) / 10 };
  }
}

export const slaMarketRegistry = new SLAMarketRegistry();
export const marketplaceMatchEngine = new MarketplaceMatchEngine();
export const slaValueScorer = new SLAValueScorer();
export const marketplaceAuditReporter = new MarketplaceAuditReporter();

export {
  SLAMarketRegistry,
  MarketplaceMatchEngine,
  SLAValueScorer,
  MarketplaceAuditReporter
};


