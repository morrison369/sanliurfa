/**
 * Phase 247: Autonomous Remediation Confidence Engine
 */

import { logger } from '../logger';

export interface RemediationSignal {
  signalId: string;
  effectiveness: number;
  stability: number;
}

class ConfidenceModelBuilder {
  score(signal: RemediationSignal): number {
    return Math.round((signal.effectiveness * 0.7 + signal.stability * 0.3) * 10) / 10;
  }
}

class RemediationRiskGate {
  allow(confidence: number, threshold: number): boolean {
    return confidence >= threshold;
  }
}

class ConfidenceTrendTracker {
  trend(values: number[]): 'up' | 'down' | 'flat' {
    if (values.length < 2) return 'flat';
    const delta = values[values.length - 1] - values[0];
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'flat';
  }
}

class RemediationConfidenceReporter {
  report(confidence: number, decision: boolean): string {
    const text = `Confidence ${confidence}, auto-remediate=${decision}.`;
    logger.debug('Remediation confidence report', { confidence, decision });
    return text;
  }
}

export const confidenceModelBuilder = new ConfidenceModelBuilder();
export const remediationRiskGate = new RemediationRiskGate();
export const confidenceTrendTracker = new ConfidenceTrendTracker();
export const remediationConfidenceReporter = new RemediationConfidenceReporter();

export {
  ConfidenceModelBuilder,
  RemediationRiskGate,
  ConfidenceTrendTracker,
  RemediationConfidenceReporter
};

