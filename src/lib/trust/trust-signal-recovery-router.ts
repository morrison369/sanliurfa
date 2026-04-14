/**
 * Phase 255: Trust Signal Recovery Router
 */

import { logger } from '../logger';

export interface TrustSignal {
  signalId: string;
  segment: string;
  degradation: number;
  recoveryPotential: number;
}

class TrustSignalBuffer {
  private signals: TrustSignal[] = [];

  push(signal: TrustSignal): TrustSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): TrustSignal[] {
    return this.signals;
  }
}

class RecoveryPriorityRouter {
  route(signal: TrustSignal): 'urgent' | 'normal' {
    return signal.degradation >= 70 ? 'urgent' : 'normal';
  }
}

class RecoveryCapacityPlanner {
  plan(signals: TrustSignal[], capacity: number): TrustSignal[] {
    return [...signals]
      .sort((a, b) => (b.degradation + b.recoveryPotential) - (a.degradation + a.recoveryPotential))
      .slice(0, capacity);
  }
}

class RecoveryRouteReporter {
  report(segment: string, route: string): string {
    const text = `Segment ${segment} routed to ${route}`;
    logger.debug('Recovery route reported', { segment, route });
    return text;
  }
}

export const trustSignalBuffer = new TrustSignalBuffer();
export const recoveryPriorityRouter = new RecoveryPriorityRouter();
export const recoveryCapacityPlanner = new RecoveryCapacityPlanner();
export const recoveryRouteReporter = new RecoveryRouteReporter();

export {
  TrustSignalBuffer,
  RecoveryPriorityRouter,
  RecoveryCapacityPlanner,
  RecoveryRouteReporter
};

