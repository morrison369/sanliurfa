/**
 * Phase 232: Governance Decision Replay Lab
 */

import { logger } from '../logger';

export interface DecisionReplayEvent {
  eventId: string;
  actor: string;
  outcome: string;
  confidence: number;
}

class ReplayTimelineBuilder {
  build(events: DecisionReplayEvent[]): { ordered: DecisionReplayEvent[]; count: number } {
    return { ordered: [...events], count: events.length };
  }
}

class ReplayOutcomeComparator {
  compare(original: string, replayed: string): { consistent: boolean; delta: string } {
    const consistent = original === replayed;
    return { consistent, delta: consistent ? 'none' : `${original} -> ${replayed}` };
  }
}

class ReplaySensitivityAnalyzer {
  analyze(confidences: number[]): number {
    if (confidences.length === 0) return 0;
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((acc, c) => acc + (c - mean) ** 2, 0) / confidences.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  }
}

class ReplayGovernanceReporter {
  report(replayId: string, consistent: boolean, volatility: number): string {
    const text = `Replay ${replayId}: consistent=${consistent}, volatility=${volatility}.`;
    logger.debug('Replay report generated', { replayId, consistent, volatility });
    return text;
  }
}

export const replayTimelineBuilder = new ReplayTimelineBuilder();
export const replayOutcomeComparator = new ReplayOutcomeComparator();
export const replaySensitivityAnalyzer = new ReplaySensitivityAnalyzer();
export const replayGovernanceReporter = new ReplayGovernanceReporter();

export {
  ReplayTimelineBuilder,
  ReplayOutcomeComparator,
  ReplaySensitivityAnalyzer,
  ReplayGovernanceReporter
};

