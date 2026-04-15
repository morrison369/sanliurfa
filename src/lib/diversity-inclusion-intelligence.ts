/**
 * Phase 297: Workforce Diversity & Inclusion Intelligence
 * Representation analytics, pay equity, inclusion sentiment, pipeline diversity
 */

import { logger } from './logger';

interface RepresentationRecord {
  recordId: string;
  period: string;
  dimension: 'gender' | 'ethnicity' | 'age' | 'disability' | 'veteran' | 'lgbtq';
  level: 'all_employees' | 'manager' | 'senior_manager' | 'director' | 'vp' | 'c_suite' | 'board';
  groupName: string;
  headcount: number;
  totalAtLevel: number;
  representationPct: number;
  benchmarkPct: number;          // external benchmark / workforce availability
  gapToBenchmark: number;
  yoyChangePct: number;
  recordedAt: number;
}

interface PayEquityRecord {
  recordId: string;
  period: string;
  analysisGroup: string;         // e.g., 'women vs men in engineering'
  dimension: string;
  medianPayGapPct: number;       // unadjusted
  adjustedPayGapPct: number;     // controlled for role/experience/location
  employeesAnalyzed: number;
  statSignificant: boolean;
  remediationActions: string[];
  remediationBudget: number;
  status: 'identified' | 'remediating' | 'resolved';
  recordedAt: number;
}

interface InclusionSentimentRecord {
  recordId: string;
  period: string;
  surveyParticipationRatePct: number;
  overallInclusionScore: number;    // 0-100
  belongingScore: number;           // 0-100
  fairnessScore: number;            // 0-100
  respectScore: number;             // 0-100
  psychologicalSafetyScore: number; // 0-100
  allyshipScore: number;            // 0-100
  topConcerns: string[];
  yoyChangeScore: number;
  calculatedAt: number;
}

interface DIHiringPipelineRecord {
  recordId: string;
  period: string;
  totalApplications: number;
  diverseApplications: number;
  diverseApplicationRatePct: number;
  diverseCandidatesInterviewed: number;
  diverseOffersExtended: number;
  diverseHires: number;
  diverseHireRatePct: number;
  offerAcceptanceRateDiversePct: number;
  sourcingChannelBreakdown: Record<string, number>;
  calculatedAt: number;
}

class RepresentationAnalyzer {
  private records: RepresentationRecord[] = [];
  private counter = 0;

  record(period: string, dimension: RepresentationRecord['dimension'], level: RepresentationRecord['level'], groupName: string, headcount: number, totalAtLevel: number, benchmarkPct: number, previousPct?: number): RepresentationRecord {
    const representationPct = totalAtLevel > 0 ? (headcount / totalAtLevel) * 100 : 0;
    const yoyChange = previousPct !== undefined ? representationPct - previousPct : 0;

    const recordId = `divrep-${Date.now()}-${++this.counter}`;
    const rec: RepresentationRecord = {
      recordId, period, dimension, level, groupName, headcount, totalAtLevel,
      representationPct, benchmarkPct, gapToBenchmark: representationPct - benchmarkPct,
      yoyChangePct: yoyChange, recordedAt: Date.now()
    };
    this.records.push(rec);
    logger.debug('Representation recorded', { dimension, level, representationPct, gapToBenchmark: rec.gapToBenchmark });
    return rec;
  }

  getGaps(dimension?: RepresentationRecord['dimension']): RepresentationRecord[] {
    return this.records
      .filter(r => (!dimension || r.dimension === dimension) && r.gapToBenchmark < -5)
      .sort((a, b) => a.gapToBenchmark - b.gapToBenchmark);
  }

  getLatestByDimensionLevel(dimension: RepresentationRecord['dimension'], level: RepresentationRecord['level']): RepresentationRecord | undefined {
    return [...this.records]
      .filter(r => r.dimension === dimension && r.level === level)
      .pop();
  }

  getImprovingGroups(): RepresentationRecord[] {
    return this.records.filter(r => r.yoyChangePct > 0);
  }
}

class PayEquityAnalyzer {
  private records: PayEquityRecord[] = [];
  private counter = 0;

