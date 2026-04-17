import { describe, expect, it } from 'vitest';

import {
  buildReactSurfaceClassificationMarkdown,
  classifyReactSurface,
} from '../react-surface-classification';

describe('react surface classification helpers', () => {
  it('classifies counts and next steps', () => {
    const report = classifyReactSurface({
      runtimeRoots: ['astro.config.mjs'],
      serverOnly: [],
      dead: ['src/components/LoginForm.tsx'],
      migrate: ['src/components/InteractiveCard.tsx'],
      keep: ['src/hooks/useFeatureAccess.ts'],
    });

    expect(report.tsxCount).toBe(2);
    expect(report.deadCount).toBe(1);
    expect(report.migrateCount).toBe(1);
    expect(report.keepCount).toBe(1);
    expect(report.nextSteps).toContain('1 adet baglantisiz .tsx dosyasini sil veya arsivle');
    expect(report.nextSteps).toContain('1 adet runtime-bagli .tsx dosya icin migration plani cikar');
  });

  it('builds markdown output', () => {
    const markdown = buildReactSurfaceClassificationMarkdown(
      classifyReactSurface({
        runtimeRoots: [],
        serverOnly: ['src/components/StaticCard.tsx'],
        dead: [],
        migrate: [],
        keep: [],
      }),
    );

    expect(markdown).toContain('Server-only candidates: 1');
    expect(markdown).toContain('## Server-only Candidates');
  });
});
