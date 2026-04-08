import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  SignalBook,
  computeBalancedScore,
  routeByThresholds,
  scorePasses,
  buildGovernanceReport
} from '../governance-kit';

describe('governance-kit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores and lists signals', () => {
    const book = new SignalBook<{ signalId: string }>();
    book.add({ signalId: 'g1' });
    expect(book.list()).toEqual([{ signalId: 'g1' }]);
  });

  it('computes balanced score with one decimal precision', () => {
    expect(computeBalancedScore(88, 84, 20)).toBe(66);
    expect(computeBalancedScore(85, 84, 19)).toBe(65.5);
  });

  it('routes by thresholds', () => {
    const high = routeByThresholds(90, 70, 85, 75, 'high', 'medium', 'review');
    const medium = routeByThresholds(80, 78, 85, 75, 'high', 'medium', 'review');
    const review = routeByThresholds(70, 70, 85, 75, 'high', 'medium', 'review');
    expect(high).toBe('high');
    expect(medium).toBe('medium');
    expect(review).toBe('review');
  });

  it('checks score threshold pass/fail', () => {
    expect(scorePasses(60, 60)).toBe(true);
    expect(scorePasses(59.9, 60)).toBe(false);
  });

  it('builds governance report and emits debug log safely', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const report = buildGovernanceReport('policy', 's-1', 'score', 66, 'report-generated');
    expect(report).toBe('policy s-1 score=66');
    expect(debugSpy).toHaveBeenCalledWith('report-generated', { signalId: 's-1', score: 66 });
  });
});
