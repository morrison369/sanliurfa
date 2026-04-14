/**
 * Phase 288: Policy Drift Stress Router
 */

import { logger } from '../logger';

export interface DriftStressSignal {
  signalId: string;
  driftLevel: number;
  stressLevel: number;
  domain: string;
}

class DriftStressBuffer {
  private signals: DriftStressSignal[] = [];

  add(signal: DriftStressSignal): DriftStressSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): DriftStressSignal[] {
    return this.signals;
  }
}

class DriftStressScorer {
  score(signal: DriftStressSignal): number {
    return Math.round((signal.driftLevel * 0.5 + signal.stressLevel * 0.5) * 10) / 10;
  }
}

class StressRouteResolver {
  resolve(signal: DriftStressSignal): string {
    const score = this.score(signal);
    if (score >= 80) return `${signal.domain}-critical`;
    if (score >= 50) return `${signal.domain}-priority`;
    return `${signal.domain}-standard`;
  }

  private score(signal: DriftStressSignal): number {
    return (signal.driftLevel + signal.stressLevel) / 2;
  }
}

class DriftStressReporter {
  report(signalId: string, route: string): string {
    const text = `Drift-stress ${signalId} route=${route}`;
    logger.debug('Drift stress report', { signalId, route });
    return text;
  }
}

export const driftStressBuffer = new DriftStressBuffer();
export const driftStressScorer = new DriftStressScorer();
export const stressRouteResolver = new StressRouteResolver();
export const driftStressReporter = new DriftStressReporter();

export {
  DriftStressBuffer,
  DriftStressScorer,
  StressRouteResolver,
  DriftStressReporter
};

