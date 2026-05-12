/**
 * Unit Tests — routes.ts
 *
 * Lazy-loading route allowlist:
 * - lazyRoutes: explicit page → dynamic import map
 * - criticalRoutes: eagerly-loaded core routes (NOT lazy)
 * - shouldLazyLoad(path): true if explicit lazyRoutes match OR namespaced prefix
 * - getPreloadHints(): critical route list for prefetch
 */

import { describe, it, expect } from 'vitest';
import {
  lazyRoutes,
  legacyLazyRoutes,
  criticalRoutes,
  shouldLazyLoad,
  getPreloadHints,
} from '../routes';

describe('lazyRoutes', () => {
  it('non-empty registry', () => {
    expect(Object.keys(lazyRoutes).length).toBeGreaterThan(20);
  });

  it('tüm key absolute path (/) ile başlar', () => {
    for (const route of Object.keys(lazyRoutes)) {
      expect(route).toMatch(/^\//);
    }
  });

  it('tüm value Promise döndüren async fonksiyon', () => {
    for (const fn of Object.values(lazyRoutes)) {
      expect(typeof fn).toBe('function');
    }
  });

  it('admin route (örn /admin/dashboard) kayıtlı', () => {
    expect(lazyRoutes['/admin/dashboard']).toBeDefined();
  });

  it('kanonik business route kayıtlı', () => {
    expect(lazyRoutes['/isletme/panel']).toBeDefined();
    expect(lazyRoutes['/isletme/analytics']).toBeDefined();
    expect(lazyRoutes['/isletme/pazarlama']).toBeDefined();
    expect(lazyRoutes['/isletme']).toBeDefined();
  });

  it('legacy vendor alias ayrı compatibility registry içinde tutuluyor', () => {
    expect(lazyRoutes['/vendor/dashboard']).toBeUndefined();
    expect(lazyRoutes['/vendor/analytics']).toBeUndefined();
    expect(legacyLazyRoutes['/vendor/dashboard']).toBeDefined();
    expect(legacyLazyRoutes['/vendor/analytics']).toBeDefined();
  });
});

describe('criticalRoutes', () => {
  it('6 critical route (eager-load)', () => {
    expect(criticalRoutes).toHaveLength(6);
  });

  it("'/' ana sayfa kritik", () => {
    expect(criticalRoutes).toContain('/');
  });

  it('giris/kayit auth sayfaları kritik', () => {
    expect(criticalRoutes).toContain('/giris');
    expect(criticalRoutes).toContain('/kayit');
  });

  it('mekanlar listesi kritik', () => {
    expect(criticalRoutes).toContain('/mekanlar');
  });

  it('hakkinda + iletisim kritik', () => {
    expect(criticalRoutes).toContain('/hakkinda');
    expect(criticalRoutes).toContain('/iletisim');
  });

  it('critical ile lazy çakışmıyor', () => {
    for (const critical of criticalRoutes) {
      expect(lazyRoutes[critical]).toBeUndefined();
    }
  });
});

describe('shouldLazyLoad', () => {
  it('lazyRoutes registry exact match → true', () => {
    expect(shouldLazyLoad('/admin/dashboard')).toBe(true);
    expect(shouldLazyLoad('/blog')).toBe(true);
  });

  it('/admin/* prefix → true (registry dışı bile)', () => {
    expect(shouldLazyLoad('/admin/random-path')).toBe(true);
    expect(shouldLazyLoad('/admin/users/123')).toBe(true);
  });

  it('/isletme/* prefix → true', () => {
    expect(shouldLazyLoad('/isletme/analytics')).toBe(true);
    expect(shouldLazyLoad('/isletme/panel')).toBe(true);
    expect(shouldLazyLoad('/isletme/pazarlama')).toBe(true);
    expect(shouldLazyLoad('/isletme/settings')).toBe(true);
  });

  it('legacy vendor alias exact match → true', () => {
    expect(shouldLazyLoad('/vendor/dashboard')).toBe(true);
    expect(shouldLazyLoad('/vendor/analytics')).toBe(true);
  });

  it('tanımsız vendor path artık prefix ile lazy sayılmaz', () => {
    expect(shouldLazyLoad('/vendor/orders')).toBe(false);
  });

  it('/profil/* prefix → true', () => {
    expect(shouldLazyLoad('/profil/settings')).toBe(true);
  });

  it('/kullanici/* prefix → true', () => {
    expect(shouldLazyLoad('/kullanici/sadakat')).toBe(true);
    expect(shouldLazyLoad('/kullanici/123')).toBe(true);
  });

  it('/koleksiyonlar/* prefix → true', () => {
    expect(shouldLazyLoad('/koleksiyonlar/123')).toBe(true);
  });

  it('/blog/* dynamic prefix → true', () => {
    expect(shouldLazyLoad('/blog/post-slug')).toBe(true);
  });

  it('/etkinlikler/* prefix → true', () => {
    expect(shouldLazyLoad('/etkinlikler/concert-id')).toBe(true);
  });

  it('/gastronomi/* prefix → true', () => {
    expect(shouldLazyLoad('/gastronomi/recipe-slug')).toBe(true);
  });

  it('/tarihi-yerler/* prefix → true', () => {
    expect(shouldLazyLoad('/tarihi-yerler/site-slug')).toBe(true);
  });

  it("'/' ana sayfa → false (critical)", () => {
    expect(shouldLazyLoad('/')).toBe(false);
  });

  it('/mekanlar → false (critical)', () => {
    expect(shouldLazyLoad('/mekanlar')).toBe(false);
  });

  it('/giris + /kayit → false (critical auth)', () => {
    expect(shouldLazyLoad('/giris')).toBe(false);
    expect(shouldLazyLoad('/kayit')).toBe(false);
  });

  it('bilinmeyen rastgele path → false', () => {
    expect(shouldLazyLoad('/some-random-path')).toBe(false);
    expect(shouldLazyLoad('/foo/bar/baz')).toBe(false);
  });

  it('/isletme-kayit prefix true (form yapıcı)', () => {
    expect(shouldLazyLoad('/isletme-kayit')).toBe(true);
  });

  it('boş string → false', () => {
    expect(shouldLazyLoad('')).toBe(false);
  });
});

describe('getPreloadHints', () => {
  it('criticalRoutes ile aynı liste döner', () => {
    expect(getPreloadHints()).toEqual(criticalRoutes);
  });

  it('6 hint döner', () => {
    expect(getPreloadHints()).toHaveLength(6);
  });

  it('/ ana sayfa preload hint olarak kalır (transform yok)', () => {
    expect(getPreloadHints()).toContain('/');
  });
});
