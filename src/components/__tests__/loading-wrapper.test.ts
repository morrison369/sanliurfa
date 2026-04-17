import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LoadingWrapper', () => {
  it('contains common loading wrapper hooks', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/ui/LoadingWrapper.astro'),
      'utf8',
    );

    expect(source).toContain('data-loading-wrapper-loading');
    expect(source).toContain('data-loading-wrapper-content');
    expect(source).toContain('sr-only');
    expect(source).toContain("variant === 'skeleton'");
    expect(source).toContain('skeletonCount');
    expect(source).toContain('skeletonItemClass');
  });
});
