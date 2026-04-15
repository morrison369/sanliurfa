/**
 * Phase 303: Customer Onboarding Intelligence
 * Onboarding tracking, time-to-value, adoption milestones, drop-off analysis
 */

import { logger } from './logger';

interface OnboardingRecord {
  onboardingId: string;
  customerId: string;
  customerName: string;
  segment: 'enterprise' | 'mid_market' | 'smb' | 'self_serve';
  planType: string;
  startDate: number;
  targetCompletionDate: number;
  actualCompletionDate?: number;
  assignedCsm: string;
  onboardingTemplate: string;
  completedSteps: number;
  totalSteps: number;
  completionPct: number;
  timeToValueDays?: number;
  targetTimeToValueDays: number;
  healthScore: number;               // 0-100
  isAtRisk: boolean;
  dropOffStep?: string;
  contractValueUSD: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'stalled' | 'churned';
  createdAt: number;
}

interface AdoptionMilestoneRecord {
  milestoneId: string;
  customerId: string;
  onboardingId: string;
  milestoneName: string;
  milestoneType: 'setup' | 'integration' | 'training' | 'go_live' | 'first_value' | 'expansion';
  targetDate: number;
  achievedDate?: number;
  daysToAchieve?: number;
  targetDays: number;
  onTimeAchievement: boolean;
  blockers: string[];
  status: 'pending' | 'in_progress' | 'achieved' | 'overdue' | 'waived';
}

interface OnboardingDropOffRecord {
  recordId: string;
  period: string;
  totalStarted: number;
  completedInTarget: number;
  completedLate: number;
  stalled: number;
  churned: number;
  completionRatePct: number;
  onTimeCompletionRatePct: number;
  avgTimeToValueDays: number;
  topDropOffSteps: { step: string; count: number }[];
  avgHealthScoreAtDropOff: number;
  revenueAtRiskUSD: number;
  calculatedAt: number;
}

interface OnboardingEffectivenessRecord {
  recordId: string;
  period: string;
  templateName: string;
  segment: string;
  completionRatePct: number;
  avgTimeToValueDays: number;
  customerSatisfactionScore: number;  // 0-100
  featureAdoptionPct: number;
  firstYearRetentionRatePct: number;
  npsScore: number;
  calculatedAt: number;
}

class OnboardingTracker {
  private records: Map<string, OnboardingRecord> = new Map();
  private counter = 0;

  initiate(customerId: string, name: string, segment: OnboardingRecord['segment'], plan: string, csm: string, template: string, totalSteps: number, targetDays: number, targetTTV: number, contractValue: number): OnboardingRecord {
    const onboardingId = `onboard-${Date.now()}-${++this.counter}`;
    const record: OnboardingRecord = {
      onboardingId, customerId, customerName: name, segment, planType: plan,
      startDate: Date.now(), targetCompletionDate: Date.now() + targetDays * 86400000,
      assignedCsm: csm, onboardingTemplate: template, completedSteps: 0, totalSteps,
      completionPct: 0, targetTimeToValueDays: targetTTV, healthScore: 100,
      isAtRisk: false, contractValueUSD: contractValue, status: 'not_started', createdAt: Date.now()
    };
    this.records.set(onboardingId, record);
    logger.debug('Onboarding initiated', { onboardingId, customerId, segment });
    return record;
  }

  progressStep(onboardingId: string, completedSteps: number, healthScore: number): boolean {
    const record = this.records.get(onboardingId);
    if (!record) return false;
    record.completedSteps = completedSteps;
    record.completionPct = record.totalSteps > 0 ? Math.round((completedSteps / record.totalSteps) * 100) : 0;
    record.healthScore = Math.max(0, Math.min(100, healthScore));
    record.isAtRisk = healthScore < 60 || (Date.now() > record.targetCompletionDate && record.completionPct < 80);
    record.status = record.completionPct === 100 ? 'completed' : 'in_progress';
    if (record.completionPct === 100) {
      record.actualCompletionDate = Date.now();
      record.timeToValueDays = Math.round((Date.now() - record.startDate) / 86400000);
    }
    return true;
  }

  getAtRiskOnboardings(): OnboardingRecord[] {
    return Array.from(this.records.values()).filter(r => r.isAtRisk && r.status === 'in_progress');
  }

  getStalledOnboardings(stalledDays = 14): OnboardingRecord[] {
    const cutoff = Date.now() - stalledDays * 86400000;
    return Array.from(this.records.values())
      .filter(r => r.status === 'in_progress' && r.createdAt < cutoff && r.completionPct < 20);
  }

  getAvgTimeToValue(): number {
    const completed = Array.from(this.records.values()).filter(r => r.timeToValueDays !== undefined);
    if (!completed.length) return 0;
    return Math.round(completed.reduce((s, r) => s + (r.timeToValueDays || 0), 0) / completed.length);
  }

  getOnboarding(id: string): OnboardingRecord | undefined {
    return this.records.get(id);
  }
}

class AdoptionMilestoneTracker {
  private milestones: Map<string, AdoptionMilestoneRecord[]> = new Map();
  private counter = 0;

