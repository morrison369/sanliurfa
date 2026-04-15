/**
 * Phase 312: Customer Segmentation Intelligence
 * RFM analysis, cohort analysis, micro-segmentation, segment health
 */

import { logger } from './logger';

interface RFMRecord {
  rfmId: string;
  customerId: string;
  customerName: string;
  recencyDays: number;            // days since last purchase
  frequencyCount: number;         // number of purchases in period
  monetaryValueUSD: number;       // total spend in period
  recencyScore: number;           // 1-5
  frequencyScore: number;         // 1-5
  monetaryScore: number;          // 1-5
  rfmScore: number;               // R+F+M composite
  segment: 'champions' | 'loyal' | 'potential_loyal' | 'at_risk' | 'cant_lose' | 'hibernating' | 'lost' | 'new' | 'promising';
  lifetimeValueUSD: number;
  predictedChurnProbabilityPct: number;
  calculatedAt: number;
}

interface CohortRecord {
  cohortId: string;
  cohortName: string;
  cohortPeriod: string;           // e.g., '2025-Q1' — when cohort first acquired
  initialSize: number;
  retentionByPeriod: { period: string; retained: number; retentionPct: number }[];
  avgRetentionPct: number;
  revenueByPeriod: { period: string; revenueUSD: number }[];
  ltv30Day: number;
  ltv90Day: number;
  ltv365Day: number;
  calculatedAt: number;
}

interface SegmentRecord {
  segmentId: string;
  segmentName: string;
  segmentType: 'behavioral' | 'demographic' | 'geographic' | 'psychographic' | 'value_based';
  criteria: string[];
  customerCount: number;
  totalRevenueUSD: number;
  avgOrderValueUSD: number;
  avgPurchaseFrequency: number;
  churnRatePct: number;
  growthRatePct: number;
  npsScore: number;
  engagementScore: number;
  segmentHealthScore: number;     // composite 0-100
  recommendedActions: string[];
  createdAt: number;
}

interface SegmentMigrationRecord {
  recordId: string;
  period: string;
  fromSegment: string;
  toSegment: string;
  customerCount: number;
  revenueImpactUSD: number;
  migrationDirection: 'upgrade' | 'downgrade' | 'churn' | 'reactivation';
  calculatedAt: number;
}

class RFMAnalyzer {
  private records: Map<string, RFMRecord> = new Map();
  private counter = 0;

  analyze(customerId: string, name: string, recencyDays: number, frequency: number, monetary: number, ltv: number): RFMRecord {
    // Score 1-5 based on thresholds
    const rScore = recencyDays <= 30 ? 5 : recencyDays <= 90 ? 4 : recencyDays <= 180 ? 3 : recencyDays <= 365 ? 2 : 1;
    const fScore = frequency >= 20 ? 5 : frequency >= 10 ? 4 : frequency >= 5 ? 3 : frequency >= 2 ? 2 : 1;
    const mScore = monetary >= 10000 ? 5 : monetary >= 5000 ? 4 : monetary >= 1000 ? 3 : monetary >= 300 ? 2 : 1;
    const rfmTotal = rScore + fScore + mScore;

    const segment: RFMRecord['segment'] =
      rfmTotal >= 13 ? 'champions' :
      rfmTotal >= 11 && fScore >= 4 ? 'loyal' :
      rfmTotal >= 10 ? 'potential_loyal' :
      rScore <= 2 && rfmTotal >= 9 ? 'cant_lose' :
      rScore <= 2 && rfmTotal >= 7 ? 'at_risk' :
      rScore === 1 && rfmTotal <= 6 ? 'lost' :
      recencyDays <= 30 && frequency === 1 ? 'new' :
      rfmTotal >= 7 ? 'promising' : 'hibernating';

    const churnProb = rScore <= 2 ? Math.min(90, (6 - rScore) * 20) : Math.max(5, 30 - rfmTotal * 2);

    const rfmId = `rfm-${Date.now()}-${++this.counter}`;
    const record: RFMRecord = {
      rfmId, customerId, customerName: name, recencyDays, frequencyCount: frequency,
      monetaryValueUSD: monetary, recencyScore: rScore, frequencyScore: fScore,
      monetaryScore: mScore, rfmScore: rfmTotal, segment, lifetimeValueUSD: ltv,
      predictedChurnProbabilityPct: churnProb, calculatedAt: Date.now()
    };
    this.records.set(customerId, record);
    logger.debug('RFM analyzed', { customerId, segment, rfmScore: rfmTotal });
    return record;
  }

  getSegment(segment: RFMRecord['segment']): RFMRecord[] {
    return Array.from(this.records.values()).filter(r => r.segment === segment);
  }

  getAtRiskCustomers(): RFMRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.segment === 'at_risk' || r.segment === 'cant_lose')
      .sort((a, b) => b.lifetimeValueUSD - a.lifetimeValueUSD);
  }

  getSegmentDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    Array.from(this.records.values()).forEach(r => { dist[r.segment] = (dist[r.segment] || 0) + 1; });
    return dist;
  }

  getTotalLTV(): number {
    return Array.from(this.records.values()).reduce((s, r) => s + r.lifetimeValueUSD, 0);
  }
}

class CohortAnalyzer {
  private cohorts: Map<string, CohortRecord> = new Map();
  private counter = 0;

