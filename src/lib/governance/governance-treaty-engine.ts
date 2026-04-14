/**
 * Phase 227: Governance Treaty Engine
 */

import { logger } from '../logger';

export interface TreatyClause {
  clauseId: string;
  title: string;
  controls: string[];
  mandatory: boolean;
}

class TreatyDraftManager {
  create(treatyId: string, clauses: TreatyClause[]): { treatyId: string; clauses: TreatyClause[]; revision: number } {
    return { treatyId, clauses, revision: 1 };
  }
}

class ClauseConflictDetector {
  detect(clauses: TreatyClause[]): Array<{ left: string; right: string; reason: string }> {
    const conflicts: Array<{ left: string; right: string; reason: string }> = [];
    for (let i = 0; i < clauses.length; i++) {
      for (let j = i + 1; j < clauses.length; j++) {
        const left = clauses[i];
        const right = clauses[j];
        const overlap = left.controls.filter(c => right.controls.includes(c));
        if (overlap.length > 0 && left.mandatory !== right.mandatory) {
          conflicts.push({ left: left.clauseId, right: right.clauseId, reason: `Mixed strictness on controls: ${overlap.join(', ')}` });
        }
      }
    }
    return conflicts;
  }
}

class TreatyRatificationPlanner {
  plan(stakeholders: string[], minApprovals: number): { stakeholders: string[]; minApprovals: number; quorumRatio: number } {
    const quorumRatio = stakeholders.length === 0 ? 0 : Math.round((minApprovals / stakeholders.length) * 1000) / 1000;
    return { stakeholders, minApprovals, quorumRatio };
  }
}

class TreatyAuditTrail {
  private events: Array<{ treatyId: string; action: string; timestamp: number }> = [];

  record(treatyId: string, action: string): void {
    this.events.push({ treatyId, action, timestamp: Date.now() });
    logger.debug('Treaty event recorded', { treatyId, action });
  }

  list() {
    return this.events;
  }
}

export const treatyDraftManager = new TreatyDraftManager();
export const clauseConflictDetector = new ClauseConflictDetector();
export const treatyRatificationPlanner = new TreatyRatificationPlanner();
export const treatyAuditTrail = new TreatyAuditTrail();

export {
  TreatyDraftManager,
  ClauseConflictDetector,
  TreatyRatificationPlanner,
  TreatyAuditTrail
};

