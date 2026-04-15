/**
 * Phase 272: Event & Conference Intelligence
 * Event ROI, attendee analytics, session performance, sponsor value tracking
 */

import { logger } from './logger';

interface EventRecord {
  eventId: string;
  name: string;
  eventType: 'conference' | 'webinar' | 'workshop' | 'trade_show' | 'user_group' | 'virtual';
  startDate: number;
  endDate: number;
  expectedAttendees: number;
  actualAttendees: number;
  attendanceRatePct: number;
  budget: number;
  actualCost: number;
  revenueGenerated: number;
  leadsGenerated: number;
  pipelineInfluenced: number;
  netROI: number;
  npsScore: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

interface SessionPerformanceRecord {
  sessionId: string;
  eventId: string;
  title: string;
  speaker: string;
  track: string;
  scheduledAttendees: number;
  actualAttendees: number;
  fillRatePct: number;
  avgRating: number;            // 1-5
  completionRatePct: number;    // for virtual sessions
  keyTakeaways: string[];
  followUpRequestCount: number;
  recordedAt: number;
}

interface SponsorValueRecord {
  sponsorId: string;
  eventId: string;
  sponsorName: string;
  sponsorshipTier: 'title' | 'platinum' | 'gold' | 'silver' | 'bronze';
  sponsorshipFee: number;
  estimatedLogoImpressions: number;
  leadsDelivered: number;
  speakingSlots: number;
  boothTraffic: number;
  estimatedROIForSponsor: number;   // value delivered vs fee paid
  renewalLikelihood: 'high' | 'medium' | 'low';
  recordedAt: number;
}

interface AttendeeEngagementMetric {
  metricId: string;
  eventId: string;
  period: string;
  registeredCount: number;
  checkedInCount: number;
  activeEngagementPct: number;   // attended 3+ sessions
  networkingInteractions: number;
  appDownloads: number;
  contentDownloads: number;
  satisfactionScore: number;     // 0-100
  calculatedAt: number;
}

class EventManager {
  private events: Map<string, EventRecord> = new Map();
  private counter = 0;

  create(name: string, eventType: EventRecord['eventType'], startDate: number, endDate: number, expectedAttendees: number, budget: number): EventRecord {
    const eventId = `event-${Date.now()}-${++this.counter}`;
    const event: EventRecord = {
      eventId, name, eventType, startDate, endDate, expectedAttendees,
      actualAttendees: 0, attendanceRatePct: 0, budget, actualCost: 0,
      revenueGenerated: 0, leadsGenerated: 0, pipelineInfluenced: 0,
      netROI: 0, npsScore: 0, status: 'planned', createdAt: Date.now()
    };
    this.events.set(eventId, event);
    logger.debug('Event created', { eventId, name, eventType });
    return event;
  }

  complete(eventId: string, actualAttendees: number, actualCost: number, revenueGenerated: number, leads: number, pipeline: number, nps: number): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;
    event.actualAttendees = actualAttendees;
    event.attendanceRatePct = event.expectedAttendees > 0 ? (actualAttendees / event.expectedAttendees) * 100 : 0;
    event.actualCost = actualCost;
    event.revenueGenerated = revenueGenerated;
    event.leadsGenerated = leads;
    event.pipelineInfluenced = pipeline;
    event.npsScore = nps;
    event.netROI = actualCost > 0 ? ((revenueGenerated + pipeline * 0.1 - actualCost) / actualCost) * 100 : 0;
    event.status = 'completed';
    return true;
  }

  getTopROI(limit = 5): EventRecord[] {
    return Array.from(this.events.values())
      .filter(e => e.status === 'completed')
      .sort((a, b) => b.netROI - a.netROI)
      .slice(0, limit);
  }

  getAverageNPS(): number {
    const completed = Array.from(this.events.values()).filter(e => e.status === 'completed');
    if (!completed.length) return 0;
    return completed.reduce((s, e) => s + e.npsScore, 0) / completed.length;
  }

  getEvent(eventId: string): EventRecord | undefined {
    return this.events.get(eventId);
  }
}

class SessionPerformanceTracker {
  private sessions: Map<string, SessionPerformanceRecord[]> = new Map();
  private counter = 0;