  add(customerId: string, onboardingId: string, name: string, type: AdoptionMilestoneRecord['milestoneType'], targetDate: number, targetDays: number, blockers: string[]): AdoptionMilestoneRecord {
    const milestoneId = `milestone-${Date.now()}-${++this.counter}`;
    const record: AdoptionMilestoneRecord = {
      milestoneId, customerId, onboardingId, milestoneName: name, milestoneType: type,
      targetDate, targetDays, onTimeAchievement: false, blockers, status: 'pending'
    };
    const existing = this.milestones.get(customerId) || [];
    existing.push(record);
    this.milestones.set(customerId, existing);
    return record;
  }

  achieve(milestoneId: string, customerId: string): boolean {
    const milestones = this.milestones.get(customerId) || [];
    const m = milestones.find(ms => ms.milestoneId === milestoneId);
    if (!m) return false;
    m.achievedDate = Date.now();
    m.daysToAchieve = Math.round((Date.now() - (m.targetDate - m.targetDays * 86400000)) / 86400000);
    m.onTimeAchievement = Date.now() <= m.targetDate;
    m.status = 'achieved';
    return true;
  }

  getOverdueMilestones(): AdoptionMilestoneRecord[] {
    const now = Date.now();
    return Array.from(this.milestones.values()).flat()
      .filter(m => m.status === 'pending' && m.targetDate < now);
  }

  getOnTimeAchievementRate(): number {
    const achieved = Array.from(this.milestones.values()).flat().filter(m => m.status === 'achieved');
    if (!achieved.length) return 0;
    return Math.round((achieved.filter(m => m.onTimeAchievement).length / achieved.length) * 100);
  }
}

class OnboardingDropOffAnalyzer {
  private records: OnboardingDropOffRecord[] = [];
  private counter = 0;

  analyze(period: string, onboardings: OnboardingRecord[]): OnboardingDropOffRecord {
    const total = onboardings.length;
    const completed = onboardings.filter(o => o.status === 'completed');
    const completedInTarget = completed.filter(o => o.actualCompletionDate && o.actualCompletionDate <= o.targetCompletionDate).length;
    const stalled = onboardings.filter(o => o.status === 'stalled').length;
    const churned = onboardings.filter(o => o.status === 'churned').length;

    const avgTTV = completed.length > 0
      ? Math.round(completed.reduce((s, o) => s + (o.timeToValueDays || 0), 0) / completed.length) : 0;

    const dropOffCounts: Record<string, number> = {};
    onboardings.filter(o => o.dropOffStep).forEach(o => {
      dropOffCounts[o.dropOffStep!] = (dropOffCounts[o.dropOffStep!] || 0) + 1;
    });
    const topDropOff = Object.entries(dropOffCounts)
      .map(([step, count]) => ({ step, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const atRisk = onboardings.filter(o => o.isAtRisk);
    const revenueAtRisk = atRisk.reduce((s, o) => s + o.contractValueUSD, 0);
    const avgHealth = atRisk.length > 0 ? atRisk.reduce((s, o) => s + o.healthScore, 0) / atRisk.length : 100;

    const recordId = `dropoff-${Date.now()}-${++this.counter}`;
    const record: OnboardingDropOffRecord = {
      recordId, period, totalStarted: total, completedInTarget,
      completedLate: completed.length - completedInTarget, stalled, churned,
      completionRatePct: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      onTimeCompletionRatePct: total > 0 ? Math.round((completedInTarget / total) * 100) : 0,
      avgTimeToValueDays: avgTTV, topDropOffSteps: topDropOff,
      avgHealthScoreAtDropOff: Math.round(avgHealth), revenueAtRiskUSD: revenueAtRisk,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): OnboardingDropOffRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

class OnboardingEffectivenessTracker {
  private records: OnboardingEffectivenessRecord[] = [];
  private counter = 0;

  track(period: string, template: string, segment: string, completionRate: number, avgTTV: number, csat: number, featureAdoption: number, retention: number, nps: number): OnboardingEffectivenessRecord {
    const recordId = `onbeff-${Date.now()}-${++this.counter}`;
    const record: OnboardingEffectivenessRecord = {
      recordId, period, templateName: template, segment, completionRatePct: completionRate,
      avgTimeToValueDays: avgTTV, customerSatisfactionScore: csat, featureAdoptionPct: featureAdoption,
      firstYearRetentionRatePct: retention, npsScore: nps, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getBestPerformingTemplates(): OnboardingEffectivenessRecord[] {
    return [...this.records].sort((a, b) => b.firstYearRetentionRatePct - a.firstYearRetentionRatePct);
  }

  getAvgNPS(): number {
    if (!this.records.length) return 0;
    return Math.round(this.records.reduce((s, r) => s + r.npsScore, 0) / this.records.length);
  }
}

export const onboardingTracker = new OnboardingTracker();
export const adoptionMilestoneTracker = new AdoptionMilestoneTracker();
export const onboardingDropOffAnalyzer = new OnboardingDropOffAnalyzer();
export const onboardingEffectivenessTracker = new OnboardingEffectivenessTracker();

export { OnboardingRecord, AdoptionMilestoneRecord, OnboardingDropOffRecord, OnboardingEffectivenessRecord };
