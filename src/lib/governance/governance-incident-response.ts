/**
 * Phase 176: Governance Incident Response
 */

import { logger } from '../logger';

export interface GovernanceIncident {
  incidentId: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  createdAt: number;
  updatedAt: number;
}

class GovernanceIncidentManager {
  private incidents = new Map<string, GovernanceIncident>();
  private counter = 0;

  open(title: string, severity: GovernanceIncident['severity']): GovernanceIncident {
    const now = Date.now();
    const incident: GovernanceIncident = {
      incidentId: `gov-inc-${Date.now()}-${++this.counter}`,
      title,
      severity,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    this.incidents.set(incident.incidentId, incident);
    return incident;
  }

  transition(incidentId: string, status: GovernanceIncident['status']): GovernanceIncident | undefined {
    const current = this.incidents.get(incidentId);
    if (!current) return undefined;
    const next = { ...current, status, updatedAt: Date.now() };
    this.incidents.set(incidentId, next);
    return next;
  }

  list(): GovernanceIncident[] {
    return Array.from(this.incidents.values());
  }
}

class IncidentImpactAnalyzer {
  score(input: { severity: GovernanceIncident['severity']; affectedControls: number; affectedDomains: number }): number {
    const sev = input.severity === 'critical' ? 100 : input.severity === 'high' ? 75 : input.severity === 'medium' ? 45 : 20;
    return Math.min(100, sev + input.affectedControls * 2 + input.affectedDomains * 3);
  }
}

class RemediationPlaybookEngine {
  getPlaybook(severity: GovernanceIncident['severity']): string[] {
    if (severity === 'critical') return ['freeze-change', 'isolate-control', 'notify-exec', 'run-forensics'];
    if (severity === 'high') return ['isolate-control', 'notify-owner', 'validate-evidence'];
    return ['notify-owner', 'track-action'];
  }
}

class PostIncidentReviewEngine {
  createReview(incident: GovernanceIncident, findings: string[]): { incidentId: string; findings: string[]; createdAt: number } {
    logger.debug('Post incident review generated', { incidentId: incident.incidentId, findings: findings.length });
    return { incidentId: incident.incidentId, findings, createdAt: Date.now() };
  }
}

export const governanceIncidentManager = new GovernanceIncidentManager();
export const incidentImpactAnalyzer = new IncidentImpactAnalyzer();
export const remediationPlaybookEngine = new RemediationPlaybookEngine();
export const postIncidentReviewEngine = new PostIncidentReviewEngine();

export {
  GovernanceIncidentManager,
  IncidentImpactAnalyzer,
  RemediationPlaybookEngine,
  PostIncidentReviewEngine
};


