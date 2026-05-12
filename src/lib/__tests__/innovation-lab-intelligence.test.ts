/**
 * Unit Tests — innovation-lab-intelligence.ts singleton class managers
 *
 * Phase 224 — innovation lab governance:
 * - ExperimentTracker (create + recordResult + getSuccessRate %)
 * - PrototypeManager (build + advancedToMVP threshold + getMVPReady)
 * - IdeationFunnelAnalyzer (analyze + funnel conversion %)
 * - LabROICalculator (calculate ROI + revenue + costsSaved + avgExperimentCost)
 *
 * Note: bu module'deki ExperimentTracker innovation-management.ts'tekiyle ayrı sınıf.
 */

import { describe, it, expect } from 'vitest';
import {
  experimentTracker,
  prototypeManager,
  ideationFunnelAnalyzer,
  labROICalculator,
} from '../innovation-lab-intelligence';

describe('ExperimentTracker (lab)', () => {
  it('create — record döner, status="planning"', () => {
    const exp = experimentTracker.create(
      'Test Experiment Unique-1',
      'h',
      'product_innovation',
      'lab-team',
      10000,
      Date.now() + 30 * 86400000,
      ['ctr-up'],
      'ctr',
      5.0,
      7.0,
    );
    expect(exp.status).toBe('planning');
    expect(exp.resultType).toBe('pending');
    expect(exp.spentToDate).toBe(0);
    expect(exp.experimentId).toMatch(/^exp-\d+-\d+$/);
  });

  it('recordResult — bilinmeyen → false', () => {
    expect(experimentTracker.recordResult('non-existent', 5, 'success', [], [])).toBe(false);
  });

  it('recordResult — measuredValue + status="completed" + actualEndDate set', () => {
    const exp = experimentTracker.create('Result-2', 'h', 'product_innovation', 't', 1000, Date.now(), [], 'ctr', 5, 7);
    expect(experimentTracker.recordResult(exp.experimentId, 7.5, 'success', ['L1'], ['N1'])).toBe(true);
    const updated = experimentTracker.getExperiment(exp.experimentId);
    expect(updated?.measuredValue).toBe(7.5);
    expect(updated?.status).toBe('completed');
    expect(updated?.actualEndDate).toBeDefined();
    expect(updated?.learnings).toEqual(['L1']);
    expect(updated?.nextSteps).toEqual(['N1']);
  });

  it('getSuccessRate — completed/success oranı %', () => {
    const rate = experimentTracker.getSuccessRate();
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('getActiveExperiments — running/planning filter', () => {
    const exp = experimentTracker.create('Active-3', 'h', 'product_innovation', 't', 1000, Date.now(), [], 'ctr', 5, 7);
    const active = experimentTracker.getActiveExperiments();
    expect(active.some((e) => e.experimentId === exp.experimentId)).toBe(true);
    expect(active.every((e) => e.status === 'running' || e.status === 'planning')).toBe(true);
  });

  it('getActiveExperiments — completed hariç', () => {
    const exp = experimentTracker.create('Comp-Excl-4', 'h', 'product_innovation', 't', 1000, Date.now(), [], 'ctr', 5, 7);
    experimentTracker.recordResult(exp.experimentId, 7, 'success', [], []);
    const active = experimentTracker.getActiveExperiments();
    expect(active.some((e) => e.experimentId === exp.experimentId)).toBe(false);
  });

  it('getByCategory — category filter', () => {
    const exp = experimentTracker.create('Cat-5', 'h', 'process_innovation', 't', 1000, Date.now(), [], 'm', 0, 1);
    const filtered = experimentTracker.getByCategory('process_innovation');
    expect(filtered.some((e) => e.experimentId === exp.experimentId)).toBe(true);
    expect(filtered.every((e) => e.category === 'process_innovation')).toBe(true);
  });

  it('getExperiment — bilinmeyen → undefined', () => {
    expect(experimentTracker.getExperiment('non-existent')).toBeUndefined();
  });
});

describe('PrototypeManager', () => {
  const EXP_ID = 'exp-proto-1';

  it('build — record döner, advancedToMVP: usability >= 70 + featureCompleteness >= 60 + techReadiness >= 3', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto A', '0.1', 'low', 5, 10, 75, 70, 4);
    expect(p.advancedToMVP).toBe(true);
    expect(p.pivotRequired).toBe(false);
    expect(p.prototypeId).toMatch(/^proto-\d+-\d+$/);
  });

  it('build — pivotRequired: usability < 50', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto Pivot', '0.1', 'low', 5, 10, 40, 50, 2);
    expect(p.pivotRequired).toBe(true);
  });

  it('build — usability 50-69 arası → pivot YOK ama MVP de YOK', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto Mid', '0.1', 'low', 5, 10, 60, 50, 2);
    expect(p.pivotRequired).toBe(false);
    expect(p.advancedToMVP).toBe(false);
  });

  it('build — usability 70 boundary inclusive (>=)', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto B', '0.1', 'medium', 5, 10, 70, 60, 3);
    expect(p.advancedToMVP).toBe(true);
  });

  it('build — featureCompleteness 60 boundary inclusive', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto C', '0.1', 'medium', 5, 10, 70, 60, 3);
    expect(p.advancedToMVP).toBe(true);
  });

  it('build — techReadiness < 3 → MVP false', () => {
    const p = prototypeManager.build(EXP_ID, 'Proto D', '0.1', 'medium', 5, 10, 80, 70, 2);
    expect(p.advancedToMVP).toBe(false);
  });

  it('getAvgBuildTime — ortalama build days', () => {
    const avg = prototypeManager.getAvgBuildTime();
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(typeof avg).toBe('number');
  });

  it('getMVPReadyPrototypes — sadece advancedToMVP=true', () => {
    const ready = prototypeManager.getMVPReadyPrototypes();
    expect(ready.every((p) => p.advancedToMVP === true)).toBe(true);
  });

  it('getByExperiment — experimentId filter', () => {
    const EXP = `exp-by-${Date.now()}`;
    prototypeManager.build(EXP, 'P1', '0.1', 'low', 5, 10, 50, 50, 2);
    prototypeManager.build(EXP, 'P2', '0.2', 'medium', 7, 15, 60, 60, 3);
    const list = prototypeManager.getByExperiment(EXP);
    expect(list).toHaveLength(2);
  });

  it('getByExperiment — bilinmeyen → boş array', () => {
    expect(prototypeManager.getByExperiment('non-existent')).toEqual([]);
  });
});

