/**
 * Phase 188: Governance Cost Attribution
 */

import { logger } from '../logger';

export interface GovernanceCostEntry {
  entryId: string;
  domain: string;
  team: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'TRY';
  period: string;
}

class CostAllocationEngine {
  allocate(entries: GovernanceCostEntry[]): Record<string, number> {
    return entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.team] = (acc[e.team] || 0) + e.amount;
      return acc;
    }, {});
  }
}

class GovernanceCostAnalyzer {
  byDomain(entries: GovernanceCostEntry[]): Record<string, number> {
    return entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.domain] = (acc[e.domain] || 0) + e.amount;
      return acc;
    }, {});
  }
}

class CostEfficiencyScorer {
  score(cost: number, controlsCovered: number): number {
    if (controlsCovered <= 0) return 0;
    return Math.round((controlsCovered / Math.max(1, cost)) * 1000) / 10;
  }
}

class CostForecastEngine {
  forecast(history: number[]): { next: number; trend: 'up' | 'down' | 'flat' } {
    if (history.length === 0) return { next: 0, trend: 'flat' };
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    const delta = history.length > 1 ? history[history.length - 1] - history[0] : 0;
    const trend: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    logger.debug('Governance cost forecast', { next: avg, trend });
    return { next: Math.round(avg * 10) / 10, trend };
  }
}

export const costAllocationEngine = new CostAllocationEngine();
export const governanceCostAnalyzer = new GovernanceCostAnalyzer();
export const costEfficiencyScorer = new CostEfficiencyScorer();
export const costForecastEngine = new CostForecastEngine();

export {
  CostAllocationEngine,
  GovernanceCostAnalyzer,
  CostEfficiencyScorer,
  CostForecastEngine
};


