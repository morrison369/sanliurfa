/**
 * Phase 227: Productivity Analytics
 * Individual/team productivity tracking, output measurement, time utilization, productivity benchmarking
 */

import { logger } from './logger';

interface ProductivityRecord {
  recordId: string;
  employeeId: string;
  period: string;
  tasksCompleted: number;
  tasksPlanned: number;
  outputScore: number;       // 0-100
  qualityScore: number;      // 0-100
  focusTimeHours: number;
  meetingTimeHours: number;
  productivityIndex: number; // composite 0-100
  capturedAt: number;
}

interface TeamProductivitySummary {
  summaryId: string;
  teamId: string;
  period: string;
  memberCount: number;
  avgProductivityIndex: number;
  topPerformerIds: string[];
  atRiskMemberIds: string[];
  collaborationScore: number;  // 0-100
  deliveryRate: number;        // tasks completed / planned %
  capturedAt: number;
}

interface TimeUtilizationBreakdown {
  breakdownId: string;
  employeeId: string;
  period: string;
  deepWorkHours: number;
  meetingHours: number;
  adminHours: number;
  communicationHours: number;
  totalTrackedHours: number;
  deepWorkRatio: number;  // deepWork / total
  capturedAt: number;
}

interface ProductivityBenchmark {
  benchmarkId: string;
  role: string;
  metric: string;
  industryMedian: number;
  topQuartile: number;
  ourAvg: number;
  gap: number;
  updatedAt: number;
}

class ProductivityTracker {
  private records: Map<string, ProductivityRecord[]> = new Map();
  private counter = 0;

  record(employeeId: string, period: string, tasksCompleted: number, tasksPlanned: number, outputScore: number, qualityScore: number, focusHours: number, meetingHours: number): ProductivityRecord {
    const deliveryRate = tasksPlanned > 0 ? (tasksCompleted / tasksPlanned) * 100 : 0;
    const productivityIndex = deliveryRate * 0.35 + outputScore * 0.35 + qualityScore * 0.3;
    const recordId = `prodrec-${Date.now()}-${++this.counter}`;
    const record: ProductivityRecord = {
      recordId, employeeId, period, tasksCompleted, tasksPlanned,
      outputScore: Math.max(0, Math.min(100, outputScore)),
      qualityScore: Math.max(0, Math.min(100, qualityScore)),
      focusTimeHours: focusHours, meetingTimeHours: meetingHours,
      productivityIndex: Math.max(0, Math.min(100, productivityIndex)),
      capturedAt: Date.now()
    };
    const existing = this.records.get(employeeId) || [];
    existing.push(record);
    this.records.set(employeeId, existing);
    logger.debug('Productivity recorded', { employeeId, period, productivityIndex: productivityIndex.toFixed(1) });
    return record;
  }

  getLatest(employeeId: string): ProductivityRecord | undefined {
    const history = this.records.get(employeeId) || [];
    return history[history.length - 1];
  }

  getTrend(employeeId: string): 'improving' | 'stable' | 'declining' {
    const history = this.records.get(employeeId) || [];
    if (history.length < 2) return 'stable';
    const diff = history[history.length - 1].productivityIndex - history[history.length - 2].productivityIndex;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }

  getLowProductivity(threshold = 60): string[] {
    return Array.from(this.records.entries())
      .filter(([, hist]) => {
        const latest = hist[hist.length - 1];
        return latest && latest.productivityIndex < threshold;
      })
      .map(([id]) => id);
  }
}

class TeamProductivityAnalyzer {
  private summaries: Map<string, TeamProductivitySummary[]> = new Map();
  private counter = 0;

