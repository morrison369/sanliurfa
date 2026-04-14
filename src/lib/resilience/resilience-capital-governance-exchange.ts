/**
 * Phase 280: Resilience Capital Governance Exchange
 */

import { logger } from '../logger';

export interface GovernanceCapitalQuote {
  quoteId: string;
  governanceUnit: string;
  capital: number;
  resilienceReturn: number;
}

class CapitalExchangeBook {
  private quotes: GovernanceCapitalQuote[] = [];

  publish(quote: GovernanceCapitalQuote): GovernanceCapitalQuote {
    this.quotes.push(quote);
    return quote;
  }

  list(): GovernanceCapitalQuote[] {
    return this.quotes;
  }
}

class CapitalReturnScorer {
  score(quote: GovernanceCapitalQuote): number {
    if (quote.capital === 0) return 0;
    return Math.round((quote.resilienceReturn / quote.capital) * 1000) / 1000;
  }
}

class GovernanceCapitalClearing {
  clear(quotes: GovernanceCapitalQuote[]): number {
    return Math.round(quotes.reduce((sum, q) => sum + q.capital, 0) * 10) / 10;
  }
}

class CapitalExchangeReporter {
  report(quotes: number, totalCapital: number): string {
    const text = `Capital exchange quotes=${quotes}, total=${totalCapital}`;
    logger.debug('Capital exchange report', { quotes, totalCapital });
    return text;
  }
}

export const capitalExchangeBook = new CapitalExchangeBook();
export const capitalReturnScorer = new CapitalReturnScorer();
export const governanceCapitalClearing = new GovernanceCapitalClearing();
export const capitalExchangeReporter = new CapitalExchangeReporter();

export {
  CapitalExchangeBook,
  CapitalReturnScorer,
  GovernanceCapitalClearing,
  CapitalExchangeReporter
};

