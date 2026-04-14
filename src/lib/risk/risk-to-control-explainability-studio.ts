/**
 * Phase 224: Risk-to-Control Explainability Studio
 */

import { logger } from '../logger';

export interface RiskControlLink {
  riskId: string;
  controlId: string;
  strength: number;
}

class ExplainabilityMapper {
  map(riskId: string, controlId: string, strength: number): RiskControlLink {
    return { riskId, controlId, strength };
  }
}

class ExplainabilityPathFinder {
  path(links: RiskControlLink[], riskId: string): string[] {
    return links.filter(l => l.riskId === riskId).map(l => l.controlId);
  }
}

class ExplainabilityConfidenceScorer {
  score(links: RiskControlLink[]): number {
    if (links.length === 0) return 0;
    const avg = links.reduce((a, b) => a + b.strength, 0) / links.length;
    return Math.round(avg * 10) / 10;
  }
}

class ExplainabilityNarrativeGenerator {
  narrative(riskId: string, controls: string[], confidence: number): string {
    const text = `Risk ${riskId} is mitigated by controls: ${controls.join(', ')} (confidence ${confidence}).`;
    logger.debug('Explainability narrative created', { riskId, controls: controls.length });
    return text;
  }
}

export const explainabilityMapper = new ExplainabilityMapper();
export const explainabilityPathFinder = new ExplainabilityPathFinder();
export const explainabilityConfidenceScorer = new ExplainabilityConfidenceScorer();
export const explainabilityNarrativeGenerator = new ExplainabilityNarrativeGenerator();

export {
  ExplainabilityMapper,
  ExplainabilityPathFinder,
  ExplainabilityConfidenceScorer,
  ExplainabilityNarrativeGenerator
};


