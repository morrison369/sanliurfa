/**
 * Phase 238: Governance Trust Score Exchange
 */

import { logger } from '../logger';

export interface TrustScoreQuote {
  participantId: string;
  score: number;
  confidence: number;
}

class TrustScoreBook {
  private quotes: TrustScoreQuote[] = [];

  publish(quote: TrustScoreQuote): TrustScoreQuote {
    this.quotes.push(quote);
    return quote;
  }

  list(): TrustScoreQuote[] {
    return this.quotes;
  }
}

class TrustScoreAggregator {
  aggregate(quotes: TrustScoreQuote[]): number {
    if (quotes.length === 0) return 0;
    const weighted = quotes.reduce((sum, q) => sum + q.score * q.confidence, 0);
    const weight = quotes.reduce((sum, q) => sum + q.confidence, 0);
    return weight === 0 ? 0 : Math.round((weighted / weight) * 10) / 10;
  }
}

class TrustScoreVolatilityMonitor {
  volatility(quotes: TrustScoreQuote[]): number {
    if (quotes.length === 0) return 0;
    const values = quotes.map(q => q.score);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Math.round((max - min) * 10) / 10;
  }
}

class TrustScoreSettlementLog {
  private events: Array<{ participantId: string; score: number; timestamp: number }> = [];

  settle(participantId: string, score: number): void {
    this.events.push({ participantId, score, timestamp: Date.now() });
    logger.debug('Trust score settled', { participantId, score });
  }

  list() {
    return this.events;
  }
}

export const trustScoreBook = new TrustScoreBook();
export const trustScoreAggregator = new TrustScoreAggregator();
export const trustScoreVolatilityMonitor = new TrustScoreVolatilityMonitor();
export const trustScoreSettlementLog = new TrustScoreSettlementLog();

export {
  TrustScoreBook,
  TrustScoreAggregator,
  TrustScoreVolatilityMonitor,
  TrustScoreSettlementLog
};


