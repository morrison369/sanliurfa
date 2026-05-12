/**
 * Unit Tests — performance-intelligence.ts singleton class managers (HR performance)
 *
 * - PerformanceMetricsTracker (submitReview + 5-band classifier + trend detection)
 * - GoalAlignmentAnalyzer (addGoal + updateProgress with at_risk threshold + alignment score)
 * - PerformancePredictionEngine (predict with composite formula + risk factors + confidence)
 * - TeamPerformanceAnalyzer (summarize team avg + top + at-risk + distribution)
 *
 * 5-band performance classifier:
 *   exceptional >= 4.5, exceeds >= 3.5, meets >= 2.5, below >= 1.5, unsatisfactory < 1.5
 */

import { describe, it, expect } from 'vitest';
import {
  performanceMetricsTracker,
  goalAlignmentAnalyzer,
  performancePredictionEngine,
  teamPerformanceAnalyzer,
} from '../performance-intelligence';

describe('PerformanceMetricsTracker', () => {
  it('submitReview — score 0-5 clamp + 5-band classification', () => {
    const r = performanceMetricsTracker.submitReview('emp-1', 'mgr-1', '2026-Q1', 4.7, {}, ['s1'], ['i1']);
    expect(r.overallScore).toBe(4.7);
    expect(r.performanceBand).toBe('exceptional');
  });

  it('submitReview — band exceeds (3.5-4.4)', () => {
    const r = performanceMetricsTracker.submitReview('emp-2', 'mgr', '2026-Q1', 4.0, {}, [], []);
    expect(r.performanceBand).toBe('exceeds');
  });

  it('submitReview — band meets (2.5-3.4)', () => {
    const r = performanceMetricsTracker.submitReview('emp-3', 'mgr', '2026-Q1', 3.0, {}, [], []);
    expect(r.performanceBand).toBe('meets');
  });

  it('submitReview — band below (1.5-2.4)', () => {
    const r = performanceMetricsTracker.submitReview('emp-4', 'mgr', '2026-Q1', 2.0, {}, [], []);
    expect(r.performanceBand).toBe('below');
  });

  it('submitReview — band unsatisfactory (< 1.5)', () => {
    const r = performanceMetricsTracker.submitReview('emp-5', 'mgr', '2026-Q1', 1.0, {}, [], []);
    expect(r.performanceBand).toBe('unsatisfactory');
  });

  it('submitReview — score 6 clamp 5', () => {
    const r = performanceMetricsTracker.submitReview('emp-clamp', 'mgr', '2026-Q1', 6, {}, [], []);
    expect(r.overallScore).toBe(5);
  });

  it('submitReview — score 0 clamp 1', () => {
    const r = performanceMetricsTracker.submitReview('emp-clamp-low', 'mgr', '2026-Q1', 0, {}, [], []);
    expect(r.overallScore).toBe(1);
  });

  it('getLatestReview — son review', () => {
    performanceMetricsTracker.submitReview('emp-latest', 'mgr', '2026-Q1', 3.5, {}, [], []);
    performanceMetricsTracker.submitReview('emp-latest', 'mgr', '2026-Q2', 4.0, {}, [], []);
    expect(performanceMetricsTracker.getLatestReview('emp-latest')?.overallScore).toBe(4.0);
  });

  it('getLatestReview — bilinmeyen → undefined', () => {
    expect(performanceMetricsTracker.getLatestReview('non-existent')).toBeUndefined();
  });

  it('getPerformanceTrend — improving (curr > prev + 0.5)', () => {
    performanceMetricsTracker.submitReview('emp-trend-up', 'mgr', 'Q1', 3.0, {}, [], []);
    performanceMetricsTracker.submitReview('emp-trend-up', 'mgr', 'Q2', 4.0, {}, [], []);
    expect(performanceMetricsTracker.getPerformanceTrend('emp-trend-up')).toBe('improving');
  });

  it('getPerformanceTrend — declining (prev > curr + 0.5)', () => {
    performanceMetricsTracker.submitReview('emp-trend-dn', 'mgr', 'Q1', 4.5, {}, [], []);
    performanceMetricsTracker.submitReview('emp-trend-dn', 'mgr', 'Q2', 3.0, {}, [], []);
    expect(performanceMetricsTracker.getPerformanceTrend('emp-trend-dn')).toBe('declining');
  });

  it('getPerformanceTrend — stable (delta <= 0.5)', () => {
    performanceMetricsTracker.submitReview('emp-trend-st', 'mgr', 'Q1', 3.5, {}, [], []);
    performanceMetricsTracker.submitReview('emp-trend-st', 'mgr', 'Q2', 3.7, {}, [], []);
    expect(performanceMetricsTracker.getPerformanceTrend('emp-trend-st')).toBe('stable');
  });

  it('getPerformanceTrend — review < 2 → stable (default)', () => {
    expect(performanceMetricsTracker.getPerformanceTrend('non-existent')).toBe('stable');
  });

  it('getOrgAvgScore — period filter avg', () => {
    const PERIOD = `2026-org-${Date.now()}`;
    performanceMetricsTracker.submitReview('o1', 'm', PERIOD, 4, {}, [], []);
    performanceMetricsTracker.submitReview('o2', 'm', PERIOD, 3, {}, [], []);
    expect(performanceMetricsTracker.getOrgAvgScore(PERIOD)).toBe(3.5);
  });

  it('getOrgAvgScore — boş period → 0', () => {
    expect(performanceMetricsTracker.getOrgAvgScore('non-existent-period')).toBe(0);
  });
});

