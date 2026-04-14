/**
 * Phase 315: Board Assurance Drift Coordinator
 */

import { logger } from '../logger';

export interface BoardDriftSignal {
  signalId: string;
  boardAssurance: number;
  driftIndex: number;
  coordinationLag: number;
}

class BoardDriftBook {
  private signals: BoardDriftSignal[] = [];

  add(signal: BoardDriftSignal): BoardDriftSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): BoardDriftSignal[] {
    return this.signals;
  }
}

class BoardDriftCoordinator {
  coordinate(signal: BoardDriftSignal): number {
    return Math.round((signal.boardAssurance * 0.6 - signal.driftIndex * 0.25 - signal.coordinationLag * 0.15) * 10) / 10;
  }
}

class BoardDriftRoute {
  route(signal: BoardDriftSignal): string {
    if (signal.driftIndex >= 70) {
      return 'board-drift-priority';
    }
    if (signal.boardAssurance >= 75) {
      return 'board-drift-balanced';
    }
    return 'board-drift-monitor';
  }
}

class BoardDriftReporter {
  report(signalId: string, route: string): string {
    const text = `Board drift ${signalId} route=${route}`;
    logger.debug('Board drift route reported', { signalId, route });
    return text;
  }
}

export const boardDriftBook = new BoardDriftBook();
export const boardDriftCoordinator = new BoardDriftCoordinator();
export const boardDriftRoute = new BoardDriftRoute();
export const boardDriftReporter = new BoardDriftReporter();

export {
  BoardDriftBook,
  BoardDriftCoordinator,
  BoardDriftRoute,
  BoardDriftReporter
};