  record(eventId: string, title: string, speaker: string, track: string, scheduled: number, actual: number, avgRating: number, completionRate: number, followUps: number): SessionPerformanceRecord {
    const sessionId = `session-${Date.now()}-${++this.counter}`;
    const record: SessionPerformanceRecord = {
      sessionId, eventId, title, speaker, track, scheduledAttendees: scheduled,
      actualAttendees: actual, fillRatePct: scheduled > 0 ? (actual / scheduled) * 100 : 0,
      avgRating, completionRatePct: completionRate, keyTakeaways: [], followUpRequestCount: followUps,
      recordedAt: Date.now()
    };
    const existing = this.sessions.get(eventId) || [];
    existing.push(record);
    this.sessions.set(eventId, existing);
    return record;
  }

  getTopSessions(eventId: string, limit = 3): SessionPerformanceRecord[] {
    return (this.sessions.get(eventId) || [])
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, limit);
  }

  getAverageRating(eventId: string): number {
    const sessions = this.sessions.get(eventId) || [];
    if (!sessions.length) return 0;
    return sessions.reduce((s, r) => s + r.avgRating, 0) / sessions.length;
  }
}

class SponsorValueTracker {
  private records: Map<string, SponsorValueRecord[]> = new Map();
  private counter = 0;

  evaluate(eventId: string, sponsorName: string, tier: SponsorValueRecord['sponsorshipTier'], fee: number, impressions: number, leads: number, speakingSlots: number, boothTraffic: number): SponsorValueRecord {
    const tierMultiplier = { title: 3, platinum: 2.5, gold: 2, silver: 1.5, bronze: 1 }[tier];
    const deliveredValue = (leads * 500 + impressions * 0.01 + boothTraffic * 10 + speakingSlots * 5000) * tierMultiplier;
    const estimatedROI = fee > 0 ? (deliveredValue / fee) * 100 : 0;
    const renewalLikelihood: SponsorValueRecord['renewalLikelihood'] =
      estimatedROI >= 150 ? 'high' : estimatedROI >= 100 ? 'medium' : 'low';

    const sponsorId = `sponsor-${Date.now()}-${++this.counter}`;
    const record: SponsorValueRecord = {
      sponsorId, eventId, sponsorName, sponsorshipTier: tier, sponsorshipFee: fee,
      estimatedLogoImpressions: impressions, leadsDelivered: leads, speakingSlots,
      boothTraffic, estimatedROIForSponsor: estimatedROI, renewalLikelihood, recordedAt: Date.now()
    };
    const existing = this.records.get(eventId) || [];
    existing.push(record);
    this.records.set(eventId, existing);
    return record;
  }

  getHighRenewalSponsors(eventId: string): SponsorValueRecord[] {
    return (this.records.get(eventId) || []).filter(s => s.renewalLikelihood === 'high');
  }

  getTotalSponsorRevenue(eventId: string): number {
    return (this.records.get(eventId) || []).reduce((s, r) => s + r.sponsorshipFee, 0);
  }
}

class AttendeeEngagementAnalyzer {
  private metrics: AttendeeEngagementMetric[] = [];
  private counter = 0;

  analyze(eventId: string, period: string, registered: number, checkedIn: number, activeEngagementPct: number, networkingInteractions: number, appDownloads: number, contentDownloads: number): AttendeeEngagementMetric {
    const satisfactionScore = Math.min(100,
      (checkedIn / Math.max(1, registered)) * 30 +
      activeEngagementPct * 0.4 +
      Math.min(20, contentDownloads / Math.max(1, checkedIn) * 100) +
      Math.min(10, networkingInteractions / Math.max(1, checkedIn) * 50)
    );

    const metricId = `attendeeeng-${Date.now()}-${++this.counter}`;
    const metric: AttendeeEngagementMetric = {
      metricId, eventId, period, registeredCount: registered, checkedInCount: checkedIn,
      activeEngagementPct, networkingInteractions, appDownloads, contentDownloads,
      satisfactionScore: Math.max(0, Math.min(100, satisfactionScore)), calculatedAt: Date.now()
    };
    this.metrics.push(metric);
    return metric;
  }

  getLatest(eventId: string): AttendeeEngagementMetric | undefined {
    return [...this.metrics].reverse().find(m => m.eventId === eventId);
  }

  getAverageCheckInRate(): number {
    if (!this.metrics.length) return 0;
    const rates = this.metrics.map(m => m.registeredCount > 0 ? (m.checkedInCount / m.registeredCount) * 100 : 0);
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  }
}

export const eventManager = new EventManager();
export const sessionPerformanceTracker = new SessionPerformanceTracker();
export const sponsorValueTracker = new SponsorValueTracker();
export const attendeeEngagementAnalyzer = new AttendeeEngagementAnalyzer();

export { EventRecord, SessionPerformanceRecord, SponsorValueRecord, AttendeeEngagementMetric };