describe('IdeationFunnelAnalyzer', () => {
  it('analyze — funnelConversionPct = (deployed / submitted) * 100', () => {
    const r = ideationFunnelAnalyzer.analyze('2026-Q1', 100, 80, 60, 40, 20, 10, 5, 90);
    // 5/100*100 = 5%
    expect(r.funnelConversionPct).toBe(5);
  });

  it('analyze — submitted=0 → conversion 0', () => {
    const r = ideationFunnelAnalyzer.analyze('2026-Q1-zero', 0, 0, 0, 0, 0, 0, 0, 0);
    expect(r.funnelConversionPct).toBe(0);
  });

  it('analyze — record fields tam', () => {
    const r = ideationFunnelAnalyzer.analyze('2026-Q2', 200, 150, 100, 80, 50, 30, 20, 120);
    expect(r.ideasSubmitted).toBe(200);
    expect(r.productionDeployed).toBe(20);
    expect(r.submissionToMVPDays).toBe(120);
    expect(r.recordId).toMatch(/^funnel-\d+-\d+$/);
  });

  it('getLatest — son record', () => {
    const r = ideationFunnelAnalyzer.analyze('2026-Q3-latest', 100, 50, 40, 30, 20, 10, 5, 60);
    expect(ideationFunnelAnalyzer.getLatest()?.recordId).toBe(r.recordId);
  });

  it('getConversionTrend — array of conversion %', () => {
    ideationFunnelAnalyzer.analyze('2026-Q4-trend', 100, 50, 40, 30, 20, 10, 10, 60);
    const trend = ideationFunnelAnalyzer.getConversionTrend();
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.every((v) => typeof v === 'number')).toBe(true);
  });
});

describe('LabROICalculator', () => {
  it('calculate — ROI formula ((revenue + costsSaved - budget) / budget) * 100', () => {
    const r = labROICalculator.calculate('2026-Q1', 100000, 10, 5, 200000, 50000, 90);
    // totalReturn = 250000, ROI = (250000 - 100000) / 100000 * 100 = 150
    expect(r.roiPct).toBe(150);
    expect(r.totalReturn).toBe(250000);
  });

  it('calculate — budget=0 → roi 0', () => {
    const r = labROICalculator.calculate('zero-budget', 0, 0, 0, 100000, 0, 0);
    expect(r.roiPct).toBe(0);
  });

  it('calculate — successRatePct = successful / experimentsRun * 100', () => {
    const r = labROICalculator.calculate('2026-Q2-rate', 50000, 20, 12, 100000, 0, 60);
    expect(r.successRatePct).toBe(60); // 12/20*100
  });

  it('calculate — experimentsRun=0 → successRate 0 + avgCost 0', () => {
    const r = labROICalculator.calculate('zero-exp', 50000, 0, 0, 0, 0, 0);
    expect(r.successRatePct).toBe(0);
    expect(r.avgExperimentCost).toBe(0);
  });

  it('calculate — avgExperimentCost = budget / experimentsRun', () => {
    const r = labROICalculator.calculate('avg-cost', 100000, 20, 10, 0, 0, 60);
    expect(r.avgExperimentCost).toBe(5000); // 100K / 20
  });

  it('getLatest — son record', () => {
    const r = labROICalculator.calculate('latest-roi', 1000, 1, 1, 5000, 0, 30);
    expect(labROICalculator.getLatest()?.recordId).toBe(r.recordId);
  });

  it('getROITrend — array of ROI %', () => {
    const trend = labROICalculator.getROITrend();
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.every((v) => typeof v === 'number')).toBe(true);
  });
});
