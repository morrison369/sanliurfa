/**
 * Phase 316: Policy Recovery Stability Engine
 */

import { logger } from '../logger';

export interface RecoveryStabilitySignal {
  signalId: string;
  recoveryProgress: number;
  policyStability: number;
  fragility: number;
}

class RecoveryStabilityBook {
  private signals: RecoveryStabilitySignal[] = [];

  add(signal: RecoveryStabilitySignal): RecoveryStabilitySignal {
    this.signals.push(signal);
    return signal;
  }

  list(): RecoveryStabilitySignal[] {
    return this.signals;
  }
}

class RecoveryStabilityEngine {
  evaluate(signal: RecoveryStabilitySignal): number {
    return Math.round((signal.recoveryProgress * 0.5 + signal.policyStability * 0.5 - signal.fragility) * 10) / 10;
  }
}

class RecoveryStabilityGate {
  stable(score: number, threshold: number): boolean {
    return score >= threshold;
  }
}

class RecoveryStabilityReporter {
  report(signalId: string, score: number): string {
    const text = `Recovery stability ${signalId} score=${score}`;
    logger.debug('Recovery stability reported', { signalId, score });
    return text;
  }
}

export const recoveryStabilityBook = new RecoveryStabilityBook();
export const recoveryStabilityEngine = new RecoveryStabilityEngine();
export const recoveryStabilityGate = new RecoveryStabilityGate();
export const recoveryStabilityReporter = new RecoveryStabilityReporter();

export {
  RecoveryStabilityBook,
  RecoveryStabilityEngine,
  RecoveryStabilityGate,
  RecoveryStabilityReporter
};

