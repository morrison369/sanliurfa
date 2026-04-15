/**
 * Phase 267: Workforce Scheduling Intelligence
 * Demand forecasting, shift optimization, skills-based scheduling, coverage analytics
 */

import { logger } from './logger';

interface StaffingDemandForecast {
  forecastId: string;
  department: string;
  period: string;           // e.g. '2026-05-12'
  timeSlot: string;         // e.g. '09:00-12:00'
  forecastedVolume: number; // expected workload units
  requiredStaffCount: number;
  requiredSkills: string[];
  confidencePct: number;
  historicalAccuracyPct: number;
  createdAt: number;
}

interface ShiftAssignment {
  assignmentId: string;
  employeeId: string;
  department: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftDurationHours: number;
  role: string;
  skills: string[];
  status: 'scheduled' | 'confirmed' | 'swapped' | 'absent' | 'completed';
  overtimeHours: number;
  createdAt: number;
}

interface CoverageGapReport {
  reportId: string;
  department: string;
  period: string;
  totalScheduledHours: number;
  requiredHours: number;
  coverageRatePct: number;
  understaffedSlots: number;
  overstaffedSlots: number;
  skillGaps: Array<{ skill: string; shortage: number }>;
  criticalGaps: boolean;
  generatedAt: number;
}

interface SchedulingOptimizationResult {
  resultId: string;
  department: string;
  period: string;
  previousCoveragePct: number;
  optimizedCoveragePct: number;
  coverageImprovement: number;
  overtimeReductionHours: number;
  costSavings: number;
  swapsRecommended: number;
  hireRecommendations: number;
  generatedAt: number;
}

class DemandForecastEngine {
  private forecasts: Map<string, StaffingDemandForecast[]> = new Map();
  private counter = 0;

  forecast(department: string, period: string, timeSlot: string, historicalVolume: number[], requiredSkills: string[]): StaffingDemandForecast {
    // Simple moving average forecast
    const avg = historicalVolume.length > 0
      ? historicalVolume.reduce((s, v) => s + v, 0) / historicalVolume.length : 0;
    const stdDev = historicalVolume.length > 1
      ? Math.sqrt(historicalVolume.reduce((s, v) => s + (v - avg) ** 2, 0) / (historicalVolume.length - 1)) : 0;
    const forecastedVolume = Math.round(avg);
    const requiredStaffCount = Math.ceil(forecastedVolume / 10);  // 10 units per staff member
    const confidencePct = Math.max(50, 100 - (stdDev / Math.max(1, avg)) * 100);
    const historicalAccuracyPct = 85;  // assumed baseline

    const forecastId = `staffforecast-${Date.now()}-${++this.counter}`;
    const forecast: StaffingDemandForecast = {
      forecastId, department, period, timeSlot, forecastedVolume, requiredStaffCount,
      requiredSkills, confidencePct: Math.max(0, Math.min(100, confidencePct)),
      historicalAccuracyPct, createdAt: Date.now()
    };
    const key = `${department}-${period}`;
    const existing = this.forecasts.get(key) || [];
    existing.push(forecast);
    this.forecasts.set(key, existing);
    return forecast;
  }

  getPeakDemandSlots(department: string, period: string): StaffingDemandForecast[] {
    const key = `${department}-${period}`;
    return (this.forecasts.get(key) || [])
      .sort((a, b) => b.forecastedVolume - a.forecastedVolume);
  }

  getForecasts(department: string, period: string): StaffingDemandForecast[] {
    return this.forecasts.get(`${department}-${period}`) || [];
  }
}

class ShiftScheduler {
  private assignments: Map<string, ShiftAssignment[]> = new Map();
  private counter = 0;