  analyze(period: string, group: string, dimension: string, medianGap: number, adjustedGap: number, employeesAnalyzed: number, statSignificant: boolean, remediationActions: string[], remediationBudget: number): PayEquityRecord {
    const status: PayEquityRecord['status'] =
      Math.abs(adjustedGap) < 1 ? 'resolved' :
      remediationActions.length > 0 ? 'remediating' : 'identified';

    const recordId = `payequity-${Date.now()}-${++this.counter}`;
    const record: PayEquityRecord = {
      recordId, period, analysisGroup: group, dimension, medianPayGapPct: medianGap,
      adjustedPayGapPct: adjustedGap, employeesAnalyzed, statSignificant, remediationActions,
      remediationBudget, status, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getActiveGaps(): PayEquityRecord[] {
    return this.records.filter(r => r.status !== 'resolved' && r.statSignificant)
      .sort((a, b) => Math.abs(b.adjustedPayGapPct) - Math.abs(a.adjustedPayGapPct));
  }

  getTotalRemediationBudget(): number {
    return this.records.filter(r => r.status === 'remediating').reduce((s, r) => s + r.remediationBudget, 0);
  }

  getAvgAdjustedGap(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + Math.abs(r.adjustedPayGapPct), 0) / this.records.length;
  }
}

class InclusionSentimentTracker {
  private records: InclusionSentimentRecord[] = [];
  private counter = 0;

  survey(period: string, participationPct: number, belonging: number, fairness: number, respect: number, psychSafety: number, allyship: number, concerns: string[], previousScore?: number): InclusionSentimentRecord {
    const overallScore = belonging * 0.25 + fairness * 0.25 + respect * 0.2 + psychSafety * 0.2 + allyship * 0.1;
    const yoyChange = previousScore !== undefined ? overallScore - previousScore : 0;

    const recordId = `inclsent-${Date.now()}-${++this.counter}`;
    const record: InclusionSentimentRecord = {
      recordId, period, surveyParticipationRatePct: participationPct,
      overallInclusionScore: Math.max(0, Math.min(100, overallScore)),
      belongingScore: belonging, fairnessScore: fairness, respectScore: respect,
      psychologicalSafetyScore: psychSafety, allyshipScore: allyship, topConcerns: concerns,
      yoyChangeScore: yoyChange, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): InclusionSentimentRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getScoreTrend(): number[] {
    return this.records.map(r => r.overallInclusionScore);
  }

  getWeakestDimension(): string | null {
    const latest = this.getLatest();
    if (!latest) return null;
    const scores = {
      belonging: latest.belongingScore, fairness: latest.fairnessScore,
      respect: latest.respectScore, psychological_safety: latest.psychologicalSafetyScore,
      allyship: latest.allyshipScore
    };
    return Object.entries(scores).reduce((min, curr) => curr[1] < min[1] ? curr : min)[0];
  }
}

class DIHiringPipelineTracker {
  private records: DIHiringPipelineRecord[] = [];
  private counter = 0;

  track(period: string, totalApps: number, diverseApps: number, interviewed: number, offersExtended: number, diverseHires: number, sourcingBreakdown: Record<string, number>): DIHiringPipelineRecord {
    const diverseAppRate = totalApps > 0 ? (diverseApps / totalApps) * 100 : 0;
    const diverseHireRate = totalApps > 0 ? (diverseHires / totalApps) * 100 : 0;
    const offerAcceptRate = offersExtended > 0 ? (diverseHires / offersExtended) * 100 : 0;

    const recordId = `dihire-${Date.now()}-${++this.counter}`;
    const record: DIHiringPipelineRecord = {
      recordId, period, totalApplications: totalApps, diverseApplications: diverseApps,
      diverseApplicationRatePct: diverseAppRate, diverseCandidatesInterviewed: interviewed,
      diverseOffersExtended: offersExtended, diverseHires, diverseHireRatePct: diverseHireRate,
      offerAcceptanceRateDiversePct: offerAcceptRate, sourcingChannelBreakdown: sourcingBreakdown,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): DIHiringPipelineRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getHireRateTrend(): number[] {
    return this.records.map(r => r.diverseHireRatePct);
  }

  getTopSourcingChannels(limit = 3): { channel: string; count: number }[] {
    const latest = this.getLatest();
    if (!latest) return [];
    return Object.entries(latest.sourcingChannelBreakdown)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const representationAnalyzer = new RepresentationAnalyzer();
export const payEquityAnalyzer = new PayEquityAnalyzer();
export const inclusionSentimentTracker = new InclusionSentimentTracker();
export const diHiringPipelineTracker = new DIHiringPipelineTracker();

export { RepresentationRecord, PayEquityRecord, InclusionSentimentRecord, DIHiringPipelineRecord };