  analyze(teamId: string, period: string, memberRecords: ProductivityRecord[], collaborationScore: number): TeamProductivitySummary {
    const sorted = [...memberRecords].sort((a, b) => b.productivityIndex - a.productivityIndex);
    const topPerformerIds = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2))).map(r => r.employeeId);
    const atRiskMemberIds = sorted.filter(r => r.productivityIndex < 60).map(r => r.employeeId);
    const avgIdx = memberRecords.length > 0 ? memberRecords.reduce((s, r) => s + r.productivityIndex, 0) / memberRecords.length : 0;
    const totalCompleted = memberRecords.reduce((s, r) => s + r.tasksCompleted, 0);
    const totalPlanned = memberRecords.reduce((s, r) => s + r.tasksPlanned, 0);
    const deliveryRate = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;
    const summaryId = `teamprod-${Date.now()}-${++this.counter}`;
    const summary: TeamProductivitySummary = {
      summaryId, teamId, period, memberCount: memberRecords.length,
      avgProductivityIndex: avgIdx, topPerformerIds, atRiskMemberIds,
      collaborationScore, deliveryRate, capturedAt: Date.now()
    };
    const existing = this.summaries.get(teamId) || [];
    existing.push(summary);
    this.summaries.set(teamId, existing);
    return summary;
  }

  getLatest(teamId: string): TeamProductivitySummary | undefined {
    const history = this.summaries.get(teamId) || [];
    return history[history.length - 1];
  }

  getTopTeams(limit = 5): TeamProductivitySummary[] {
    return Array.from(this.summaries.values())
      .map(h => h[h.length - 1])
      .filter((s): s is TeamProductivitySummary => !!s)
      .sort((a, b) => b.avgProductivityIndex - a.avgProductivityIndex)
      .slice(0, limit);
  }
}

class TimeUtilizationAnalyzer {
  private breakdowns: Map<string, TimeUtilizationBreakdown[]> = new Map();
  private counter = 0;

  record(employeeId: string, period: string, deepWork: number, meetings: number, admin: number, communication: number): TimeUtilizationBreakdown {
    const total = deepWork + meetings + admin + communication;
    const breakdownId = `timeutl-${Date.now()}-${++this.counter}`;
    const breakdown: TimeUtilizationBreakdown = {
      breakdownId, employeeId, period,
      deepWorkHours: deepWork, meetingHours: meetings, adminHours: admin,
      communicationHours: communication, totalTrackedHours: total,
      deepWorkRatio: total > 0 ? deepWork / total : 0,
      capturedAt: Date.now()
    };
    const existing = this.breakdowns.get(employeeId) || [];
    existing.push(breakdown);
    this.breakdowns.set(employeeId, existing);
    return breakdown;
  }

  getMeetingHeavy(threshold = 0.4): string[] {
    return Array.from(this.breakdowns.entries())
      .filter(([, hist]) => {
        const latest = hist[hist.length - 1];
        return latest && latest.totalTrackedHours > 0 && (latest.meetingHours / latest.totalTrackedHours) > threshold;
      })
      .map(([id]) => id);
  }

  getAvgDeepWorkRatio(): number {
    const all = Array.from(this.breakdowns.values())
      .map(h => h[h.length - 1])
      .filter((b): b is TimeUtilizationBreakdown => !!b);
    if (!all.length) return 0;
    return all.reduce((s, b) => s + b.deepWorkRatio, 0) / all.length;
  }
}

class ProductivityBenchmarker {
  private benchmarks: Map<string, ProductivityBenchmark> = new Map();
  private counter = 0;

  set(role: string, metric: string, industryMedian: number, topQuartile: number, ourAvg: number): ProductivityBenchmark {
    const benchmarkId = `prodbench-${Date.now()}-${++this.counter}`;
    const benchmark: ProductivityBenchmark = {
      benchmarkId, role, metric, industryMedian, topQuartile, ourAvg,
      gap: ourAvg - industryMedian, updatedAt: Date.now()
    };
    this.benchmarks.set(`${role}:${metric}`, benchmark);
    return benchmark;
  }

  getGaps(role: string): Array<{ metric: string; gap: number; status: 'leading' | 'average' | 'lagging' }> {
    return Array.from(this.benchmarks.values())
      .filter(b => b.role === role)
      .map(b => ({
        metric: b.metric,
        gap: b.gap,
        status: b.ourAvg >= b.topQuartile ? 'leading' : b.ourAvg >= b.industryMedian ? 'average' : 'lagging'
      }));
  }

  getBenchmark(role: string, metric: string): ProductivityBenchmark | undefined {
    return this.benchmarks.get(`${role}:${metric}`);
  }
}

export const productivityTracker = new ProductivityTracker();
export const teamProductivityAnalyzer = new TeamProductivityAnalyzer();
export const timeUtilizationAnalyzer = new TimeUtilizationAnalyzer();
export const productivityBenchmarker = new ProductivityBenchmarker();

export { ProductivityRecord, TeamProductivitySummary, TimeUtilizationBreakdown, ProductivityBenchmark };
