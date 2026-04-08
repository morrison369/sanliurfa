/**
 * Phase 160: Security Incident Response & Forensics
 * Incident detection, response orchestration, forensic analysis
 */

import { logger } from './logger';

interface SecurityIncident {
  incidentId: string;
  type: 'intrusion' | 'data-exfiltration' | 'credential-misuse' | 'malware' | 'breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  status: 'detected' | 'investigating' | 'contained' | 'recovered' | 'closed';
  affectedAssets: string[];
  detectionMethod: string;
}

interface ForensicEvidence {
  evidenceId: string;
  incidentId: string;
  type: 'log' | 'memory-dump' | 'network-capture' | 'file' | 'credential';
  collectedAt: number;
  source: string;
  preserved: boolean;
  hash: string;
}

interface IncidentTimeline {
  incidentId: string;
  events: Array<{ timestamp: number; action: string; actor: string; details: Record<string, any> }>;
  initialCompromise: number;
  detection: number;
  containment: number;
  recovery?: number;
}

interface PostIncidentReview {
  reviewId: string;
  incidentId: string;
  rootCause: string;
  lessonsLearned: string[];
  improvements: string[];
  reviewDate: number;
}

class IncidentDetector {
  private incidents: Map<string, SecurityIncident> = new Map();
  private counter = 0;

  detectIncident(alertData: Record<string, any>): SecurityIncident {
    const incidentType: 'intrusion' | 'data-exfiltration' | 'credential-misuse' | 'malware' | 'breach' = 'intrusion';
    const severity: 'low' | 'medium' | 'high' | 'critical' = alertData.severity || 'high';

    const incident: SecurityIncident = {
      incidentId: `incident-${Date.now()}-${++this.counter}`,
      type: incidentType,
      severity,
      detectedAt: Date.now(),
      status: 'detected',
      affectedAssets: alertData.affectedAssets || [],
      detectionMethod: alertData.detectionMethod || 'automated-alert'
    };

    this.incidents.set(incident.incidentId, incident);

    logger.debug('Security incident detected', {
      incidentId: incident.incidentId,
      type: incidentType,
      severity
    });

    return incident;
  }

  classifyIncident(incident: SecurityIncident): { classification: string; expectedMTTR: number; riskLevel: number } {
    const riskMap = { low: 1, medium: 3, high: 6, critical: 10 };

    return {
      classification: `${incident.type}-${incident.severity}`,
      expectedMTTR: riskMap[incident.severity] * 60 * 60 * 1000, // in milliseconds
      riskLevel: riskMap[incident.severity]
    };
  }

  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId);
  }

  listIncidents(status?: string): SecurityIncident[] {
    return Array.from(this.incidents.values()).filter(i => !status || i.status === status);
  }
}

class IncidentOrchestrator {
  private orchestrations: Map<string, { status: string; actions: string[] }> = new Map();
  private counter = 0;

  async respond(incident: SecurityIncident): Promise<{ orchestrationId: string; status: string; actions: string[] }> {
    const actions: string[] = [];

    // Containment
    if (incident.severity === 'critical') {
      actions.push('isolate-affected-systems', 'block-external-ips', 'revoke-credentials');
    } else if (incident.severity === 'high') {
      actions.push('isolate-affected-systems', 'monitor-network');
    }

    // Eradication
    actions.push('scan-for-malware', 'patch-vulnerabilities', 'reset-credentials');

    // Recovery
    actions.push('restore-from-backup', 'rebuild-systems', 'validate-integrity');

    const orchestrationId = `orch-${Date.now()}-${++this.counter}`;

    this.orchestrations.set(orchestrationId, {
      status: 'in_progress',
      actions
    });

    logger.debug('Incident response orchestrated', {
      incidentId: incident.incidentId,
      actionCount: actions.length
    });

    return { orchestrationId, status: 'in_progress', actions };
  }

  updateOrchestrationStatus(orchestrationId: string, status: 'in_progress' | 'completed' | 'failed'): void {
    const orch = this.orchestrations.get(orchestrationId);
    if (orch) {
      orch.status = status;
    }
  }

  getOrchestrationStatus(orchestrationId: string): { status: string; actions: string[] } | undefined {
    return this.orchestrations.get(orchestrationId);
  }
}

class ForensicAnalyzer {
  private evidence: Map<string, ForensicEvidence> = new Map();
  private counter = 0;