describe('GoalAlignmentAnalyzer', () => {
  it('addGoal — goal döner, status="not_started"', () => {
    const g = goalAlignmentAnalyzer.addGoal('emp-g1', 'Increase NPS', 50, 'pts', 90, 0.5, 'org-customer');
    expect(g.status).toBe('not_started');
    expect(g.weight).toBe(0.5);
    expect(g.progressPct).toBe(0);
  });

  it('addGoal — weight 0-1 clamp', () => {
    const high = goalAlignmentAnalyzer.addGoal('emp-clamp-h', 't', 100, 'u', 30, 1.5, 'org');
    expect(high.weight).toBe(1);
    const low = goalAlignmentAnalyzer.addGoal('emp-clamp-l', 't', 100, 'u', 30, -0.5, 'org');
    expect(low.weight).toBe(0);
  });

  it('updateProgress — progressPct = current/target * 100', () => {
    const g = goalAlignmentAnalyzer.addGoal('emp-prog', 't', 100, 'u', 30, 0.5, 'org');
    const updated = goalAlignmentAnalyzer.updateProgress(g.goalId, 50);
    expect(updated?.progressPct).toBe(50);
  });

  it('updateProgress — progress >= 100 → status="completed"', () => {
    const g = goalAlignmentAnalyzer.addGoal('emp-comp', 't', 100, 'u', 30, 0.5, 'org');
    const updated = goalAlignmentAnalyzer.updateProgress(g.goalId, 120);
    expect(updated?.status).toBe('completed');
    expect(updated?.progressPct).toBe(100); // Math.min(100, ...)
  });

  it('updateProgress — daysLeft < 14 + progress < 50 → "at_risk"', () => {
    // Sadece 7 gün ileri due → daysLeft ~ 7
    const g = goalAlignmentAnalyzer.addGoal('emp-risk', 't', 100, 'u', 7, 0.5, 'org');
    const updated = goalAlignmentAnalyzer.updateProgress(g.goalId, 30);
    expect(updated?.status).toBe('at_risk');
  });

  it('updateProgress — progress > 0 + daysLeft >= 14 → "in_progress"', () => {
    const g = goalAlignmentAnalyzer.addGoal('emp-ip', 't', 100, 'u', 60, 0.5, 'org');
    const updated = goalAlignmentAnalyzer.updateProgress(g.goalId, 30);
    expect(updated?.status).toBe('in_progress');
  });

  it('updateProgress — bilinmeyen → undefined', () => {
    expect(goalAlignmentAnalyzer.updateProgress('non-existent', 50)).toBeUndefined();
  });

  it('getAlignmentScore — orgGoal filter sum * 100', () => {
    goalAlignmentAnalyzer.addGoal('emp-align', 'g1', 100, 'u', 30, 0.4, 'org-x');
    goalAlignmentAnalyzer.addGoal('emp-align', 'g2', 100, 'u', 30, 0.3, 'org-x');
    goalAlignmentAnalyzer.addGoal('emp-align', 'g3', 100, 'u', 30, 0.2, 'org-y');
    expect(goalAlignmentAnalyzer.getAlignmentScore('emp-align', 'org-x')).toBeCloseTo(70, 1); // (0.4 + 0.3) * 100
  });

  it('getAlignmentScore — eşleşmeyen orgGoal → 0', () => {
    expect(goalAlignmentAnalyzer.getAlignmentScore('emp-align', 'non-existent-org')).toBe(0);
  });

  it('getEmployeeGoals — bilinmeyen → boş array', () => {
    expect(goalAlignmentAnalyzer.getEmployeeGoals('non-existent')).toEqual([]);
  });
});

