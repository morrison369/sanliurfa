import { describe, expect, it } from 'vitest';
import {
  buildCoverageAlert,
  buildCoverageDelta,
  buildCoverageTrend,
  buildRuntimeDelta,
  buildRuntimeTrend,
  getSameStatusSinceMinutes,
} from '../admin-ops-pages';

describe('admin ops page helpers', () => {
  it('builds runtime trend lines', () => {
    const text = buildRuntimeTrend([
      { overall: 'blocked', blockedCount: 1, degradedCount: 0, refreshedAt: '2026-04-16T10:00:00.000Z' },
      { overall: 'degraded', blockedCount: 0, degradedCount: 1, refreshedAt: '2026-04-16T09:59:00.000Z' },
    ]);

    expect(text).toContain('10:00:00 blocked');
    expect(text).toContain('09:59:00 degraded');
  });

  it('builds coverage trend lines', () => {
    const text = buildCoverageTrend([
      { status: 'healthy', driftCount: 0, coveragePercent: 100, refreshedAt: '2026-04-16T10:00:00.000Z' },
      { status: 'degraded', driftCount: 1, coveragePercent: 97, refreshedAt: '2026-04-16T09:58:00.000Z' },
    ]);

    expect(text).toContain('10:00:00 healthy');
    expect(text).toContain('%97, drift:1');
  });

  it('calculates same-status duration in minutes', () => {
    const minutes = getSameStatusSinceMinutes(
      [
        { overall: 'blocked' as const, refreshedAt: '2026-04-16T10:10:00.000Z' },
        { overall: 'blocked' as const, refreshedAt: '2026-04-16T10:00:00.000Z' },
        { overall: 'healthy' as const, refreshedAt: '2026-04-16T09:50:00.000Z' },
      ],
      'blocked'
    );

    expect(minutes).toBe(10);
  });

  it('builds delta lines for runtime and coverage histories', () => {
    expect(
      buildRuntimeDelta(
        { overall: 'healthy', blockedCount: 0, degradedCount: 0, refreshedAt: '2026-04-16T10:00:00.000Z' },
        { overall: 'blocked', blockedCount: 1, degradedCount: 0, refreshedAt: '2026-04-16T10:05:00.000Z' },
        [
          { overall: 'blocked', blockedCount: 1, degradedCount: 0, refreshedAt: '2026-04-16T10:05:00.000Z' },
          { overall: 'healthy', blockedCount: 0, degradedCount: 0, refreshedAt: '2026-04-16T10:00:00.000Z' },
        ]
      )
    ).toContain('healthy -> blocked');

    expect(
      buildCoverageDelta(
        { status: 'degraded', driftCount: 1, coveragePercent: 98, refreshedAt: '2026-04-16T10:00:00.000Z' },
        { status: 'healthy', driftCount: 0, coveragePercent: 100, refreshedAt: '2026-04-16T10:03:00.000Z' },
        [
          { status: 'healthy', driftCount: 0, coveragePercent: 100, refreshedAt: '2026-04-16T10:03:00.000Z' },
          { status: 'degraded', driftCount: 1, coveragePercent: 98, refreshedAt: '2026-04-16T10:00:00.000Z' },
        ]
      )
    ).toContain('degraded -> healthy');
  });

  it('builds coverage alert semantics', () => {
    expect(buildCoverageAlert({ status: 'healthy', driftCount: 0 }).tone).toBe('healthy');
    expect(buildCoverageAlert({ status: 'degraded', driftCount: 0 }).tone).toBe('degraded');
    expect(
      buildCoverageAlert({ status: 'healthy', driftCount: 2, firstDriftFile: 'src/pages/api/admin/example.ts' }).text
    ).toContain('example.ts');
  });
});
