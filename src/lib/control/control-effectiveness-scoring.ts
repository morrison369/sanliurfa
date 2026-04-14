/**
 * Phase 171: Control Effectiveness Scoring
 */

import { logger } from '../logger';

export interface EvidenceSample {
  evidenceId: string;
  controlId: string;
  source: string;
  freshnessDays: number;
  completeness: number; // 0-100
  quality: number; // 0-100
}

class EvidenceQualityAssessor {
  score(sample: EvidenceSample): number {
    const freshnessScore = Math.max(0, 100 - sample.freshnessDays * 2);
    return Math.round((freshnessScore * 0.3 + sample.completeness * 0.35 + sample.quality * 0.35) * 10) / 10;
  }
}

class ControlEffectivenessScorer {
  calculate(input: {
    controlId: string;
    passRate: number; // 0-100
    mttrHours: number;
    evidenceScore: number; // 0-100
    driftImpact: number; // 0-100 where higher means worse
  }): { controlId: string; score: number; grade: 'A' | 'B' | 'C' | 'D'; evaluatedAt: number } {
    const mttrScore = Math.max(0, 100 - input.mttrHours * 3);
    const stabilityScore = Math.max(0, 100 - input.driftImpact);
    const score = Math.round((input.passRate * 0.4 + mttrScore * 0.2 + input.evidenceScore * 0.25 + stabilityScore * 0.15) * 10) / 10;
    const grade: 'A' | 'B' | 'C' | 'D' = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

    logger.debug('Control effectiveness calculated', { controlId: input.controlId, score, grade });
    return { controlId: input.controlId, score, grade, evaluatedAt: Date.now() };
  }
}

class DomainGovernanceHealth {
  aggregate(scores: Array<{ domain: string; score: number }>): Record<string, number> {
    const grouped = scores.reduce<Record<string, number[]>>((acc, row) => {
      if (!acc[row.domain]) acc[row.domain] = [];
      acc[row.domain].push(row.score);
      return acc;
    }, {});

    return Object.fromEntries(
      Object.entries(grouped).map(([domain, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return [domain, Math.round(avg * 10) / 10];
      })
    );
  }
}

class ScoreTrendAnalyzer {
  trend(points: number[]): { direction: 'up' | 'down' | 'flat'; delta: number } {
    if (points.length < 2) return { direction: 'flat', delta: 0 };
    const delta = Math.round((points[points.length - 1] - points[0]) * 10) / 10;
    const direction: 'up' | 'down' | 'flat' = delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat';
    return { direction, delta };
  }
}

export const evidenceQualityAssessor = new EvidenceQualityAssessor();
export const controlEffectivenessScorer = new ControlEffectivenessScorer();
export const domainGovernanceHealth = new DomainGovernanceHealth();
export const scoreTrendAnalyzer = new ScoreTrendAnalyzer();

export {
  EvidenceQualityAssessor,
  ControlEffectivenessScorer,
  DomainGovernanceHealth,
  ScoreTrendAnalyzer
};


