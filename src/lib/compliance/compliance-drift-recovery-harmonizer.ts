/**
 * Phase 319: Compliance Drift Recovery Harmonizer
 */

import { logger } from '../logger';
import { SignalBook, computeBalancedScore, scorePasses } from './governance-kit';

export interface DriftRecoverySignal {
  signalId: string;
  complianceStrength: number;
  recoveryPotential: number;
  driftLoad: number;
}

class DriftRecoveryBook extends SignalBook<DriftRecoverySignal> {}

class DriftRecoveryHarmonizer {
  harmonize(signal: DriftRecoverySignal): number {
    return Math.round((signal.complianceStrength * 0.45 + signal.recoveryPotential * 0.55 - signal.driftLoad) * 10) / 10;
  }
}

class DriftRecoveryGate {
  recoverable(score: number, threshold: number): boolean {
    return scorePasses(score, threshold);
  }
}

class DriftRecoveryReporter {
  report(signalId: string, score: number): string {
    const text = `Drift recovery ${signalId} score=${score}`;
    logger.debug('Drift recovery harmonized', { signalId, score });
    return text;
  }
}

export const driftRecoveryBook = new DriftRecoveryBook();
export const driftRecoveryHarmonizer = new DriftRecoveryHarmonizer();
export const driftRecoveryGate = new DriftRecoveryGate();
export const driftRecoveryReporter = new DriftRecoveryReporter();

export {
  DriftRecoveryBook,
  DriftRecoveryHarmonizer,
  DriftRecoveryGate,
  DriftRecoveryReporter
};



