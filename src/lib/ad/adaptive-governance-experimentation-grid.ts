/**
 * Phase 233: Adaptive Governance Experimentation Grid
 */

import { logger } from '../logger';

export interface GovernanceExperiment {
  experimentId: string;
  hypothesis: string;
  expectedImpact: number;
  blastRadius: number;
}

class ExperimentGridManager {
  private experiments: GovernanceExperiment[] = [];

  register(experiment: GovernanceExperiment): GovernanceExperiment {
    this.experiments.push(experiment);
    return experiment;
  }

  list(): GovernanceExperiment[] {
    return this.experiments;
  }
}

class ExperimentSafetyGate {
  approve(experiment: GovernanceExperiment, maxBlastRadius: number): boolean {
    return experiment.blastRadius <= maxBlastRadius;
  }
}

class ExperimentImpactEstimator {
  estimate(expectedImpact: number, confidence: number): number {
    return Math.round(expectedImpact * confidence * 10) / 10;
  }
}

class ExperimentLearningRecorder {
  private learnings: Array<{ experimentId: string; finding: string; timestamp: number }> = [];

  record(experimentId: string, finding: string): void {
    this.learnings.push({ experimentId, finding, timestamp: Date.now() });
    logger.debug('Experiment learning recorded', { experimentId });
  }

  list() {
    return this.learnings;
  }
}

export const experimentGridManager = new ExperimentGridManager();
export const experimentSafetyGate = new ExperimentSafetyGate();
export const experimentImpactEstimator = new ExperimentImpactEstimator();
export const experimentLearningRecorder = new ExperimentLearningRecorder();

export {
  ExperimentGridManager,
  ExperimentSafetyGate,
  ExperimentImpactEstimator,
  ExperimentLearningRecorder
};

