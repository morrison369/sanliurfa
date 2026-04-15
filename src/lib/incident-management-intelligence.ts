/**
 * Phase 315: Incident Management Intelligence
 * Incident tracking, MTTR analytics, post-mortem insights, SLA management
 */

import { logger } from './logger';

interface IncidentRecord {
  incidentId: string;
  title: string;
  description: string;
  severity: 'sev1_critical' | 'sev2_major' | 'sev3_minor' | 'sev4_low';
  category: 'infrastructure' | 'application' | 'security' | 'data' | 'network' | 'third_party';
  affectedService: string;
  affectedTeam: string;
  incidentCommanderId?: string;
  detectedAt: number;
  acknowledgedAt?: number;
  mitigatedAt?: number;
  resolvedAt?: number;
  timeToAcknowledgeMinutes?: number;
  timeToMitigateMinutes?: number;
  timeToResolveMinutes?: number;
  slaTargetMinutes: number;
  slaBreached: boolean;
  customersAffected: number;
  revenueImpactUSD: number;
  rootCause?: string;
  postMortemStatus: 'not_required' | 'pending' | 'in_progress' | 'completed';
  recurrence: boolean;
  status: 'open' | 'acknowledged' | 'mitigated' | 'resolved' | 'closed';
  createdAt: number;
}

interface PostMortemRecord {
  postMortemId: string;
  incidentId: string;
  incidentTitle: string;
  severity: string;
  conductedBy: string;
  conductedAt: number;
  timeline: { time: string; event: string }[];
  rootCauses: string[];
  contributingFactors: string[];
  actionItems: { action: string; owner: string; dueDate: number; status: 'open' | 'completed' }[];
  actionItemsOpen: number;
  blameless: boolean;
  preventionRecommendations: string[];
  detectionGapMinutes: number;     // time from incident start to detection
  publishedAt?: number;
  status: 'draft' | 'review' | 'published';
}

interface IncidentMetricsRecord {
  recordId: string;
  period: string;
  totalIncidents: number;
  incidentsBySeverity: Record<string, number>;
  mttrMinutes: number;             // Mean Time To Resolution
  mttaMinutes: number;             // Mean Time To Acknowledge
  mtbfHours: number;               // Mean Time Between Failures
  slaCompliancePct: number;
  recurrenceRatePct: number;
  totalCustomersAffected: number;
  totalRevenueImpactUSD: number;
  openActionItems: number;
  topRootCauses: { cause: string; count: number }[];
  calculatedAt: number;
}

interface IncidentTrendRecord {
  recordId: string;
  period: string;
  service: string;
  incidentCount: number;
  avgMttrMinutes: number;
  avgSeverityScore: number;        // 1-4 (sev1=4, sev4=1)
  revenueImpactUSD: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
  calculatedAt: number;
}

class IncidentManager {
  private incidents: Map<string, IncidentRecord> = new Map();
  private counter = 0;

  private slaTargets: Record<IncidentRecord['severity'], number> = {
    sev1_critical: 60, sev2_major: 240, sev3_minor: 1440, sev4_low: 4320
  };

  open(title: string, desc: string, severity: IncidentRecord['severity'], category: IncidentRecord['category'], service: string, team: string, customersAffected: number, revenueImpactUSD: number): IncidentRecord {
    const incidentId = `inc-${Date.now()}-${++this.counter}`;
    const requiresPostMortem = severity === 'sev1_critical' || severity === 'sev2_major';
    const record: IncidentRecord = {
      incidentId, title, description: desc, severity, category,
      affectedService: service, affectedTeam: team,
      detectedAt: Date.now(), slaTargetMinutes: this.slaTargets[severity],
      slaBreached: false, customersAffected, revenueImpactUSD,
      postMortemStatus: requiresPostMortem ? 'pending' : 'not_required',
      recurrence: false, status: 'open', createdAt: Date.now()
    };
    this.incidents.set(incidentId, record);
    logger.debug('Incident opened', { incidentId, severity, service });
    return record;
  }

