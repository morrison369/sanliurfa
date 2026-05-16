import { describe, expect, it } from 'vitest';
import { withSitemapSourceFallback } from '../sitemap/sitemap-helpers';

describe('withSitemapSourceFallback', () => {
  it('source zamaninda resolve olursa sonucu döner', async () => {
    const result = await withSitemapSourceFallback(
      () => Promise.resolve('ready'),
      'fallback',
      { label: 'sitemap:test:success', timeoutMs: 50 },
    );

    expect(result).toBe('ready');
  });

  it('source reject olursa fallback döner', async () => {
    const result = await withSitemapSourceFallback(
      () => Promise.reject(new Error('db down')),
      'fallback',
      { label: 'sitemap:test:error', timeoutMs: 50 },
    );

    expect(result).toBe('fallback');
  });

  it('source timeout olursa fallback döner', async () => {
    const result = await withSitemapSourceFallback(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 150)),
      'fallback',
      { label: 'sitemap:test:timeout', timeoutMs: 100 },
    );

    expect(result).toBe('fallback');
  });
});
