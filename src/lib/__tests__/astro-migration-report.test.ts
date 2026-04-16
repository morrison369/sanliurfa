import { describe, expect, it } from 'vitest';

import {
  buildAstroHydrationInventoryMarkdown,
  classifyHydrationRisk,
  createAstroHydrationInventoryReport,
} from '../astro-migration-report';

describe('astro migration report helpers', () => {
  it('classifies hydration risk by component type', () => {
    expect(classifyHydrationRisk('PerformanceMonitor').risk).toBe('low');
    expect(classifyHydrationRisk('SearchResults').risk).toBe('medium');
    expect(classifyHydrationRisk('UserManagementTable').risk).toBe('medium');
    expect(classifyHydrationRisk('WebhookManager').risk).toBe('high');
  });

  it('creates sorted inventory report with risk counts', () => {
    const report = createAstroHydrationInventoryReport({
      generatedAt: '2026-04-16T22:00:00.000Z',
      astroFiles: 150,
      tsxFiles: 106,
      entries: [
        {
          pagePath: 'src/pages/ayarlar.astro',
          componentName: 'UserSettings',
          directive: 'load',
        },
        {
          pagePath: 'src/pages/admin/analytics.astro',
          componentName: 'WebhookManager',
          directive: 'load',
        },
      ],
    });

    expect(report.highRiskCount).toBe(1);
    expect(report.mediumRiskCount).toBe(1);
    expect(report.lowRiskCount).toBe(0);
    expect(report.entries[0].componentName).toBe('WebhookManager');
  });

  it('renders markdown summary with risk counts', () => {
    const markdown = buildAstroHydrationInventoryMarkdown({
      generatedAt: '2026-04-16T22:00:00.000Z',
      astroFiles: 150,
      tsxFiles: 106,
      totalHydrationPoints: 2,
      lowRiskCount: 0,
      mediumRiskCount: 1,
      highRiskCount: 1,
      entries: [
        {
          pagePath: 'src/pages/admin/analytics.astro',
          componentName: 'WebhookManager',
          directive: 'load',
          risk: 'high',
          rationale: 'WebhookManager yoğun state veya dashboard tipi davranış taşıyor.',
        },
        {
          pagePath: 'src/pages/ayarlar.astro',
          componentName: 'UserSettings',
          directive: 'load',
          risk: 'medium',
          rationale: 'UserSettings form, liste veya orta seviyeli etkileşim içeriyor.',
        },
      ],
    });

    expect(markdown).toContain('# Astro Hydration Inventory');
    expect(markdown).toContain('- High risk: 1');
    expect(markdown).toContain('src/pages/admin/analytics.astro -> WebhookManager');
  });
});