  acknowledge(incidentId: string, commanderId: string): boolean {
    const inc = this.incidents.get(incidentId);
    if (!inc) return false;
    inc.acknowledgedAt = Date.now();
    inc.incidentCommanderId = commanderId;
    inc.timeToAcknowledgeMinutes = Math.round((Date.now() - inc.detectedAt) / 60000);
    inc.status = 'acknowledged';
    return true;
  }

  resolve(incidentId: string, rootCause: string, recurrence: boolean): boolean {
    const inc = this.incidents.get(incidentId);
    if (!inc) return false;
    inc.resolvedAt = Date.now();
    inc.timeToResolveMinutes = Math.round((Date.now() - inc.detectedAt) / 60000);
    inc.slaBreached = inc.timeToResolveMinutes > inc.slaTargetMinutes;
    inc.rootCause = rootCause;
    inc.recurrence = recurrence;
    inc.status = 'resolved';
    return true;
  }

  getOpenIncidents(): IncidentRecord[] {
    return Array.from(this.incidents.values())
      .filter(i => i.status === 'open' || i.status === 'acknowledged')
      .sort((a, b) => {
        const sev = { sev1_critical: 4, sev2_major: 3, sev3_minor: 2, sev4_low: 1 };
        return sev[b.severity] - sev[a.severity];
      });
  }

  getPendingPostMortems(): IncidentRecord[] {
    return Array.from(this.incidents.values()).filter(i => i.postMortemStatus === 'pending');
  }

  getIncident(id: string): IncidentRecord | undefined {
    return this.incidents.get(id);
  }

  getAll(): IncidentRecord[] {
    return Array.from(this.incidents.values());
  }
}

class PostMortemTracker {
  private postMortems: Map<string, PostMortemRecord> = new Map();
  private counter = 0;

  create(incidentId: string, title: string, severity: string, conductedBy: string, rootCauses: string[], contributing: string[], actions: { action: string; owner: string; daysToComplete: number }[], blameless: boolean, detectionGap: number, recommendations: string[]): PostMortemRecord {
    const postMortemId = `pm-${Date.now()}-${++this.counter}`;
    const actionItems = actions.map((a, i) => ({
      action: a.action, owner: a.owner,
      dueDate: Date.now() + a.daysToComplete * 86400000,
      status: 'open' as const
    }));

    const record: PostMortemRecord = {
      postMortemId, incidentId, incidentTitle: title, severity, conductedBy,
      conductedAt: Date.now(), timeline: [], rootCauses, contributingFactors: contributing,
      actionItems, actionItemsOpen: actionItems.length, blameless,
      preventionRecommendations: recommendations, detectionGapMinutes: detectionGap,
      status: 'draft'
    };
    this.postMortems.set(postMortemId, record);
    logger.debug('Post-mortem created', { postMortemId, incidentId, rootCausesCount: rootCauses.length });
    return record;
  }

  publish(postMortemId: string): boolean {
    const pm = this.postMortems.get(postMortemId);
    if (!pm) return false;
    pm.status = 'published';
    pm.publishedAt = Date.now();
    return true;
  }

  getOverdueActionItems(): { postMortemId: string; action: string; owner: string; dueDate: number }[] {
    const overdue: { postMortemId: string; action: string; owner: string; dueDate: number }[] = [];
    const now = Date.now();
    this.postMortems.forEach((pm, id) => {
      pm.actionItems.filter(a => a.status === 'open' && a.dueDate < now).forEach(a => {
        overdue.push({ postMortemId: id, action: a.action, owner: a.owner, dueDate: a.dueDate });
      });
    });
    return overdue;
  }

  getTotalOpenActionItems(): number {
    return Array.from(this.postMortems.values()).reduce((s, pm) => s + pm.actionItemsOpen, 0);
  }
}

class IncidentMetricsEngine {
  private records: IncidentMetricsRecord[] = [];
  private counter = 0;

