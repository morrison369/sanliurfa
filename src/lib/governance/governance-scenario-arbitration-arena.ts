/**
 * Phase 249: Governance Scenario Arbitration Arena
 */

import { logger } from '../logger';

export interface ScenarioOption {
  optionId: string;
  risk: number;
  value: number;
  trust: number;
}

class ScenarioArenaBuilder {
  build(options: ScenarioOption[]): { options: ScenarioOption[]; count: number } {
    return { options, count: options.length };
  }
}

class ScenarioArbitrationJudge {
  choose(options: ScenarioOption[]): ScenarioOption | undefined {
    return [...options].sort((a, b) => (b.value + b.trust - b.risk) - (a.value + a.trust - a.risk))[0];
  }
}

class ScenarioConsensusTracker {
  consensus(votes: Array<'A' | 'B' | 'C'>): { winner: string; count: number } {
    const tally = new Map<string, number>();
    for (const vote of votes) tally.set(vote, (tally.get(vote) || 0) + 1);
    let winner = '';
    let count = 0;
    for (const [key, value] of tally.entries()) {
      if (value > count) {
        winner = key;
        count = value;
      }
    }
    return { winner, count };
  }
}

class ScenarioArbitrationNarrator {
  narrate(optionId: string): string {
    const text = `Arbitration winner: ${optionId}`;
    logger.debug('Scenario arbitration narrated', { optionId });
    return text;
  }
}

export const scenarioArenaBuilder = new ScenarioArenaBuilder();
export const scenarioArbitrationJudge = new ScenarioArbitrationJudge();
export const scenarioConsensusTracker = new ScenarioConsensusTracker();
export const scenarioArbitrationNarrator = new ScenarioArbitrationNarrator();

export {
  ScenarioArenaBuilder,
  ScenarioArbitrationJudge,
  ScenarioConsensusTracker,
  ScenarioArbitrationNarrator
};

