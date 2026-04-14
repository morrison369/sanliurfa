/**
 * Phase 193: Assurance Evidence Quality AI
 */

import { logger } from '../logger';

export interface EvidenceArtifact {
  artifactId: string;
  completeness: number;
  consistency: number;
  timeliness: number;
  sourceTrust: number;
}

class EvidenceQualityClassifier {
  classify(artifact: EvidenceArtifact): { score: number; label: 'excellent' | 'good' | 'weak' } {
    const score = Math.round((artifact.completeness * 0.3 + artifact.consistency * 0.3 + artifact.timeliness * 0.2 + artifact.sourceTrust * 0.2) * 10) / 10;
    const label: 'excellent' | 'good' | 'weak' = score >= 85 ? 'excellent' : score >= 65 ? 'good' : 'weak';
    return { score, label };
  }
}

class EvidenceAnomalyDetector {
  detect(sequence: number[]): { anomalies: number[]; count: number } {
    const avg = sequence.length ? sequence.reduce((a, b) => a + b, 0) / sequence.length : 0;
    const anomalies = sequence.filter(v => Math.abs(v - avg) > 20);
    return { anomalies, count: anomalies.length };
  }
}

class EvidenceSimilarityMatcher {
  similarity(a: string, b: string): number {
    if (!a && !b) return 100;
    const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size || 1;
    return Math.round((intersection / union) * 1000) / 10;
  }
}

class EvidenceRecommendationEngine {
  recommend(label: 'excellent' | 'good' | 'weak'): string[] {
    if (label === 'weak') return ['collect-more-artifacts', 'improve-source-trust', 'refresh-stale-evidence'];
    if (label === 'good') return ['increase-sampling-frequency'];
    logger.debug('Evidence recommendations generated', { label });
    return ['maintain-current-process'];
  }
}

export const evidenceQualityClassifier = new EvidenceQualityClassifier();
export const evidenceAnomalyDetector = new EvidenceAnomalyDetector();
export const evidenceSimilarityMatcher = new EvidenceSimilarityMatcher();
export const evidenceRecommendationEngine = new EvidenceRecommendationEngine();

export {
  EvidenceQualityClassifier,
  EvidenceAnomalyDetector,
  EvidenceSimilarityMatcher,
  EvidenceRecommendationEngine
};


