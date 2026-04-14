/**
 * Phase 282: Policy Trust Recovery Hub
 */

import { logger } from '../logger';

export interface TrustRecoveryCase {
  caseId: string;
  trustDeficit: number;
  interventionPower: number;
}

class TrustRecoveryRegistry {
  private cases: TrustRecoveryCase[] = [];

  add(recoveryCase: TrustRecoveryCase): TrustRecoveryCase {
    this.cases.push(recoveryCase);
    return recoveryCase;
  }

  list(): TrustRecoveryCase[] {
    return this.cases;
  }
}

class RecoveryPathPlanner {
  plan(recoveryCase: TrustRecoveryCase): 'rapid' | 'staged' {
    return recoveryCase.trustDeficit >= 70 ? 'rapid' : 'staged';
  }
}

class RecoveryProgressEstimator {
  estimate(recoveryCase: TrustRecoveryCase): number {
    return Math.min(100, Math.round((recoveryCase.interventionPower / Math.max(1, recoveryCase.trustDeficit)) * 100 * 10) / 10);
  }
}

class TrustRecoveryReporter {
  report(caseId: string, progress: number): string {
    const text = `Trust recovery ${caseId} progress=${progress}`;
    logger.debug('Trust recovery report', { caseId, progress });
    return text;
  }
}

export const trustRecoveryRegistry = new TrustRecoveryRegistry();
export const recoveryPathPlanner = new RecoveryPathPlanner();
export const recoveryProgressEstimator = new RecoveryProgressEstimator();
export const trustRecoveryReporter = new TrustRecoveryReporter();

export {
  TrustRecoveryRegistry,
  RecoveryPathPlanner,
  RecoveryProgressEstimator,
  TrustRecoveryReporter
};

