/**
 * Phase 292: Corporate Events & Hospitality Intelligence
 * Event budget management, guest experience, entertainment ROI, hospitality compliance
 */

import { logger } from './logger';

interface CorporateEventRecord {
  eventId: string;
  eventName: string;
  eventCategory: 'client_entertainment' | 'team_building' | 'conference' | 'award_ceremony' | 'product_launch' | 'gala' | 'sports_hospitality';
  hostDepartment: string;
  guestCount: number;
  internalAttendees: number;
  externalAttendees: number;
  venue: string;
  eventDate: number;
  budget: number;
  actualCost: number;
  budgetVariancePct: number;
  revenueInfluenced: number;
  relationshipValueScore: number;   // 0-100 strategic relationship impact
  guestSatisfactionScore: number;   // 0-100
  complianceStatus: 'compliant' | 'pending_review' | 'violation';
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

interface HospitalityBudgetRecord {
  budgetId: string;
  period: string;
  department: string;
  allocatedBudget: number;
  committedSpend: number;
  actualSpend: number;
  utilizationRatePct: number;
  remainingBudget: number;
  eventsHosted: number;
  costPerEvent: number;
  costPerGuest: number;
  roiEstimatePct: number;
  calculatedAt: number;
}

interface GuestExperienceRecord {
  recordId: string;
  eventId: string;
  guestId: string;
  guestName: string;
  guestCompany: string;
  guestTier: 'vip' | 'key_client' | 'prospect' | 'partner' | 'internal';
  checkInTime?: number;
  checkOutTime?: number;
  engagementActivitiesParticipated: number;
  feedbackScore: number;          // 1-5
  npsScore: number;               // -100 to +100 equivalent
  followUpActionTaken: boolean;
  dealProgressedPost: boolean;
  recordedAt: number;
}

interface HospitalityComplianceRecord {
  recordId: string;
  period: string;
  totalEventsReviewed: number;
  compliantEvents: number;
  policyViolations: number;
  avgGiftValueUSD: number;
  maxAllowedGiftUSD: number;
  antiCorruptionDeclarationsFiled: number;
  requiredDeclarations: number;
  complianceRatePct: number;
  regulatoryRisk: 'low' | 'medium' | 'high';
  auditedAt: number;
}

class CorporateEventManager {
  private events: Map<string, CorporateEventRecord> = new Map();
  private counter = 0;

  create(name: string, category: CorporateEventRecord['eventCategory'], department: string, guestCount: number, internal: number, venue: string, eventDate: number, budget: number): CorporateEventRecord {
    const eventId = `corpevt-${Date.now()}-${++this.counter}`;
    const event: CorporateEventRecord = {
      eventId, eventName: name, eventCategory: category, hostDepartment: department,
      guestCount, internalAttendees: internal, externalAttendees: guestCount - internal,
      venue, eventDate, budget, actualCost: 0, budgetVariancePct: 0,
      revenueInfluenced: 0, relationshipValueScore: 0, guestSatisfactionScore: 0,
      complianceStatus: 'pending_review', status: 'planned', createdAt: Date.now()
    };
    this.events.set(eventId, event);
    logger.debug('Corporate event created', { eventId, name, category, budget });
    return event;
  }

  complete(eventId: string, actualCost: number, revenueInfluenced: number, relationshipScore: number, satisfactionScore: number, compliant: boolean): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;
    event.actualCost = actualCost;
    event.budgetVariancePct = event.budget > 0 ? ((actualCost - event.budget) / event.budget) * 100 : 0;
    event.revenueInfluenced = revenueInfluenced;
    event.relationshipValueScore = Math.max(0, Math.min(100, relationshipScore));
    event.guestSatisfactionScore = Math.max(0, Math.min(100, satisfactionScore));
    event.complianceStatus = compliant ? 'compliant' : 'violation';
    event.status = 'completed';
    return true;
  }

  getTopROIEvents(limit = 5): CorporateEventRecord[] {
    return Array.from(this.events.values())
      .filter(e => e.status === 'completed' && e.actualCost > 0)
      .sort((a, b) => b.revenueInfluenced - a.revenueInfluenced)
      .slice(0, limit);
  }

  getComplianceViolations(): CorporateEventRecord[] {
    return Array.from(this.events.values()).filter(e => e.complianceStatus === 'violation');
  }

  getAvgGuestSatisfaction(): number {
    const completed = Array.from(this.events.values()).filter(e => e.status === 'completed');
    if (!completed.length) return 0;
    return completed.reduce((s, e) => s + e.guestSatisfactionScore, 0) / completed.length;
  }

  getEvent(eventId: string): CorporateEventRecord | undefined {
    return this.events.get(eventId);
  }
}

class HospitalityBudgetManager {
  private budgets: Map<string, HospitalityBudgetRecord[]> = new Map();
  private counter = 0;

  allocate(period: string, department: string, budget: number): HospitalityBudgetRecord {
    const budgetId = `hospbud-${Date.now()}-${++this.counter}`;
    const record: HospitalityBudgetRecord = {
      budgetId, period, department, allocatedBudget: budget, committedSpend: 0,
      actualSpend: 0, utilizationRatePct: 0, remainingBudget: budget,
      eventsHosted: 0, costPerEvent: 0, costPerGuest: 0, roiEstimatePct: 0,
      calculatedAt: Date.now()
    };
    const history = this.budgets.get(department) || [];
    history.push(record);
    this.budgets.set(department, history);
    return record;
  }

