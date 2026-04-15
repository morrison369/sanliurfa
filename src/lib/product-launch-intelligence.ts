/**
 * Phase 328: Product Launch Intelligence
 * Go-to-market tracking, launch metrics, adoption curves, launch readiness
 */

import { logger } from './logger';

interface LaunchRecord {
  launchId: string;
  productName: string;
  version: string;
  launchType: 'new_product' | 'major_release' | 'minor_release' | 'feature' | 'hotfix';
  targetSegments: string[];
  targetMarkets: string[];
  plannedLaunchDate: number;
  actualLaunchDate?: number;
  status: 'planning' | 'preparation' | 'soft_launch' | 'full_launch' | 'post_launch' | 'cancelled';
  launchOwner: string;
  readinessScore: number;         // 0-100, gating for launch approval
  goNoGoStatus: 'go' | 'no_go' | 'conditional_go' | 'pending';
  budget: number;
  spendUSD: number;
  createdAt: number;
}

interface LaunchReadinessRecord {
  readinessId: string;
  launchId: string;
  productName: string;
  checklistItems: { item: string; owner: string; status: 'complete' | 'in_progress' | 'not_started' | 'blocked'; criticalPath: boolean }[];
  completionPct: number;
  criticalPathCompletionPct: number;
  blockers: string[];
  risksIdentified: string[];
  marketingReady: boolean;
  salesReady: boolean;
  supportReady: boolean;
  technicalReady: boolean;
  legalReady: boolean;
  overallReady: boolean;
  assessedAt: number;
}

interface LaunchMetricsRecord {
  metricsId: string;
  launchId: string;
  productName: string;
  period: string;
  daysPostLaunch: number;
  newUsers: number;
  activeUsers: number;
  trialConversions: number;
  revenueUSD: number;
  revenueVsTargetPct: number;
  adoptionRatePct: number;
  virality: number;               // k-factor
  churnRatePct: number;
  npsScore: number;
  supportTickets: number;
  criticalBugs: number;
  launchHealthScore: number;      // 0-100 composite
  calculatedAt: number;
}

interface AdoptionCurveRecord {
  curveId: string;
  launchId: string;
  productName: string;
  segments: {
    name: string;
    adoptionPct: number;
    daysToAdopt: number;
  }[];  // innovators, early_adopters, early_majority, late_majority, laggards
  currentAdoptionPct: number;
  peakAdoptionPct: number;
  timeToMassAdoptionDays?: number;  // days to reach 50%
  adoptionVelocity: number;          // %/day
  adoptionCurvePhase: 'launch' | 'growth' | 'acceleration' | 'maturation' | 'plateau';
  projectedAdoption90Days: number;
  calculatedAt: number;
}

class LaunchManager {
  private launches: Map<string, LaunchRecord> = new Map();
  private counter = 0;

  create(productName: string, version: string, type: LaunchRecord['launchType'], plannedDate: number, owner: string, budget: number, segments: string[], markets: string[]): LaunchRecord {
    const launchId = `launch-${Date.now()}-${++this.counter}`;
    const record: LaunchRecord = {
      launchId, productName, version, launchType: type,
      targetSegments: segments, targetMarkets: markets,
      plannedLaunchDate: plannedDate, status: 'planning',
      launchOwner: owner, readinessScore: 0,
      goNoGoStatus: 'pending', budget, spendUSD: 0, createdAt: Date.now()
    };
    this.launches.set(launchId, record);
    logger.debug('Launch created', { launchId, productName, version, type });
    return record;
  }

  updateStatus(launchId: string, status: LaunchRecord['status'], readinessScore?: number, spendUSD?: number): boolean {
    const launch = this.launches.get(launchId);
    if (!launch) return false;
    launch.status = status;
    if (readinessScore !== undefined) {
      launch.readinessScore = readinessScore;
      launch.goNoGoStatus = readinessScore >= 90 ? 'go' : readinessScore >= 70 ? 'conditional_go' : 'no_go';
    }
    if (spendUSD !== undefined) launch.spendUSD = spendUSD;
    if (status === 'soft_launch' || status === 'full_launch') launch.actualLaunchDate = Date.now();
    return true;
  }

