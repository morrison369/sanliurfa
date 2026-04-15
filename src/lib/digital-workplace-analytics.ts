/**
 * Phase 231: Digital Workplace Analytics
 * Tool adoption, collaboration patterns, digital friction detection, workplace experience scoring
 */

import { logger } from './logger';

interface ToolAdoptionMetric {
  metricId: string;
  toolName: string;
  category: 'communication' | 'productivity' | 'project_mgmt' | 'analytics' | 'development' | 'other';
  totalLicenses: number;
  activeUsers: number;
  adoptionRate: number;
  avgSessionsPerWeek: number;
  avgSessionDurationMinutes: number;
  featureDepth: number;  // 0-100 (breadth of feature usage)
  period: string;
  capturedAt: number;
}

interface CollaborationPattern {
  patternId: string;
  teamId: string;
  period: string;
  crossFunctionalConnections: number;
  internalConnections: number;
  asyncCommunicationRatio: number;  // 0-1
  responseTimeAvgMinutes: number;
  meetingHoursPerWeek: number;
  documentSharingCount: number;
  collaborationScore: number;  // 0-100
  capturedAt: number;
}

interface DigitalFrictionEvent {
  frictionId: string;
  employeeId: string;
  toolName: string;
  frictionType: 'slow_load' | 'login_failure' | 'sync_error' | 'missing_feature' | 'poor_ux' | 'integration_failure';
  severity: 'low' | 'medium' | 'high';
  timeWastedMinutes: number;
  reportedAt: number;
}

interface WorkplaceExperienceScore {
  scoreId: string;
  employeeId: string;
  period: string;
  toolSatisfactionScore: number;     // 0-100
  collaborationScore: number;        // 0-100
  digitalFluencyScore: number;       // 0-100
  productivityEnablement: number;    // 0-100
  overallDEXScore: number;           // Digital Employee Experience 0-100
  capturedAt: number;
}

class ToolAdoptionTracker {
  private metrics: Map<string, ToolAdoptionMetric[]> = new Map();
  private counter = 0;

  record(toolName: string, category: ToolAdoptionMetric['category'], totalLicenses: number, activeUsers: number, avgSessionsPerWeek: number, avgSessionMinutes: number, featureDepth: number, period: string): ToolAdoptionMetric {
    const adoptionRate = totalLicenses > 0 ? (activeUsers / totalLicenses) * 100 : 0;
    const metricId = `tooladopt-${Date.now()}-${++this.counter}`;
    const metric: ToolAdoptionMetric = {
      metricId, toolName, category, totalLicenses, activeUsers,
      adoptionRate, avgSessionsPerWeek, avgSessionDurationMinutes: avgSessionMinutes,
      featureDepth: Math.max(0, Math.min(100, featureDepth)), period, capturedAt: Date.now()
    };
    const existing = this.metrics.get(toolName) || [];
    existing.push(metric);
    this.metrics.set(toolName, existing);
    logger.debug('Tool adoption recorded', { toolName, adoptionRate: adoptionRate.toFixed(1), activeUsers });
    return metric;
  }

  getLowAdoption(threshold = 50): ToolAdoptionMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is ToolAdoptionMetric => !!m && m.adoptionRate < threshold);
  }

  getLatest(toolName: string): ToolAdoptionMetric | undefined {
    const history = this.metrics.get(toolName) || [];
    return history[history.length - 1];
  }

  getAvgAdoptionRate(): number {
    const latest = Array.from(this.metrics.values()).map(h => h[h.length - 1]).filter((m): m is ToolAdoptionMetric => !!m);
    if (!latest.length) return 0;
    return latest.reduce((s, m) => s + m.adoptionRate, 0) / latest.length;
  }
}

class CollaborationPatternAnalyzer {
  private patterns: Map<string, CollaborationPattern[]> = new Map();
  private counter = 0;

  analyze(teamId: string, period: string, crossFunctional: number, internal: number, asyncRatio: number, responseTimeMinutes: number, meetingHoursPerWeek: number, docSharing: number): CollaborationPattern {
    const total = crossFunctional + internal;
    const diversity = total > 0 ? crossFunctional / total : 0;
    const collaborationScore = Math.min(100, diversity * 30 + asyncRatio * 20 + Math.min(40, docSharing) + Math.max(0, 10 - meetingHoursPerWeek));
    const patternId = `collab-${Date.now()}-${++this.counter}`;
    const pattern: CollaborationPattern = {
      patternId, teamId, period, crossFunctionalConnections: crossFunctional,
      internalConnections: internal, asyncCommunicationRatio: Math.max(0, Math.min(1, asyncRatio)),
      responseTimeAvgMinutes: responseTimeMinutes, meetingHoursPerWeek,
      documentSharingCount: docSharing,
      collaborationScore: Math.max(0, collaborationScore), capturedAt: Date.now()
    };
    const existing = this.patterns.get(teamId) || [];
    existing.push(pattern);
    this.patterns.set(teamId, existing);
    return pattern;
  }