  updateSpend(department: string, period: string, actualSpend: number, eventsHosted: number, totalGuests: number, revenueInfluenced: number): boolean {
    const history = this.budgets.get(department) || [];
    const record = history.find(r => r.period === period);
    if (!record) return false;
    record.actualSpend = actualSpend;
    record.utilizationRatePct = record.allocatedBudget > 0 ? (actualSpend / record.allocatedBudget) * 100 : 0;
    record.remainingBudget = record.allocatedBudget - actualSpend;
    record.eventsHosted = eventsHosted;
    record.costPerEvent = eventsHosted > 0 ? actualSpend / eventsHosted : 0;
    record.costPerGuest = totalGuests > 0 ? actualSpend / totalGuests : 0;
    record.roiEstimatePct = actualSpend > 0 ? ((revenueInfluenced - actualSpend) / actualSpend) * 100 : 0;
    return true;
  }

  getOverBudgetDepartments(): HospitalityBudgetRecord[] {
    return Array.from(this.budgets.values())
      .map(h => h[h.length - 1])
      .filter((r): r is HospitalityBudgetRecord => !!r && r.remainingBudget < 0);
  }

  getLatest(department: string): HospitalityBudgetRecord | undefined {
    const history = this.budgets.get(department) || [];
    return history[history.length - 1];
  }
}

class GuestExperienceTracker {
  private records: Map<string, GuestExperienceRecord[]> = new Map();
  private counter = 0;

  record(eventId: string, guestId: string, guestName: string, company: string, tier: GuestExperienceRecord['guestTier'], activities: number, feedbackScore: number, nps: number, followUp: boolean, dealProgressed: boolean): GuestExperienceRecord {
    const recordId = `guestexp-${Date.now()}-${++this.counter}`;
    const rec: GuestExperienceRecord = {
      recordId, eventId, guestId, guestName, guestCompany: company, guestTier: tier,
      engagementActivitiesParticipated: activities, feedbackScore, npsScore: nps,
      followUpActionTaken: followUp, dealProgressedPost: dealProgressed, recordedAt: Date.now()
    };
    const existing = this.records.get(eventId) || [];
    existing.push(rec);
    this.records.set(eventId, existing);
    return rec;
  }

  getAvgNPS(eventId: string): number {
    const guests = this.records.get(eventId) || [];
    if (!guests.length) return 0;
    return guests.reduce((s, g) => s + g.npsScore, 0) / guests.length;
  }

  getDealConversionRate(eventId: string): number {
    const guests = this.records.get(eventId) || [];
    const external = guests.filter(g => g.guestTier !== 'internal');
    if (!external.length) return 0;
    return (external.filter(g => g.dealProgressedPost).length / external.length) * 100;
  }

  getVIPGuests(eventId: string): GuestExperienceRecord[] {
    return (this.records.get(eventId) || []).filter(g => g.guestTier === 'vip' || g.guestTier === 'key_client');
  }
}

class HospitalityComplianceTracker {
  private records: HospitalityComplianceRecord[] = [];
  private counter = 0;

  assess(period: string, eventsReviewed: number, compliant: number, violations: number, avgGiftValue: number, maxGift: number, declarationsFiled: number, requiredDeclarations: number): HospitalityComplianceRecord {
    const complianceRate = eventsReviewed > 0 ? (compliant / eventsReviewed) * 100 : 100;
    const giftRisk = avgGiftValue > maxGift ? 1 : 0;
    const declarationGap = requiredDeclarations > 0 ? 1 - declarationsFiled / requiredDeclarations : 0;
    const riskScore = violations + giftRisk * 2 + declarationGap * 3;
    const regulatoryRisk: HospitalityComplianceRecord['regulatoryRisk'] =
      riskScore === 0 ? 'low' : riskScore <= 3 ? 'medium' : 'high';

    const recordId = `hospcomp-${Date.now()}-${++this.counter}`;
    const record: HospitalityComplianceRecord = {
      recordId, period, totalEventsReviewed: eventsReviewed, compliantEvents: compliant,
      policyViolations: violations, avgGiftValueUSD: avgGiftValue, maxAllowedGiftUSD: maxGift,
      antiCorruptionDeclarationsFiled: declarationsFiled, requiredDeclarations,
      complianceRatePct: complianceRate, regulatoryRisk, auditedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Hospitality compliance assessed', { period, complianceRate, regulatoryRisk });
    return record;
  }

  getLatest(): HospitalityComplianceRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getHighRiskPeriods(): HospitalityComplianceRecord[] {
    return this.records.filter(r => r.regulatoryRisk === 'high');
  }
}

export const corporateEventManager = new CorporateEventManager();
export const hospitalityBudgetManager = new HospitalityBudgetManager();
export const guestExperienceTracker = new GuestExperienceTracker();
export const hospitalityComplianceTracker = new HospitalityComplianceTracker();

export { CorporateEventRecord, HospitalityBudgetRecord, GuestExperienceRecord, HospitalityComplianceRecord };