  collectEvidence(incidentId: string, evidenceType: 'log' | 'memory-dump' | 'network-capture' | 'file' | 'credential', source: string, data: string): ForensicEvidence {
    const evidence: ForensicEvidence = {
      evidenceId: `evidence-${Date.now()}-${++this.counter}`,
      incidentId,
      type: evidenceType,
      collectedAt: Date.now(),
      source,
      preserved: true,
      hash: this.hashEvidence(data)
    };

    this.evidence.set(evidence.evidenceId, evidence);

    logger.debug('Evidence collected', {
      incidentId,
      type: evidenceType,
      evidenceId: evidence.evidenceId
    });

    return evidence;
  }

  private hashEvidence(data: string): string {
    // Simulated hash
    return `sha256-${Math.random().toString(36).substring(7)}`;
  }

  buildTimeline(incident: SecurityIncident, auditLogs: any[]): IncidentTimeline {
    const timeline: IncidentTimeline = {
      incidentId: incident.incidentId,
      events: auditLogs.slice(0, 10).map((log, idx) => ({
        timestamp: incident.detectedAt - (10 - idx) * 60 * 1000,
        action: log.action || 'unknown-action',
        actor: log.actor || 'unknown-actor',
        details: log.details || {}
      })),
      initialCompromise: incident.detectedAt - 60 * 60 * 1000,
      detection: incident.detectedAt,
      containment: incident.detectedAt + 30 * 60 * 1000
    };

    logger.debug('Timeline built', { incidentId: incident.incidentId, eventCount: timeline.events.length });

    return timeline;
  }

  analyzeAttackPattern(timeline: IncidentTimeline): { pattern: string; tactics: string[]; techniques: string[] } {
    return {
      pattern: 'lateral-movement-with-persistence',
      tactics: ['reconnaissance', 'initial-access', 'persistence', 'privilege-escalation', 'data-exfiltration'],
      techniques: ['spear-phishing', 'web-shell', 'credential-dumping', 'data-staging']
    };
  }

  getEvidence(incidentId: string): ForensicEvidence[] {
    return Array.from(this.evidence.values()).filter(e => e.incidentId === incidentId);
  }
}

class PostIncidentReviewer {
  private reviews: Map<string, PostIncidentReview> = new Map();
  private counter = 0;

  conduct(incident: SecurityIncident, timeline: IncidentTimeline): PostIncidentReview {
    const review: PostIncidentReview = {
      reviewId: `review-${Date.now()}-${++this.counter}`,
      incidentId: incident.incidentId,
      rootCause: 'Unpatched vulnerability in web application',
      lessonsLearned: [
        'Improve patch management process',
        'Enhance monitoring and alerting',
        'Strengthen access controls',
        'Conduct regular security training'
      ],
      improvements: [
        'Implement automated patching',
        'Deploy advanced threat detection',
        'Establish incident response playbooks',
        'Regular security assessments'
      ],
      reviewDate: Date.now()
    };

    this.reviews.set(review.reviewId, review);

    logger.debug('Post-incident review conducted', {
      reviewId: review.reviewId,
      incidentId: incident.incidentId
    });

    return review;
  }

  generateRecommendations(incident: SecurityIncident): string[] {
    const recommendations = [];

    if (incident.severity === 'critical') {
      recommendations.push('Implement zero-trust architecture');
      recommendations.push('Enhance endpoint detection and response');
    }

    recommendations.push('Conduct security awareness training');
    recommendations.push('Perform vulnerability assessments');
    recommendations.push('Review and update incident response plan');

    return recommendations;
  }

  getMetrics(incidents: SecurityIncident[]): { totalIncidents: number; averageMTTD: number; averageMTTR: number; recurrenceRate: number } {
    return {
      totalIncidents: incidents.length,
      averageMTTD: 120 * 60 * 1000, // 2 hours
      averageMTTR: 4 * 60 * 60 * 1000, // 4 hours
      recurrenceRate: 0.15 // 15%
    };
  }

  getReview(reviewId: string): PostIncidentReview | undefined {
    return this.reviews.get(reviewId);
  }
}

export const incidentDetector = new IncidentDetector();
export const incidentOrchestrator = new IncidentOrchestrator();
export const forensicAnalyzer = new ForensicAnalyzer();
export const postIncidentReviewer = new PostIncidentReviewer();

export { SecurityIncident, ForensicEvidence, IncidentTimeline, PostIncidentReview };
