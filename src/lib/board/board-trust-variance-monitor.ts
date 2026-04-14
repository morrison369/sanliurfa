/**
 * Phase 270: Board Trust Variance Monitor
 */

import { logger } from '../logger';

export interface TrustObservation {
  boardId: string;
  trustScore: number;
}

class TrustObservationBuffer {
  private observations: TrustObservation[] = [];

  push(observation: TrustObservation): TrustObservation {
    this.observations.push(observation);
    return observation;
  }

  list(): TrustObservation[] {
    return this.observations;
  }
}

class TrustVarianceCalculator {
  variance(observations: TrustObservation[]): number {
    if (observations.length === 0) return 0;
    const values = observations.map(o => o.trustScore);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.round(variance * 10) / 10;
  }
}

class TrustVolatilityFlagger {
  flag(variance: number, threshold: number): boolean {
    return variance >= threshold;
  }
}

class TrustVarianceReporter {
  report(variance: number, flagged: boolean): string {
    const text = `Trust variance=${variance}, flagged=${flagged}`;
    logger.debug('Trust variance report', { variance, flagged });
    return text;
  }
}

export const trustObservationBuffer = new TrustObservationBuffer();
export const trustVarianceCalculator = new TrustVarianceCalculator();
export const trustVolatilityFlagger = new TrustVolatilityFlagger();
export const trustVarianceReporter = new TrustVarianceReporter();

export {
  TrustObservationBuffer,
  TrustVarianceCalculator,
  TrustVolatilityFlagger,
  TrustVarianceReporter
};

