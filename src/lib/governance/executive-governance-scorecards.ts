/**
 * Phase 182: Executive Governance Scorecards
 */

import { logger } from '../logger';

export interface ExecutiveMetric {
  key: string;
  value: number;
  target: number;
  weight: number;
}

class GovernanceScorecardBuilder {
  build(metrics: ExecutiveMetric[]): { score: number; passed: number; total: number } {
    const totalWeight = metrics.reduce((a, b) => a + b.weight, 0) || 1;
    const weighted = metrics.reduce((a, m) => a + Math.min(100, (m.value / Math.max(1, m.target)) * 100) * m.weight, 0);
    const passed = metrics.filter(m => m.value >= m.target).length;
    return { score: Math.round((weighted / totalWeight) * 10) / 10, passed, total: metrics.length };
  }
}

class ExecutiveNarrativeGenerator {
  summary(score: number): string {
    if (score >= 90) return 'Governance posture is strong and stable.';
    if (score >= 75) return 'Governance posture is acceptable with targeted improvements needed.';
    return 'Governance posture requires immediate remediation focus.';
  }
}

class ScorecardTrendReporter {
  trend(points: number[]): { delta: number; direction: 'up' | 'down' | 'flat' } {
    if (points.length < 2) return { delta: 0, direction: 'flat' };
    const delta = Math.round((points[points.length - 1] - points[0]) * 10) / 10;
    const direction: 'up' | 'down' | 'flat' = delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat';
    return { delta, direction };
  }
}

class ExecutiveRiskHeatmap {
  classify(items: Array<{ domain: string; score: number }>): Record<string, 'low' | 'medium' | 'high'> {
    const map: Record<string, 'low' | 'medium' | 'high'> = {};
    for (const i of items) {
      map[i.domain] = i.score >= 85 ? 'low' : i.score >= 70 ? 'medium' : 'high';
    }
    logger.debug('Executive heatmap generated', { domains: items.length });
    return map;
  }
}

export const governanceScorecardBuilder = new GovernanceScorecardBuilder();
export const executiveNarrativeGenerator = new ExecutiveNarrativeGenerator();
export const scorecardTrendReporter = new ScorecardTrendReporter();
export const executiveRiskHeatmap = new ExecutiveRiskHeatmap();

export {
  GovernanceScorecardBuilder,
  ExecutiveNarrativeGenerator,
  ScorecardTrendReporter,
  ExecutiveRiskHeatmap
};