  assign(employeeId: string, department: string, shiftDate: string, startTime: string, endTime: string, role: string, skills: string[]): ShiftAssignment {
    const [startH] = startTime.split(':').map(Number);
    const [endH] = endTime.split(':').map(Number);
    const shiftDurationHours = endH > startH ? endH - startH : 24 - startH + endH;
    const overtimeHours = Math.max(0, shiftDurationHours - 8);

    const assignmentId = `shift-${Date.now()}-${++this.counter}`;
    const assignment: ShiftAssignment = {
      assignmentId, employeeId, department, shiftDate, startTime, endTime,
      shiftDurationHours, role, skills, status: 'scheduled', overtimeHours, createdAt: Date.now()
    };
    const key = `${department}-${shiftDate}`;
    const existing = this.assignments.get(key) || [];
    existing.push(assignment);
    this.assignments.set(key, existing);
    logger.debug('Shift assigned', { assignmentId, employeeId, department, shiftDate });
    return assignment;
  }

  updateStatus(assignmentId: string, status: ShiftAssignment['status']): boolean {
    for (const list of this.assignments.values()) {
      const a = list.find(s => s.assignmentId === assignmentId);
      if (a) { a.status = status; return true; }
    }
    return false;
  }

  getDailyAssignments(department: string, date: string): ShiftAssignment[] {
    return this.assignments.get(`${department}-${date}`) || [];
  }

  getTotalOvertimeHours(department: string): number {
    return Array.from(this.assignments.values()).flat()
      .filter(a => a.department === department && a.status !== 'absent')
      .reduce((s, a) => s + a.overtimeHours, 0);
  }
}

class CoverageAnalyzer {
  private reports: CoverageGapReport[] = [];
  private counter = 0;

  analyze(department: string, period: string, scheduledHours: number, requiredHours: number, understaffedSlots: number, overstaffedSlots: number, skillGaps: Array<{ skill: string; shortage: number }>): CoverageGapReport {
    const coverageRatePct = requiredHours > 0 ? (scheduledHours / requiredHours) * 100 : 0;
    const criticalGaps = coverageRatePct < 80 || skillGaps.some(g => g.shortage > 3);

    const reportId = `coverage-${Date.now()}-${++this.counter}`;
    const report: CoverageGapReport = {
      reportId, department, period, totalScheduledHours: scheduledHours,
      requiredHours, coverageRatePct: Math.max(0, Math.min(100, coverageRatePct)),
      understaffedSlots, overstaffedSlots, skillGaps, criticalGaps, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getCriticalGaps(): CoverageGapReport[] {
    return this.reports.filter(r => r.criticalGaps);
  }

  getLatest(department: string): CoverageGapReport | undefined {
    return [...this.reports].reverse().find(r => r.department === department);
  }
}

class SchedulingOptimizer {
  private results: SchedulingOptimizationResult[] = [];
  private counter = 0;

  optimize(department: string, period: string, currentCoverage: number, targetCoverage: number, overtimeHours: number, hourlyRate: number): SchedulingOptimizationResult {
    const coverageImprovement = targetCoverage - currentCoverage;
    const overtimeReduction = Math.round(overtimeHours * 0.4);  // optimize away 40% of overtime
    const costSavings = overtimeReduction * hourlyRate * 1.5;    // OT premium rate
    const swapsRecommended = Math.ceil(overtimeHours / 8);
    const hireRecommendations = currentCoverage < 70 ? Math.ceil((targetCoverage - currentCoverage) / 10) : 0;

    const resultId = `schedopt-${Date.now()}-${++this.counter}`;
    const result: SchedulingOptimizationResult = {
      resultId, department, period, previousCoveragePct: currentCoverage,
      optimizedCoveragePct: targetCoverage, coverageImprovement, overtimeReductionHours: overtimeReduction,
      costSavings, swapsRecommended, hireRecommendations, generatedAt: Date.now()
    };
    this.results.push(result);
    return result;
  }

  getTotalCostSavings(): number {
    return this.results.reduce((s, r) => s + r.costSavings, 0);
  }

  getLatest(): SchedulingOptimizationResult | undefined {
    return this.results[this.results.length - 1];
  }
}

export const demandForecastEngine = new DemandForecastEngine();
export const shiftScheduler = new ShiftScheduler();
export const coverageAnalyzer = new CoverageAnalyzer();
export const schedulingOptimizer = new SchedulingOptimizer();

export { StaffingDemandForecast, ShiftAssignment, CoverageGapReport, SchedulingOptimizationResult };
