/**
 * Phase 261: Crisis & Business Continuity Intelligence
 * Incident command, BCP testing, RTO/RPO tracking, crisis communication, recovery analytics
 */

import { logger } from './logger';

interface CrisisEvent {
  eventId: string;
  title: string;
  crisisType: 'natural_disaster' | 'cyber_attack' | 'pandemic' | 'supply_chain' | 'financial' | 'reputational' | 'operational';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedSystems: string[];
  affectedRegions: string[];
  commander: string;
  declaredAt: number;
  resolvedAt?: number;
  currentPhase: 'detection' | 'response' | 'recovery' | 'post_incident' | 'resolved';
  status: 'active' | 'monitoring' | 'resolved';
}

interface BCPTestResult {
  testId: string;
  planId: string;
  planName: string;
  testType: 'tabletop' | 'walkthrough' | 'simulation' | 'full_interruption';
  rtoAchievedMin: number;
  rtoTargetMin: number;
  rpoAchievedMin: number;
  rpoTargetMin: number;
  rtoMet: boolean;
  rpoMet: boolean;
  participantCount: number;
  gapsIdentified: string[];
  overallResult: 'pass' | 'partial' | 'fail';
  testedAt: number;
}

interface RecoveryTimeObjective {
  rtoId: string;
  systemName: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  rtoTargetMin: number;
  rpoTargetMin: number;
  lastTestedRTOMin?: number;
  lastTestedAt?: number;
  status: 'meeting_target' | 'at_risk' | 'breaching';
  updatedAt: number;
}

interface CrisisCommunicationLog {
  logId: string;
  eventId: string;
  channelType: 'internal' | 'customer' | 'media' | 'regulator' | 'investor';
  message: string;
  audienceSize: number;
  sentAt: number;
  approvedBy: string;
  deliveryStatus: 'sent' | 'pending' | 'failed';
}

class CrisisCommandCenter {
  private events: Map<string, CrisisEvent> = new Map();
  private counter = 0;

  declare(title: string, crisisType: CrisisEvent['crisisType'], severity: CrisisEvent['severity'], affectedSystems: string[], affectedRegions: string[], commander: string): CrisisEvent {
    const eventId = `crisis-${Date.now()}-${++this.counter}`;
    const event: CrisisEvent = {
      eventId, title, crisisType, severity, affectedSystems, affectedRegions,
      commander, declaredAt: Date.now(), currentPhase: 'detection', status: 'active'
    };
    this.events.set(eventId, event);
    logger.debug('Crisis event declared', { eventId, crisisType, severity });
    return event;
  }

  advance(eventId: string, phase: CrisisEvent['currentPhase']): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;
    event.currentPhase = phase;
    if (phase === 'resolved') { event.status = 'resolved'; event.resolvedAt = Date.now(); }
    return true;
  }

  getActive(): CrisisEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.status === 'active')
      .sort((a, b) => {
        const severity = { critical: 0, high: 1, medium: 2, low: 3 };
        return severity[a.severity] - severity[b.severity];
      });
  }

  getMTTR(): number {
    const resolved = Array.from(this.events.values())
      .filter(e => e.status === 'resolved' && e.resolvedAt);
    if (!resolved.length) return 0;
    return resolved.reduce((s, e) => s + ((e.resolvedAt! - e.declaredAt) / 60000), 0) / resolved.length;
  }

  getEvent(eventId: string): CrisisEvent | undefined {
    return this.events.get(eventId);
  }
}

class BCPTestingTracker {
  private results: BCPTestResult[] = [];
  private counter = 0;

  record(planId: string, planName: string, testType: BCPTestResult['testType'], rtoAchievedMin: number, rtoTargetMin: number, rpoAchievedMin: number, rpoTargetMin: number, participants: number, gaps: string[]): BCPTestResult {
    const rtoMet = rtoAchievedMin <= rtoTargetMin;
    const rpoMet = rpoAchievedMin <= rpoTargetMin;
    const overallResult: BCPTestResult['overallResult'] =
      rtoMet && rpoMet && gaps.length === 0 ? 'pass' :
      rtoMet || rpoMet ? 'partial' : 'fail';

