/**
 * Phase 299: Governance Signal Compression Engine
 */

import { logger } from '../logger';

export interface CompressionSignal {
  signalId: string;
  volume: number;
  relevance: number;
  noise: number;
}

class CompressionSignalBook {
  private signals: CompressionSignal[] = [];

  add(signal: CompressionSignal): CompressionSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): CompressionSignal[] {
    return this.signals;
  }
}

class CompressionScoreEngine {
  score(signal: CompressionSignal): number {
    return Math.round((signal.volume * 0.4 + signal.relevance * 0.6 - signal.noise) * 10) / 10;
  }
}

class CompressionQualityGate {
  pass(score: number, threshold: number): boolean {
    return score >= threshold;
  }
}

class CompressionReporter {
  report(signalId: string, score: number): string {
    const text = `Compression ${signalId} score=${score}`;
    logger.debug('Compression reported', { signalId, score });
    return text;
  }
}

export const compressionSignalBook = new CompressionSignalBook();
export const compressionScoreEngine = new CompressionScoreEngine();
export const compressionQualityGate = new CompressionQualityGate();
export const compressionReporter = new CompressionReporter();

export {
  CompressionSignalBook,
  CompressionScoreEngine,
  CompressionQualityGate,
  CompressionReporter
};

