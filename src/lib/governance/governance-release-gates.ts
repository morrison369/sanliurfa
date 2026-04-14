/**
 * Phase 184: Governance Release Gates
 */

import { logger } from '../logger';

export interface GovernanceGateCheck {
  checkId: string;
  name: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class GovernanceReleaseGateEngine {
  evaluate(checks: GovernanceGateCheck[]): { approved: boolean; blockingChecks: string[] } {
    const blockers = checks
      .filter(c => !c.passed && (c.severity === 'high' || c.severity === 'critical'))
      .map(c => c.checkId);
    return { approved: blockers.length === 0, blockingChecks: blockers };
  }
}

class GatePolicyBuilder {
  requiredChecks(profile: 'strict' | 'balanced'): string[] {
    if (profile === 'strict') return ['slo', 'exceptions', 'attestations', 'regulatory-mapping', 'lineage'];
    return ['slo', 'exceptions', 'attestations'];
  }
}

class DeploymentReadinessScorer {
  score(checks: GovernanceGateCheck[]): number {
    if (checks.length === 0) return 0;
    const passed = checks.filter(c => c.passed).length;
    return Math.round((passed / checks.length) * 1000) / 10;
  }
}

class GateDecisionAudit {
  private entries: Array<{ releaseId: string; approved: boolean; timestamp: number }> = [];

  record(releaseId: string, approved: boolean): void {
    this.entries.push({ releaseId, approved, timestamp: Date.now() });
    logger.debug('Gate decision recorded', { releaseId, approved });
  }

  list() {
    return this.entries;
  }
}

export const governanceReleaseGateEngine = new GovernanceReleaseGateEngine();
export const gatePolicyBuilder = new GatePolicyBuilder();
export const deploymentReadinessScorer = new DeploymentReadinessScorer();
export const gateDecisionAudit = new GateDecisionAudit();

export {
  GovernanceReleaseGateEngine,
  GatePolicyBuilder,
  DeploymentReadinessScorer,
  GateDecisionAudit
};


