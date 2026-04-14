/**
 * Phase 257: Dynamic Compliance Horizon Scanner
 */

import { logger } from '../logger';

export interface HorizonSignal {
  signalId: string;
  source: string;
  urgency: number;
  relevance: number;
}

class HorizonFeedCollector {
  private signals: HorizonSignal[] = [];

  add(signal: HorizonSignal): HorizonSignal {
    this.signals.push(signal);
    return signal;
  }

  list(): HorizonSignal[] {
    return this.signals;
  }
}

class HorizonPriorityScorer {
  score(signal: HorizonSignal): number {
    return Math.round((signal.urgency * 0.6 + signal.relevance * 0.4) * 10) / 10;
  }
}

class HorizonDriftDetector {
  detect(scores: number[], threshold: number): boolean {
    if (scores.length === 0) return false;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return max - min >= threshold;
  }
}

class HorizonNarrativePublisher {
  publish(count: number, topScore: number): string {
    const text = `Horizon scan processed ${count} signals, top score ${topScore}.`;
    logger.debug('Horizon narrative published', { count, topScore });
    return text;
  }
}

export const horizonFeedCollector = new HorizonFeedCollector();
export const horizonPriorityScorer = new HorizonPriorityScorer();
export const horizonDriftDetector = new HorizonDriftDetector();
export const horizonNarrativePublisher = new HorizonNarrativePublisher();

export {
  HorizonFeedCollector,
  HorizonPriorityScorer,
  HorizonDriftDetector,
  HorizonNarrativePublisher
};