  getUpcomingLaunches(daysAhead = 30): LaunchRecord[] {
    const future = Date.now() + daysAhead * 86400000;
    return Array.from(this.launches.values())
      .filter(l => l.plannedLaunchDate <= future && (l.status === 'planning' || l.status === 'preparation'))
      .sort((a, b) => a.plannedLaunchDate - b.plannedLaunchDate);
  }

  getActiveLaunches(): LaunchRecord[] {
    return Array.from(this.launches.values()).filter(l => l.status === 'soft_launch' || l.status === 'full_launch' || l.status === 'post_launch');
  }

  getLaunch(id: string): LaunchRecord | undefined {
    return this.launches.get(id);
  }

  getAll(): LaunchRecord[] {
    return Array.from(this.launches.values());
  }
}

class LaunchReadinessAssessor {
  private assessments: Map<string, LaunchReadinessRecord> = new Map();
  private counter = 0;

  assess(launchId: string, productName: string, items: LaunchReadinessRecord['checklistItems'], risks: string[]): LaunchReadinessRecord {
    const readinessId = `readiness-${Date.now()}-${++this.counter}`;
    const complete = items.filter(i => i.status === 'complete').length;
    const completionPct = items.length > 0 ? Math.round((complete / items.length) * 100 * 10) / 10 : 0;
    const critical = items.filter(i => i.criticalPath);
    const criticalComplete = critical.filter(i => i.status === 'complete').length;
    const criticalPct = critical.length > 0 ? Math.round((criticalComplete / critical.length) * 100 * 10) / 10 : 100;
    const blockers = items.filter(i => i.status === 'blocked').map(i => i.item);

    // Domain-specific readiness
    const domainItems = (domain: string) => items.filter(i => i.item.toLowerCase().includes(domain));
    const domainReady = (domain: string) => domainItems(domain).every(i => i.status === 'complete') || domainItems(domain).length === 0;

    const record: LaunchReadinessRecord = {
      readinessId, launchId, productName, checklistItems: items,
      completionPct, criticalPathCompletionPct: criticalPct,
      blockers, risksIdentified: risks,
      marketingReady: domainReady('marketing'),
      salesReady: domainReady('sales'),
      supportReady: domainReady('support'),
      technicalReady: domainReady('technical'),
      legalReady: domainReady('legal'),
      overallReady: criticalPct >= 100 && blockers.length === 0,
      assessedAt: Date.now()
    };
    this.assessments.set(launchId, record);
    return record;
  }

  getReadiness(launchId: string): LaunchReadinessRecord | undefined {
    return this.assessments.get(launchId);
  }

  getBlockedLaunches(): LaunchReadinessRecord[] {
    return Array.from(this.assessments.values()).filter(r => r.blockers.length > 0);
  }
}

class LaunchMetricsTracker {
  private metrics: LaunchMetricsRecord[] = [];
  private counter = 0;

