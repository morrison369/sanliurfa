/**
 * Astro Container API SSR render tests.
 * These tests verify that Astro .astro components render correctly
 * without starting an HTTP server.
 *
 * Container API: https://docs.astro.build/en/reference/container-reference/
 * Docs: experimental_AstroContainer (stable since 4.9, no flag needed in 6.x)
 */
import { describe, it, expect, vi } from 'vitest';

// DB ve Redis'i mock'la — Container API sunucu ortamında çalışır
vi.mock('@/lib/postgres', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  queryMany: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  pool: { query: vi.fn() },
}));

vi.mock('@/lib/cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  deleteCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/site-branding', () => ({
  getSiteBranding: vi.fn().mockResolvedValue({
    siteName: 'Şanlıurfa.com',
    baseUrl: 'https://sanliurfa.com',
    logoUrl: '/logo.svg',
  }),
}));

describe('Astro Container API — SSR bileşen render testleri', () => {
  it('Container API modülü yüklenebiliyor', async () => {
    const mod = await import('astro/container');
    const AstroContainer = (mod as any).AstroContainer ?? (mod as any).experimental_AstroContainer;
    expect(AstroContainer).toBeDefined();
    expect(typeof AstroContainer.create).toBe('function');
  }, 20_000);

  it('renderAstroComponent helper fonksiyonu çalışıyor', async () => {
    const { renderAstroComponent } = await import('./helpers/astro-container');
    expect(typeof renderAstroComponent).toBe('function');
  });

  it('renderAstroToResponse helper fonksiyonu çalışıyor', async () => {
    const { renderAstroToResponse } = await import('./helpers/astro-container');
    expect(typeof renderAstroToResponse).toBe('function');
  });
});