  calculate(period: string, incidents: IncidentRecord[]): IncidentMetricsRecord {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');
    const bySeverity: Record<string, number> = {};
    const rootCauseCounts: Record<string, number> = {};

    incidents.forEach(i => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      if (i.rootCause) rootCauseCounts[i.rootCause] = (rootCauseCounts[i.rootCause] || 0) + 1;
    });

    const mttr = resolved.length > 0
      ? Math.round(resolved.reduce((s, i) => s + (i.timeToResolveMinutes || 0), 0) / resolved.length) : 0;
    const mtta = resolved.length > 0
      ? Math.round(resolved.filter(i => i.timeToAcknowledgeMinutes).reduce((s, i) => s + (i.timeToAcknowledgeMinutes || 0), 0) / resolved.length) : 0;

    const slaCompliance = resolved.length > 0
      ? Math.round((resolved.filter(i => !i.slaBreached).length / resolved.length) * 100) : 100;
    const recurrenceRate = total > 0
      ? Math.round((incidents.filter(i => i.recurrence).length / total) * 100) : 0;

    const topRoots = Object.entries(rootCauseCounts)
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recordId = `incmtx-${Date.now()}-${++this.counter}`;
    const record: IncidentMetricsRecord = {
      recordId, period, totalIncidents: total, incidentsBySeverity: bySeverity,
      mttrMinutes: mttr, mttaMinutes: mtta, mtbfHours: 0,
      slaCompliancePct: slaCompliance, recurrenceRatePct: recurrenceRate,
      totalCustomersAffected: incidents.reduce((s, i) => s + i.customersAffected, 0),
      totalRevenueImpactUSD: incidents.reduce((s, i) => s + i.revenueImpactUSD, 0),
      openActionItems: 0, topRootCauses: topRoots, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): IncidentMetricsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getMTTRTrend(): number[] {
    return this.records.map(r => r.mttrMinutes);
  }
}

class IncidentTrendAnalyzer {
  private records: IncidentTrendRecord[] = [];
  private counter = 0;

  analyze(period: string, service: string, incidents: IncidentRecord[], previousMttr?: number): IncidentTrendRecord {
    const count = incidents.length;
    const resolved = incidents.filter(i => i.timeToResolveMinutes !== undefined);
    const avgMttr = resolved.length > 0 ? Math.round(resolved.reduce((s, i) => s + (i.timeToResolveMinutes || 0), 0) / resolved.length) : 0;
    const sevMap = { sev1_critical: 4, sev2_major: 3, sev3_minor: 2, sev4_low: 1 };
    const avgSev = count > 0 ? Math.round(incidents.reduce((s, i) => s + sevMap[i.severity], 0) / count * 10) / 10 : 0;

    const trendDirection: IncidentTrendRecord['trendDirection'] =
      previousMttr !== undefined ? (avgMttr < previousMttr * 0.9 ? 'improving' : avgMttr > previousMttr * 1.1 ? 'degrading' : 'stable') : 'stable';

    const recordId = `inctrd-${Date.now()}-${++this.counter}`;
    const record: IncidentTrendRecord = {
      recordId, period, service, incidentCount: count, avgMttrMinutes: avgMttr,
      avgSeverityScore: avgSev, revenueImpactUSD: incidents.reduce((s, i) => s + i.revenueImpactUSD, 0),
      trendDirection, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getDegradingServices(): IncidentTrendRecord[] {
    return this.records.filter(r => r.trendDirection === 'degrading').sort((a, b) => b.avgMttrMinutes - a.avgMttrMinutes);
  }

  getHighImpactServices(minRevenue = 10000): IncidentTrendRecord[] {
    return this.records.filter(r => r.revenueImpactUSD >= minRevenue);
  }
}

export const incidentManager = new IncidentManager();
export const postMortemTracker = new PostMortemTracker();
export const incidentMetricsEngine = new IncidentMetricsEngine();
export const incidentTrendAnalyzer = new IncidentTrendAnalyzer();

export { IncidentRecord, PostMortemRecord, IncidentMetricsRecord, IncidentTrendRecord };