  track(launchId: string, productName: string, period: string, daysPostLaunch: number, newUsers: number, activeUsers: number, trialConversions: number, revenue: number, revenueTarget: number, churnRatePct: number, npsScore: number, supportTickets: number, criticalBugs: number, totalAddressableUsers: number): LaunchMetricsRecord {
    const metricsId = `launchmet-${Date.now()}-${++this.counter}`;
    const adoptionRatePct = totalAddressableUsers > 0 ? Math.round((activeUsers / totalAddressableUsers) * 100 * 10) / 10 : 0;
    const revenueVsTargetPct = revenueTarget > 0 ? Math.round((revenue / revenueTarget) * 100 * 10) / 10 : 0;
    // k-factor: each user invites this many others
    const virality = newUsers > 0 && activeUsers > newUsers ? Math.round((newUsers / activeUsers) * 100) / 100 : 0;

    // Health score: penalize bugs, churn, missed targets
    const bugPenalty = criticalBugs * 10;
    const churnPenalty = churnRatePct > 10 ? 20 : churnRatePct > 5 ? 10 : 0;
    const revPenalty = revenueVsTargetPct < 70 ? 20 : revenueVsTargetPct < 85 ? 10 : 0;
    const launchHealthScore = Math.max(0, 100 - bugPenalty - churnPenalty - revPenalty);

    const record: LaunchMetricsRecord = {
      metricsId, launchId, productName, period, daysPostLaunch,
      newUsers, activeUsers, trialConversions, revenueUSD: revenue,
      revenueVsTargetPct, adoptionRatePct, virality, churnRatePct,
      npsScore, supportTickets, criticalBugs, launchHealthScore, calculatedAt: Date.now()
    };
    this.metrics.push(record);
    logger.debug('Launch metrics tracked', { launchId, daysPostLaunch, adoptionRatePct, launchHealthScore });
    return record;
  }

  getByLaunch(launchId: string): LaunchMetricsRecord[] {
    return this.metrics.filter(m => m.launchId === launchId).sort((a, b) => a.daysPostLaunch - b.daysPostLaunch);
  }

  getLatestHealth(launchId: string): number {
    const records = this.getByLaunch(launchId);
    return records[records.length - 1]?.launchHealthScore ?? 0;
  }
}

class AdoptionCurveAnalyzer {
  private curves: AdoptionCurveRecord[] = [];
  private counter = 0;

  analyze(launchId: string, productName: string, currentAdoptionPct: number, peakAdoptionPct: number, daysPostLaunch: number, growthRateDailyPct: number, segmentAdoptions: AdoptionCurveRecord['segments']): AdoptionCurveRecord {
    const curveId = `adopcurve-${Date.now()}-${++this.counter}`;
    const adoptionVelocity = Math.round(growthRateDailyPct * 100) / 100;
    const daysToMassAdoption = currentAdoptionPct < 50 && growthRateDailyPct > 0
      ? Math.ceil((50 - currentAdoptionPct) / growthRateDailyPct)
      : undefined;
    const projected90 = Math.min(peakAdoptionPct, Math.round(currentAdoptionPct + growthRateDailyPct * 90));

    const adoptionCurvePhase: AdoptionCurveRecord['adoptionCurvePhase'] =
      daysPostLaunch <= 7 ? 'launch' :
      currentAdoptionPct < 10 ? 'growth' :
      growthRateDailyPct > 0.5 ? 'acceleration' :
      currentAdoptionPct >= peakAdoptionPct * 0.9 ? 'plateau' : 'maturation';

    const record: AdoptionCurveRecord = {
      curveId, launchId, productName, segments: segmentAdoptions,
      currentAdoptionPct, peakAdoptionPct, timeToMassAdoptionDays: daysToMassAdoption,
      adoptionVelocity, adoptionCurvePhase, projectedAdoption90Days: projected90,
      calculatedAt: Date.now()
    };
    this.curves.push(record);
    return record;
  }

  getByLaunch(launchId: string): AdoptionCurveRecord[] {
    return this.curves.filter(c => c.launchId === launchId);
  }

  getLatest(launchId: string): AdoptionCurveRecord | undefined {
    return this.getByLaunch(launchId).slice(-1)[0];
  }
}

export const launchManager = new LaunchManager();
export const launchReadinessAssessor = new LaunchReadinessAssessor();
export const launchMetricsTracker = new LaunchMetricsTracker();
export const adoptionCurveAnalyzer = new AdoptionCurveAnalyzer();

export { LaunchRecord, LaunchReadinessRecord, LaunchMetricsRecord, AdoptionCurveRecord };
