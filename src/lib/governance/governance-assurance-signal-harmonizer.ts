/**
 * Phase 305: Governance Assurance Signal Harmonizer
 */

import { logger } from '../logger';

export interface AssuranceSignal {
  signalId: string;
  assuranceLevel: number;
  alignment: number;
  distortion: number;
}

class AssuranceSignalStore {
  private signals: AssuranceSignal[] = [];

  add(signal: AssuranceSignal): AssuranceSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): AssuranceSignal[] {
    return this.signals;
  }
}

class AssuranceSignalHarmonizer {
  harmonize(signal: AssuranceSignal): number {
    return Math.round((signal.assuranceLevel * 0.5 + signal.alignment * 0.5 - signal.distortion) * 10) / 10;
  }
}

class AssuranceHarmonyGate {
  pass(score: number, threshold: number): boolean {
    return score >= threshold;
  }
}

class AssuranceHarmonyReporter {
  report(signalId: string, score: number): string {
    const text = `Assurance harmony ${signalId} score=${score}`;
    logger.debug('Assurance harmony reported', { signalId, score });
    return text;
  }
}

export const assuranceSignalStore = new AssuranceSignalStore();
export const assuranceSignalHarmonizer = new AssuranceSignalHarmonizer();
export const assuranceHarmonyGate = new AssuranceHarmonyGate();
export const assuranceHarmonyReporter = new AssuranceHarmonyReporter();

export {
  AssuranceSignalStore,
  AssuranceSignalHarmonizer,
  AssuranceHarmonyGate,
  AssuranceHarmonyReporter
};


