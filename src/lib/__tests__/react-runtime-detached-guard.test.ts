import { describe, expect, it } from 'vitest';

import { evaluateReactRuntimeDetachedGuard } from '../react-runtime-detached-guard';

describe('react runtime detached guard', () => {
  it('passes when no runtime-linked tsx remains', () => {
    expect(
      evaluateReactRuntimeDetachedGuard({
        tsxCount: 10,
        serverOnlyCount: 0,
        deadCount: 10,
        migrateCount: 0,
        keepCount: 3,
        runtimeRootCount: 1,
        serverOnly: [],
        dead: ['src/components/Foo.tsx'],
        migrate: [],
        keep: ['src/hooks/useFeatureAccess.ts'],
        runtimeRoots: ['astro.config.mjs'],
        nextSteps: [],
      }).ok,
    ).toBe(true);
  });

  it('fails when runtime-linked tsx remains', () => {
    const result = evaluateReactRuntimeDetachedGuard({
      tsxCount: 2,
      serverOnlyCount: 1,
      deadCount: 0,
      migrateCount: 1,
      keepCount: 0,
      runtimeRootCount: 1,
      serverOnly: ['src/components/ServerCard.tsx'],
      dead: [],
      migrate: ['src/components/InteractiveCard.tsx'],
      keep: [],
      runtimeRoots: ['astro.config.mjs'],
      nextSteps: [],
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain('1 adet server-only .tsx runtime baglantisi bulundu');
    expect(result.reasons).toContain('1 adet migrate-required .tsx runtime baglantisi bulundu');
  });
});
