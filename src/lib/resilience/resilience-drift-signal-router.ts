/**
 * Phase 303: Resilience Drift Signal Router
 */

import { logger } from '../logger';

export interface ResilienceDriftSignal {
  signalId: string;
  driftMagnitude: number;
  resilienceLevel: number;
  urgency: number;
}

class ResilienceDriftBook {
  private signals: ResilienceDriftSignal[] = [];

  add(signal: ResilienceDriftSignal): ResilienceDriftSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): ResilienceDriftSignal[] {
    return this.signals;
  }
}

class ResilienceDriftScorer {
  score(signal: ResilienceDriftSignal): number {
    return Math.round((signal.urgency * 0.5 + signal.driftMagnitude * 0.3 - signal.resilienceLevel * 0.2) * 10) / 10;
  }
}

class ResilienceDriftRouter {
  route(signal: ResilienceDriftSignal): string {
    if (signal.urgency >= 80) {
      return 'priority-drift-lane';
    }
    if (signal.driftMagnitude >= 60) {
      return 'stabilization-lane';
    }
    return 'watch-lane';
  }
}

class ResilienceDriftReporter {
  report(signalId: string, route: string): string {
    const text = `Resilience drift ${signalId} route=${route}`;
    logger.debug('Resilience drift route reported', { signalId, route });
    return text;
  }
}

export const resilienceDriftBook = new ResilienceDriftBook();
export const resilienceDriftScorer = new ResilienceDriftScorer();
export const resilienceDriftRouter = new ResilienceDriftRouter();
export const resilienceDriftReporter = new ResilienceDriftReporter();

export {
  ResilienceDriftBook,
  ResilienceDriftScorer,
  ResilienceDriftRouter,
  ResilienceDriftReporter
};

