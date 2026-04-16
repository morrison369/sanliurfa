import { describe, expect, it } from 'vitest';
import {
  buildAdminIndexRiskCards,
  buildAdminIndexToolCards,
  getFirstProblematicArtifact,
  getLatestArtifactGeneratedAt,
  getStatusPriority,
} from '../admin-index';

describe('admin index helpers', () => {
  it('prioritizes blocked before degraded before healthy', () => {
    expect(getStatusPriority('blocked')).toBeLessThan(getStatusPriority('degraded'));
    expect(getStatusPriority('degraded')).toBeLessThan(getStatusPriority('healthy'));
  });

  it('builds risk cards sorted by status severity', () => {
    const cards = buildAdminIndexRiskCards({
      releaseGate: {
        available: true,
        generatedAt: '2026-04-16T10:00:00.000Z',
        finalStatus: 'passed',
        blockingFailedSteps: [],
        advisoryFailedSteps: [],
        failedStepCount: 0,
        steps: [],
        performanceOptimization: null,
        adminAccessCoverage: null,
      },
      releaseGateStatus: 'healthy',
      nightlyRegression: {
        available: true,
        kind: 'regression',
        generatedAt: '2026-04-16T09:00:00.000Z',
        outcome: 'failure',
        successRatePercent: 76,
        recentOutcomes: [],
        topFailures: ['nightly-top-failure'],
        performanceOptimization: null,
        adminAccessCoverage: null,
      },
      nightlyRegressionStatus: 'degraded',
      adminAccessCoverage: {
        available: true,
        generatedAt: '2026-04-16T08:00:00.000Z',
        routeFiles: 40,
        wrapperFiles: 35,
        driftCount: 5,
        coveragePercent: 88,
        driftedFiles: ['src/pages/api/admin/example.ts'],
      },
      accessCoverageStatus: 'blocked',
      artifactHealthSummary: {
        overall: 'degraded',
        healthyCount: 2,
        degradedCount: 2,
        blockedCount: 1,
        total: 5,
      },
      artifactHealth: {
        releaseGate: { available: true, generatedAt: '2026-04-16T10:00:00.000Z', status: 'healthy' },
        nightlyRegression: { available: true, generatedAt: '2026-04-16T09:00:00.000Z', status: 'degraded' },
        nightlyE2E: { available: true, generatedAt: '2026-04-16T07:00:00.000Z', status: 'healthy' },
        performanceOps: { available: true, generatedAt: '2026-04-16T06:00:00.000Z', status: 'healthy' },
        adminAccessCoverage: { available: true, generatedAt: '2026-04-16T08:00:00.000Z', status: 'blocked' },
      },
    });

    expect(cards.map((card) => card.title)).toEqual([
      'Access Coverage',
      'Nightly',
      'Artifact Health',
      'Release Gate',
    ]);
    expect(cards[0]?.action.blocked).toContain('wrapper coverage');
    expect(cards[1]?.detail).toBe('nightly-top-failure');
  });

  it('builds tool cards with priority hints', () => {
    const cards = buildAdminIndexToolCards({
      pending: 7,
      messages: 3,
    });

    expect(cards[0]).toMatchObject({
      title: 'Runtime Monitör',
      meta: 'Öncelik: Kritik izleme',
    });
    expect(cards.find((card) => card.title === 'Mekanlar')?.description).toBe('7 onay bekleyen');
    expect(cards.find((card) => card.title === 'Mesajlar')?.description).toBe('3 yeni mesaj');
  });

  it('derives first problematic artifact and latest generation timestamp', () => {
    const snapshot = {
      releaseGate: { available: true, generatedAt: '2026-04-16T10:00:00.000Z', status: 'healthy' as const },
      nightlyRegression: { available: true, generatedAt: '2026-04-16T09:00:00.000Z', status: 'degraded' as const },
      nightlyE2E: { available: true, generatedAt: '2026-04-16T07:00:00.000Z', status: 'healthy' as const },
      performanceOps: { available: true, generatedAt: '2026-04-16T11:00:00.000Z', status: 'healthy' as const },
      adminAccessCoverage: { available: true, generatedAt: '2026-04-16T08:00:00.000Z', status: 'blocked' as const },
    };

    expect(getFirstProblematicArtifact(snapshot)).toBe('Nightly Regression');
    expect(getLatestArtifactGeneratedAt(snapshot)).toBe('2026-04-16T11:00:00.000Z');
  });
});
