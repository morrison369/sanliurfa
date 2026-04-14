/**
 * Phase 194: Governance Portfolio Prioritization
 */

import { logger } from '../logger';

export interface GovernanceInitiative {
  initiativeId: string;
  valueScore: number;
  riskReduction: number;
  effort: number;
  deadlineDays: number;
}

class PortfolioPrioritizer {
  rank(items: GovernanceInitiative[]): GovernanceInitiative[] {
    return [...items].sort((a, b) => {
      const scoreA = (a.valueScore + a.riskReduction) / Math.max(1, a.effort);
      const scoreB = (b.valueScore + b.riskReduction) / Math.max(1, b.effort);
      return scoreB - scoreA;
    });
  }
}

class DependencyAwarePlanner {
  schedule(ids: string[], dependencies: Array<{ from: string; to: string }>): string[] {
    const blocked = new Set(dependencies.map(d => d.to));
    const first = ids.filter(i => !blocked.has(i));
    const rest = ids.filter(i => blocked.has(i));
    return [...first, ...rest];
  }
}

class ValueRiskBalancer {
  balance(valueScore: number, riskReduction: number): number {
    return Math.round((valueScore * 0.6 + riskReduction * 0.4) * 10) / 10;
  }
}

class PortfolioHealthMonitor {
  health(items: GovernanceInitiative[]): { avgEffort: number; urgentCount: number } {
    if (items.length === 0) return { avgEffort: 0, urgentCount: 0 };
    const avgEffort = items.reduce((a, b) => a + b.effort, 0) / items.length;
    const urgentCount = items.filter(i => i.deadlineDays <= 14).length;
    logger.debug('Portfolio health computed', { avgEffort, urgentCount });
    return { avgEffort: Math.round(avgEffort * 10) / 10, urgentCount };
  }
}

export const portfolioPrioritizer = new PortfolioPrioritizer();
export const dependencyAwarePlanner = new DependencyAwarePlanner();
export const valueRiskBalancer = new ValueRiskBalancer();
export const portfolioHealthMonitor = new PortfolioHealthMonitor();

export {
  PortfolioPrioritizer,
  DependencyAwarePlanner,
  ValueRiskBalancer,
  PortfolioHealthMonitor
};


