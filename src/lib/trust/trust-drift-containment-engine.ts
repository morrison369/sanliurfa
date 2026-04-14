/**
 * Phase 279: Trust Drift Containment Engine
 */

import { logger } from '../logger';

export interface TrustDriftSignal {
  signalId: string;
  drift: number;
  blastRadius: number;
  recoverability: number;
}

class DriftSignalRegistry {
  private signals: TrustDriftSignal[] = [];

  add(signal: TrustDriftSignal): TrustDriftSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): TrustDriftSignal[] {
    return this.signals;
  }
}

class DriftContainmentPlanner {
  plan(signal: TrustDriftSignal): 'contain' | 'mitigate' | 'escalate' {
    const severity = signal.drift + signal.blastRadius - signal.recoverability;
    if (severity >= 110) return 'escalate';
    if (severity >= 60) return 'mitigate';
    return 'contain';
  }
}

class DriftContainmentSimulator {
  simulate(signal: TrustDriftSignal, actionStrength: number): number {
    return Math.max(0, Math.round((signal.drift - actionStrength * 0.8) * 10) / 10);
  }
}

class DriftContainmentReporter {
  report(signalId: string, action: string): string {
    const text = `Drift ${signalId} action=${action}`;
    logger.debug('Drift containment report', { signalId, action });
    return text;
  }
}

export const driftSignalRegistry = new DriftSignalRegistry();
export const driftContainmentPlanner = new DriftContainmentPlanner();
export const driftContainmentSimulator = new DriftContainmentSimulator();
export const driftContainmentReporter = new DriftContainmentReporter();

export {
  DriftSignalRegistry,
  DriftContainmentPlanner,
  DriftContainmentSimulator,
  DriftContainmentReporter
};