    const testId = `bcptest-${Date.now()}-${++this.counter}`;
    const result: BCPTestResult = {
      testId, planId, planName, testType, rtoAchievedMin, rtoTargetMin,
      rpoAchievedMin, rpoTargetMin, rtoMet, rpoMet, participantCount: participants,
      gapsIdentified: gaps, overallResult, testedAt: Date.now()
    };
    this.results.push(result);
    return result;
  }

  getFailedTests(): BCPTestResult[] {
    return this.results.filter(r => r.overallResult === 'fail');
  }

  getPassRate(): number {
    if (!this.results.length) return 0;
    return (this.results.filter(r => r.overallResult === 'pass').length / this.results.length) * 100;
  }

  getTotalGaps(): string[] {
    return [...new Set(this.results.flatMap(r => r.gapsIdentified))];
  }
}

class RTORPOManager {
  private objectives: Map<string, RecoveryTimeObjective> = new Map();
  private counter = 0;

  define(systemName: string, criticality: RecoveryTimeObjective['criticality'], rtoTargetMin: number, rpoTargetMin: number): RecoveryTimeObjective {
    const rtoId = `rto-${Date.now()}-${++this.counter}`;
    const rto: RecoveryTimeObjective = {
      rtoId, systemName, criticality, rtoTargetMin, rpoTargetMin,
      status: 'meeting_target', updatedAt: Date.now()
    };
    this.objectives.set(systemName, rto);
    return rto;
  }

  updateTestResult(systemName: string, lastTestedRTOMin: number): boolean {
    const rto = this.objectives.get(systemName);
    if (!rto) return false;
    rto.lastTestedRTOMin = lastTestedRTOMin;
    rto.lastTestedAt = Date.now();
    rto.status =
      lastTestedRTOMin <= rto.rtoTargetMin ? 'meeting_target' :
      lastTestedRTOMin <= rto.rtoTargetMin * 1.5 ? 'at_risk' : 'breaching';
    rto.updatedAt = Date.now();
    return true;
  }

  getBreaching(): RecoveryTimeObjective[] {
    return Array.from(this.objectives.values()).filter(r => r.status === 'breaching');
  }

  getNeverTested(): RecoveryTimeObjective[] {
    return Array.from(this.objectives.values()).filter(r => !r.lastTestedAt);
  }
}

class CrisisCommunicationManager {
  private logs: Map<string, CrisisCommunicationLog[]> = new Map();
  private counter = 0;

  log(eventId: string, channelType: CrisisCommunicationLog['channelType'], message: string, audienceSize: number, approvedBy: string): CrisisCommunicationLog {
    const logId = `crisiscomm-${Date.now()}-${++this.counter}`;
    const entry: CrisisCommunicationLog = {
      logId, eventId, channelType, message, audienceSize,
      sentAt: Date.now(), approvedBy, deliveryStatus: 'sent'
    };
    const existing = this.logs.get(eventId) || [];
    existing.push(entry);
    this.logs.set(eventId, existing);
    return entry;
  }

  getEventCommunications(eventId: string): CrisisCommunicationLog[] {
    return (this.logs.get(eventId) || []).sort((a, b) => a.sentAt - b.sentAt);
  }

  getTotalAudienceReached(eventId: string): number {
    return (this.logs.get(eventId) || []).reduce((s, l) => s + l.audienceSize, 0);
  }

  getCommunicationsByChannel(eventId: string, channelType: CrisisCommunicationLog['channelType']): CrisisCommunicationLog[] {
    return (this.logs.get(eventId) || []).filter(l => l.channelType === channelType);
  }
}

export const crisisCommandCenter = new CrisisCommandCenter();
export const bcpTestingTracker = new BCPTestingTracker();
export const rtoRPOManager = new RTORPOManager();
export const crisisCommunicationManager = new CrisisCommunicationManager();

export { CrisisEvent, BCPTestResult, RecoveryTimeObjective, CrisisCommunicationLog };