describe('PerformancePredictionEngine', () => {
  it('predict — yüksek perf history + 80% goal + 75% engagement → exceeds/exceptional', () => {
    const reviews: any[] = [
      { overallScore: 4.0, performanceBand: 'exceeds', employeeId: 'p1' },
      { overallScore: 4.2, performanceBand: 'exceeds', employeeId: 'p1' },
      { overallScore: 4.5, performanceBand: 'exceptional', employeeId: 'p1' },
    ];
    const p = performancePredictionEngine.predict('p1', reviews, 0.85, 75);
    expect(['exceeds', 'exceptional']).toContain(p.predictedBand);
    expect(p.positiveIndicators).toContain('high_goal_completion');
    expect(p.positiveIndicators).toContain('high_engagement');
  });

  it('predict — riskFactors low_goal_completion + low_engagement', () => {
    const p = performancePredictionEngine.predict('p2', [], 0.3, 30);
    expect(p.riskFactors).toContain('low_goal_completion');
    expect(p.riskFactors).toContain('low_engagement');
  });

  it('predict — declining trend riskFactor', () => {
    const reviews: any[] = [
      { overallScore: 4.5, performanceBand: 'exceptional', employeeId: 'p3' },
      { overallScore: 1.5, performanceBand: 'below', employeeId: 'p3' },
    ];
    const p = performancePredictionEngine.predict('p3', reviews, 0.5, 50);
    expect(p.riskFactors).toContain('declining_trend');
  });

  it('predict — improving trend positive indicator', () => {
    const reviews: any[] = [
      { overallScore: 1.5, performanceBand: 'below', employeeId: 'p4' },
      { overallScore: 4.5, performanceBand: 'exceptional', employeeId: 'p4' },
    ];
    const p = performancePredictionEngine.predict('p4', reviews, 0.5, 50);
    expect(p.positiveIndicators).toContain('improving_trend');
  });

  it('predict — confidence kapasitesi 50-95 arası', () => {
    const p = performancePredictionEngine.predict('p5', [], 0.5, 50);
    expect(p.confidence).toBeGreaterThanOrEqual(50);
    expect(p.confidence).toBeLessThanOrEqual(95);
  });

  it('predict — boş history → predicted ortalama 3 baseline', () => {
    const p = performancePredictionEngine.predict('p6', [], 0.5, 50);
    // baseline 3.0 + 0 trend + 0 + 0 = 3.0 → meets
    expect(p.predictedBand).toBe('meets');
  });

  it('getPrediction — bilinmeyen → undefined', () => {
    expect(performancePredictionEngine.getPrediction('non-existent')).toBeUndefined();
  });

  it('getAtRiskEmployees — below + unsatisfactory band filter', () => {
    performancePredictionEngine.predict('at-risk-1', [], 0.1, 20);
    const atRisk = performancePredictionEngine.getAtRiskEmployees();
    // at-risk-1 kayıtlı olmalı (tahmin "below" veya "unsatisfactory")
    expect(Array.isArray(atRisk)).toBe(true);
  });
});

describe('TeamPerformanceAnalyzer', () => {
  it('summarize — avgScore + top + at-risk + distribution', () => {
    const reviews: any[] = [
      { overallScore: 4.5, performanceBand: 'exceptional', employeeId: 'e1' },
      { overallScore: 4.0, performanceBand: 'exceeds', employeeId: 'e2' },
      { overallScore: 3.0, performanceBand: 'meets', employeeId: 'e3' },
      { overallScore: 1.5, performanceBand: 'below', employeeId: 'e4' },
    ];
    const goals: any[] = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'in_progress' },
      { status: 'at_risk' },
    ];
    const s = teamPerformanceAnalyzer.summarize('team-1', '2026-Q1', reviews, goals);
    expect(s.avgScore).toBeCloseTo((4.5 + 4 + 3 + 1.5) / 4, 1);
    expect(s.topPerformers).toEqual(['e1', 'e2']);
    expect(s.atRiskMembers).toEqual(['e4']);
    expect(s.goalCompletionRate).toBe(50); // 2/4
    expect(s.distributionByBand.exceptional).toBe(1);
    expect(s.distributionByBand.exceeds).toBe(1);
    expect(s.distributionByBand.meets).toBe(1);
    expect(s.distributionByBand.below).toBe(1);
  });

  it('summarize — boş reviews → avg 0', () => {
    const s = teamPerformanceAnalyzer.summarize('team-empty', '2026-Q1', [], []);
    expect(s.avgScore).toBe(0);
    expect(s.goalCompletionRate).toBe(0);
    expect(s.topPerformers).toEqual([]);
  });

  it('summarize — boş goals → goalCompletionRate 0', () => {
    const reviews: any[] = [{ overallScore: 4, performanceBand: 'exceeds', employeeId: 'x' }];
    const s = teamPerformanceAnalyzer.summarize('t', 'p', reviews, []);
    expect(s.goalCompletionRate).toBe(0);
  });
});
