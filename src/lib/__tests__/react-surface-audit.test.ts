import { describe, expect, it } from 'vitest';

import {
  buildReactSurfaceAuditMarkdown,
  summarizeReactSurfaceAudit,
} from '../react-surface-audit';

describe('react surface audit helpers', () => {
  it('summarizes blockers correctly', () => {
    const report = summarizeReactSurfaceAudit({
      tsxFiles: ['src/components/LoginForm.tsx'],
      hookFiles: ['src/hooks/useFeatureAccess.ts'],
      runtimeUsages: [],
    });

    expect(report.canRemoveAstroReactIntegration).toBe(true);
    expect(report.canRemoveReactPackages).toBe(false);
    expect(report.blockers).toContain('1 adet kalan .tsx dosyasi React import ediyor');
    expect(report.blockers).toContain('1 adet kalan hook/lib dosyasi React hook import ediyor');
  });

  it('builds markdown output', () => {
    const markdown = buildReactSurfaceAuditMarkdown(
      summarizeReactSurfaceAudit({
        tsxFiles: [],
        hookFiles: [],
        runtimeUsages: [],
      }),
    );

    expect(markdown).toContain('Can remove @astrojs/react integration: yes');
    expect(markdown).toContain('## Blockers');
  });
});
