/**
 * Phase 309: Resilience Drift Containment Coordinator
 */

import { logger } from '../logger';

export interface DriftContainmentSignal {
  signalId: string;
  driftRisk: number;
  containmentCapacity: number;
  responseLag: number;
}

class DriftContainmentStore {
  private signals: DriftContainmentSignal[] = [];

  add(signal: DriftContainmentSignal): DriftContainmentSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): DriftContainmentSignal[] {
    return this.signals;
  }
}

class DriftContainmentCoordinator {
  coordinate(signal: DriftContainmentSignal): number {
    return Math.round((signal.containmentCapacity * 0.6 - signal.driftRisk * 0.2 - signal.responseLag * 0.2) * 10) / 10;
  }
}

class DriftContainmentRoute {
  route(signal: DriftContainmentSignal): string {
    if (signal.driftRisk >= 80) {
      return 'critical-containment';
    }
    if (signal.containmentCapacity >= 70) {
      return 'active-containment';
    }
    return 'monitor-containment';
  }
}

class DriftContainmentReporter {
  report(signalId: string, route: string): string {
    const text = `Drift containment ${signalId} route=${route}`;
    logger.debug('Drift containment reported', { signalId, route });
    return text;
  }
}

export const driftContainmentStore = new DriftContainmentStore();
export const driftContainmentCoordinator = new DriftContainmentCoordinator();
export const driftContainmentRoute = new DriftContainmentRoute();
export const driftContainmentReporter = new DriftContainmentReporter();

export {
  DriftContainmentStore,
  DriftContainmentCoordinator,
  DriftContainmentRoute,
  DriftContainmentReporter
};