  create(name: string, period: string, initialSize: number, retentionData: { period: string; retained: number }[], revenueData: { period: string; revenueUSD: number }[]): CohortRecord {
    const cohortId = `cohort-${Date.now()}-${++this.counter}`;
    const retentionByPeriod = retentionData.map(d => ({
      ...d, retentionPct: initialSize > 0 ? Math.round((d.retained / initialSize) * 100 * 10) / 10 : 0
    }));
    const avgRetention = retentionByPeriod.length > 0
      ? Math.round(retentionByPeriod.reduce((s, d) => s + d.retentionPct, 0) / retentionByPeriod.length * 10) / 10 : 0;

    const sortedRevenue = [...revenueData].sort((a, b) => a.period.localeCompare(b.period));
    const ltv30 = sortedRevenue[0]?.revenueUSD || 0;
    const ltv90 = sortedRevenue.slice(0, 3).reduce((s, d) => s + d.revenueUSD, 0);
    const ltv365 = sortedRevenue.reduce((s, d) => s + d.revenueUSD, 0);

    const record: CohortRecord = {
      cohortId, cohortName: name, cohortPeriod: period, initialSize,
      retentionByPeriod, avgRetentionPct: avgRetention, revenueByPeriod: revenueData,
      ltv30Day: ltv30, ltv90Day: ltv90, ltv365Day: ltv365, calculatedAt: Date.now()
    };
    this.cohorts.set(cohortId, record);
    logger.debug('Cohort created', { cohortId, name, initialSize, avgRetention });
    return record;
  }

  getBestRetentionCohorts(limit = 3): CohortRecord[] {
    return Array.from(this.cohorts.values())
      .sort((a, b) => b.avgRetentionPct - a.avgRetentionPct)
      .slice(0, limit);
  }

  getHighLTVCohorts(minLTV = 100000): CohortRecord[] {
    return Array.from(this.cohorts.values()).filter(c => c.ltv365Day >= minLTV);
  }
}

class SegmentManager {
  private segments: Map<string, SegmentRecord> = new Map();
  private counter = 0;

  define(name: string, type: SegmentRecord['segmentType'], criteria: string[], customers: number, revenue: number, aov: number, frequency: number, churnRate: number, growthRate: number, nps: number, engagement: number, actions: string[]): SegmentRecord {
    const healthScore =
      (100 - churnRate) * 0.3 + growthRate * 0.2 +
      Math.min(100, (nps + 100) / 2) * 0.2 + engagement * 0.2 +
      Math.min(100, frequency * 10) * 0.1;

    const segmentId = `seg-${Date.now()}-${++this.counter}`;
    const record: SegmentRecord = {
      segmentId, segmentName: name, segmentType: type, criteria,
      customerCount: customers, totalRevenueUSD: revenue, avgOrderValueUSD: aov,
      avgPurchaseFrequency: frequency, churnRatePct: churnRate, growthRatePct: growthRate,
      npsScore: nps, engagementScore: engagement,
      segmentHealthScore: Math.round(Math.max(0, Math.min(100, healthScore)) * 10) / 10,
      recommendedActions: actions, createdAt: Date.now()
    };
    this.segments.set(segmentId, record);
    return record;
  }

  getTopSegmentsByRevenue(limit = 5): SegmentRecord[] {
    return Array.from(this.segments.values())
      .sort((a, b) => b.totalRevenueUSD - a.totalRevenueUSD)
      .slice(0, limit);
  }

  getUnhealthySegments(threshold = 50): SegmentRecord[] {
    return Array.from(this.segments.values()).filter(s => s.segmentHealthScore < threshold);
  }

  getTotalSegmentedRevenue(): number {
    return Array.from(this.segments.values()).reduce((s, seg) => s + seg.totalRevenueUSD, 0);
  }
}

class SegmentMigrationTracker {
  private records: SegmentMigrationRecord[] = [];
  private counter = 0;

  private upgradeSegments = new Set(['champions', 'loyal', 'potential_loyal', 'promising', 'new']);

  track(period: string, from: string, to: string, count: number, revenueImpact: number): SegmentMigrationRecord {
    const direction: SegmentMigrationRecord['migrationDirection'] =
      to === 'lost' ? 'churn' :
      from === 'lost' || from === 'hibernating' ? 'reactivation' :
      this.upgradeSegments.has(to) && !this.upgradeSegments.has(from) ? 'upgrade' : 'downgrade';

    const recordId = `segmig-${Date.now()}-${++this.counter}`;
    const record: SegmentMigrationRecord = {
      recordId, period, fromSegment: from, toSegment: to, customerCount: count,
      revenueImpactUSD: revenueImpact, migrationDirection: direction, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getChurnMigrations(period: string): SegmentMigrationRecord[] {
    return this.records.filter(r => r.period === period && r.migrationDirection === 'churn');
  }

  getNetMigrationScore(period: string): number {
    const upgrades = this.records.filter(r => r.period === period && r.migrationDirection === 'upgrade').reduce((s, r) => s + r.customerCount, 0);
    const downgrades = this.records.filter(r => r.period === period && (r.migrationDirection === 'downgrade' || r.migrationDirection === 'churn')).reduce((s, r) => s + r.customerCount, 0);
    return upgrades - downgrades;
  }
}

export const rfmAnalyzer = new RFMAnalyzer();
export const cohortAnalyzer = new CohortAnalyzer();
export const segmentManager = new SegmentManager();
export const segmentMigrationTracker = new SegmentMigrationTracker();

export { RFMRecord, CohortRecord, SegmentRecord, SegmentMigrationRecord };
