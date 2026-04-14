/**
 * Phase 230: Board Policy Portfolio Optimizer
 */

import { logger } from '../logger';

export interface PolicyPortfolioItem {
  policyId: string;
  cost: number;
  riskReduction: number;
  strategicFit: number;
}

class PortfolioCandidateBuilder {
  create(items: PolicyPortfolioItem[]): { items: PolicyPortfolioItem[]; size: number } {
    return { items, size: items.length };
  }
}

class PortfolioValueScorer {
  score(item: PolicyPortfolioItem): number {
    return Math.round((item.riskReduction * 0.5 + item.strategicFit * 0.4 - item.cost * 0.1) * 10) / 10;
  }
}

class PortfolioConstraintSolver {
  select(items: PolicyPortfolioItem[], budget: number): PolicyPortfolioItem[] {
    const sorted = [...items].sort((a, b) => (b.riskReduction + b.strategicFit) - (a.riskReduction + a.strategicFit));
    const selected: PolicyPortfolioItem[] = [];
    let spent = 0;
    for (const item of sorted) {
      if (spent + item.cost <= budget) {
        selected.push(item);
        spent += item.cost;
      }
    }
    return selected;
  }
}

class PortfolioDecisionNarrator {
  summarize(selected: PolicyPortfolioItem[]): string {
    const policyIds = selected.map(s => s.policyId).join(', ');
    const text = `Selected portfolio policies: ${policyIds || 'none'}.`;
    logger.debug('Portfolio summary generated', { count: selected.length });
    return text;
  }
}

export const portfolioCandidateBuilder = new PortfolioCandidateBuilder();
export const portfolioValueScorer = new PortfolioValueScorer();
export const portfolioConstraintSolver = new PortfolioConstraintSolver();
export const portfolioDecisionNarrator = new PortfolioDecisionNarrator();

export {
  PortfolioCandidateBuilder,
  PortfolioValueScorer,
  PortfolioConstraintSolver,
  PortfolioDecisionNarrator
};

