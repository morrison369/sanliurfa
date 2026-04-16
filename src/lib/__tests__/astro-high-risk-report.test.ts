import { describe, expect, it } from 'vitest';
import {
  createAstroHighRiskReport,
  getHighRiskPriority,
  scoreHighRiskComponent,
} from '../astro-high-risk-report';

describe('astro-high-risk-report', () => {
  it('scores smaller typed-client surface lower', () => {
    const low = scoreHighRiskComponent({
      componentName: 'AdminVerificationQueue',
      componentPath: 'src/components/AdminVerificationQueue.tsx',
      pagePaths: ['src/pages/admin/verifications.astro'],
      usageCount: 1,
      lines: 180,
      useStateCount: 4,
      useEffectCount: 2,
      fetchCount: 0,
      typedClientCount: 2,
      adminSurface: true,
    });

    const high = scoreHighRiskComponent({
      componentName: 'ActivityFeed',
      componentPath: 'src/components/ActivityFeed.tsx',
      pagePaths: ['src/pages/akis.astro', 'src/pages/sosyal/index.astro'],
      usageCount: 2,
      lines: 260,
      useStateCount: 7,
      useEffectCount: 2,
      fetchCount: 1,
      typedClientCount: 0,
      adminSurface: false,
    });

    expect(low).toBeLessThan(high);
  });

  it('maps scores to first/later/last priorities', () => {
    expect(getHighRiskPriority(30)).toBe('first');
    expect(getHighRiskPriority(45)).toBe('later');
    expect(getHighRiskPriority(70)).toBe('last');
  });

  it('builds ranked report', () => {
    const report = createAstroHighRiskReport({
      generatedAt: '2026-04-17T00:00:00.000Z',
      entries: [
        {
          componentName: 'AdminVerificationQueue',
          componentPath: 'src/components/AdminVerificationQueue.tsx',
          pagePaths: ['src/pages/admin/verifications.astro'],
          usageCount: 1,
          lines: 180,
          useStateCount: 4,
          useEffectCount: 2,
          fetchCount: 0,
          typedClientCount: 2,
          adminSurface: true,
        },
        {
          componentName: 'ActivityFeed',
          componentPath: 'src/components/ActivityFeed.tsx',
          pagePaths: ['src/pages/akis.astro', 'src/pages/sosyal/index.astro'],
          usageCount: 2,
          lines: 260,
          useStateCount: 7,
          useEffectCount: 2,
          fetchCount: 1,
          typedClientCount: 0,
          adminSurface: false,
        },
      ],
    });

    expect(report.totalHighRiskComponents).toBe(2);
    expect(report.entries[0].componentName).toBe('AdminVerificationQueue');
    expect(report.entries[0].migrationPriority).toBe('later');
    expect(report.entries[1].migrationPriority).toBe('last');
  });
});
