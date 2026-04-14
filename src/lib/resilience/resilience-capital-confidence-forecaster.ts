/**
 * Phase 314: Resilience Capital Confidence Forecaster
 */

import { logger } from '../logger';

export interface CapitalConfidenceSignal {
  signalId: string;
  capitalStrength: number;
  resilienceDepth: number;
  riskDrag: number;
}

class CapitalConfidenceBook {
  private signals: CapitalConfidenceSignal[] = [];

  add(signal: CapitalConfidenceSignal): CapitalConfidenceSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): CapitalConfidenceSignal[] {
    return this.signals;
  }
}

class CapitalConfidenceForecaster {
  forecast(signal: CapitalConfidenceSignal): number {
    return Math.round((signal.capitalStrength * 0.55 + signal.resilienceDepth * 0.45 - signal.riskDrag) * 10) / 10;
  }
}

class CapitalConfidenceGate {
  confident(score: number, threshold: number): boolean {
    return score >= threshold;
  }
}

class CapitalConfidenceReporter {
  report(signalId: string, score: number): string {
    const text = `Capital confidence ${signalId} score=${score}`;
    logger.debug('Capital confidence reported', { signalId, score });
    return text;
  }
}

export const capitalConfidenceBook = new CapitalConfidenceBook();
export const capitalConfidenceForecaster = new CapitalConfidenceForecaster();
export const capitalConfidenceGate = new CapitalConfidenceGate();
export const capitalConfidenceReporter = new CapitalConfidenceReporter();

export {
  CapitalConfidenceBook,
  CapitalConfidenceForecaster,
  CapitalConfidenceGate,
  CapitalConfidenceReporter
};