  getMeetingHeavyTeams(thresholdHours = 15): CollaborationPattern[] {
    return Array.from(this.patterns.values())
      .map(h => h[h.length - 1])
      .filter((p): p is CollaborationPattern => !!p && p.meetingHoursPerWeek > thresholdHours);
  }

  getLatest(teamId: string): CollaborationPattern | undefined {
    const history = this.patterns.get(teamId) || [];
    return history[history.length - 1];
  }
}

class DigitalFrictionMonitor {
  private events: DigitalFrictionEvent[] = [];
  private counter = 0;

  report(employeeId: string, toolName: string, frictionType: DigitalFrictionEvent['frictionType'], severity: DigitalFrictionEvent['severity'], timeWastedMinutes: number): DigitalFrictionEvent {
    const frictionId = `friction-${Date.now()}-${++this.counter}`;
    const event: DigitalFrictionEvent = {
      frictionId, employeeId, toolName, frictionType, severity, timeWastedMinutes, reportedAt: Date.now()
    };
    this.events.push(event);
    logger.debug('Digital friction reported', { toolName, frictionType, severity, timeWastedMinutes });
    return event;
  }

  getTopFrictionTools(limit = 5): Array<{ toolName: string; count: number; totalTimeWasted: number }> {
    const map = new Map<string, { count: number; totalTimeWasted: number }>();
    for (const e of this.events) {
      const existing = map.get(e.toolName) || { count: 0, totalTimeWasted: 0 };
      existing.count++;
      existing.totalTimeWasted += e.timeWastedMinutes;
      map.set(e.toolName, existing);
    }
    return Array.from(map.entries())
      .map(([toolName, stats]) => ({ toolName, ...stats }))
      .sort((a, b) => b.totalTimeWasted - a.totalTimeWasted)
      .slice(0, limit);
  }

  getTotalTimeWasted(): number {
    return this.events.reduce((s, e) => s + e.timeWastedMinutes, 0);
  }
}

class WorkplaceExperienceScorer {
  private scores: Map<string, WorkplaceExperienceScore[]> = new Map();
  private counter = 0;

  score(employeeId: string, period: string, toolSatisfaction: number, collaboration: number, digitalFluency: number, productivityEnablement: number): WorkplaceExperienceScore {
    const overallDEXScore = toolSatisfaction * 0.3 + collaboration * 0.25 + digitalFluency * 0.2 + productivityEnablement * 0.25;
    const scoreId = `dex-${Date.now()}-${++this.counter}`;
    const record: WorkplaceExperienceScore = {
      scoreId, employeeId, period,
      toolSatisfactionScore: Math.max(0, Math.min(100, toolSatisfaction)),
      collaborationScore: Math.max(0, Math.min(100, collaboration)),
      digitalFluencyScore: Math.max(0, Math.min(100, digitalFluency)),
      productivityEnablement: Math.max(0, Math.min(100, productivityEnablement)),
      overallDEXScore: Math.max(0, Math.min(100, overallDEXScore)),
      capturedAt: Date.now()
    };
    const existing = this.scores.get(employeeId) || [];
    existing.push(record);
    this.scores.set(employeeId, existing);
    return record;
  }

  getOrgAvgDEX(): number {
    const latest = Array.from(this.scores.values()).map(h => h[h.length - 1]).filter((s): s is WorkplaceExperienceScore => !!s);
    if (!latest.length) return 0;
    return latest.reduce((s, r) => s + r.overallDEXScore, 0) / latest.length;
  }

  getLowDEXEmployees(threshold = 60): string[] {
    return Array.from(this.scores.entries())
      .filter(([, hist]) => {
        const latest = hist[hist.length - 1];
        return latest && latest.overallDEXScore < threshold;
      })
      .map(([id]) => id);
  }
}

export const toolAdoptionTracker = new ToolAdoptionTracker();
export const collaborationPatternAnalyzer = new CollaborationPatternAnalyzer();
export const digitalFrictionMonitor = new DigitalFrictionMonitor();
export const workplaceExperienceScorer = new WorkplaceExperienceScorer();

export { ToolAdoptionMetric, CollaborationPattern, DigitalFrictionEvent, WorkplaceExperienceScore };
