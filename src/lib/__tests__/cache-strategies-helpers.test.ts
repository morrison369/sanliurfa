/**
 * Unit Tests — cache/strategies.ts pure helpers
 *
 * - CACHE_NAMES: cache name constants (STATIC/DYNAMIC/IMAGES/API/PAGES/FONT)
 * - getCacheStrategy(url): URL pattern → CacheConfig
 *   - JS/CSS/JSON → cache-first STATIC 7-day
 *   - PNG/JPG/SVG → cache-first IMAGES 30-day
 *   - WOFF/TTF → cache-first FONT 1-year
 *   - /api/ → network-first API 5-min
 *   - HTML → stale-while-revalidate PAGES 1-day
 *   - default → network-first DYNAMIC
 *
 * Note: cacheFirst/networkFirst/etc. asynchronous strategy implementations DOM/fetch-bound
 * (Cache Storage API), test dosyasında kapsanmıyor.
 */

import { describe, it, expect } from 'vitest';
import { CACHE_NAMES, getCacheStrategy } from '../cache/strategies';

describe('CACHE_NAMES', () => {
  it('6 cache name kayıtlı (STATIC/DYNAMIC/IMAGES/API/PAGES/FONT)', () => {
    expect(Object.keys(CACHE_NAMES)).toHaveLength(6);
    expect(CACHE_NAMES.STATIC).toBeDefined();
    expect(CACHE_NAMES.DYNAMIC).toBeDefined();
    expect(CACHE_NAMES.IMAGES).toBeDefined();
    expect(CACHE_NAMES.API).toBeDefined();
    expect(CACHE_NAMES.PAGES).toBeDefined();
    expect(CACHE_NAMES.FONT).toBeDefined();
  });

  it('tüm name version suffix ile (örn: "static-vN")', () => {
    for (const name of Object.values(CACHE_NAMES)) {
      expect(name).toMatch(/-/);
    }
  });

  it('STATIC name "static-" ile başlar', () => {
    expect(CACHE_NAMES.STATIC).toMatch(/^static-/);
  });

  it('IMAGES name "images-" ile başlar', () => {
    expect(CACHE_NAMES.IMAGES).toMatch(/^images-/);
  });

  it('API name "api-" ile başlar', () => {
    expect(CACHE_NAMES.API).toMatch(/^api-/);
  });
});

describe('getCacheStrategy — JS/CSS/JSON static assets', () => {
  it('.js → cache-first + STATIC', () => {
    const cfg = getCacheStrategy('/assets/app.js');
    expect(cfg.strategy).toBe('cache-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.STATIC);
  });

  it('.css → cache-first + STATIC', () => {
    expect(getCacheStrategy('/assets/style.css').strategy).toBe('cache-first');
  });

  it('.json → cache-first + STATIC', () => {
    expect(getCacheStrategy('/data/config.json').cacheName).toBe(CACHE_NAMES.STATIC);
  });

  it('JS query param ?v=hash de match eder', () => {
    expect(getCacheStrategy('/app.js?v=abc123').strategy).toBe('cache-first');
  });

  it('STATIC maxAge 7 gün', () => {
    expect(getCacheStrategy('/x.css').maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getCacheStrategy — image assets', () => {
  it('.png → cache-first + IMAGES + 30-day maxAge', () => {
    const cfg = getCacheStrategy('/img/photo.png');
    expect(cfg.strategy).toBe('cache-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.IMAGES);
    expect(cfg.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('.jpg / .jpeg → IMAGES', () => {
    expect(getCacheStrategy('/img/p.jpg').cacheName).toBe(CACHE_NAMES.IMAGES);
    expect(getCacheStrategy('/img/p.jpeg').cacheName).toBe(CACHE_NAMES.IMAGES);
  });

  it('.gif / .webp / .svg / .avif → IMAGES', () => {
    expect(getCacheStrategy('/img/anim.gif').cacheName).toBe(CACHE_NAMES.IMAGES);
    expect(getCacheStrategy('/img/x.webp').cacheName).toBe(CACHE_NAMES.IMAGES);
    expect(getCacheStrategy('/icon.svg').cacheName).toBe(CACHE_NAMES.IMAGES);
    expect(getCacheStrategy('/img/x.avif').cacheName).toBe(CACHE_NAMES.IMAGES);
  });

  it('IMAGES maxEntries 100 (LRU cap)', () => {
    expect(getCacheStrategy('/img/x.png').maxEntries).toBe(100);
  });

  it('image query string desteği', () => {
    expect(getCacheStrategy('/img/x.png?v=1').cacheName).toBe(CACHE_NAMES.IMAGES);
  });
});

describe('getCacheStrategy — font assets', () => {
  it('.woff → cache-first + FONT', () => {
    const cfg = getCacheStrategy('/fonts/main.woff');
    expect(cfg.strategy).toBe('cache-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.FONT);
  });

  it('.woff2 → FONT', () => {
    expect(getCacheStrategy('/fonts/x.woff2').cacheName).toBe(CACHE_NAMES.FONT);
  });

  it('.ttf / .otf / .eot → FONT', () => {
    expect(getCacheStrategy('/fonts/x.ttf').cacheName).toBe(CACHE_NAMES.FONT);
    expect(getCacheStrategy('/fonts/x.otf').cacheName).toBe(CACHE_NAMES.FONT);
    expect(getCacheStrategy('/fonts/x.eot').cacheName).toBe(CACHE_NAMES.FONT);
  });

  it('FONT 1 yıl maxAge (uzun term)', () => {
    expect(getCacheStrategy('/fonts/x.woff2').maxAge).toBe(365 * 24 * 60 * 60 * 1000);
  });
});

describe('getCacheStrategy — API endpoints', () => {
  it('/api/ → network-first + API + 5-min maxAge', () => {
    const cfg = getCacheStrategy('/api/places');
    expect(cfg.strategy).toBe('network-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.API);
    expect(cfg.maxAge).toBe(5 * 60 * 1000);
  });

  it('/api/ nested path', () => {
    expect(getCacheStrategy('/api/users/123/profile').strategy).toBe('network-first');
  });

  it('API maxEntries 50', () => {
    expect(getCacheStrategy('/api/x').maxEntries).toBe(50);
  });
});

describe('getCacheStrategy — HTML pages', () => {
  it('/ → stale-while-revalidate + PAGES', () => {
    const cfg = getCacheStrategy('/');
    expect(cfg.strategy).toBe('stale-while-revalidate');
    expect(cfg.cacheName).toBe(CACHE_NAMES.PAGES);
  });

  it('.html → stale-while-revalidate', () => {
    expect(getCacheStrategy('/about.html').strategy).toBe('stale-while-revalidate');
  });

  it('PAGES maxAge 1 gün', () => {
    expect(getCacheStrategy('/').maxAge).toBe(24 * 60 * 60 * 1000);
  });

  it('PAGES maxEntries 20', () => {
    expect(getCacheStrategy('/index.html').maxEntries).toBe(20);
  });
});

describe('getCacheStrategy — default fallback', () => {
  it('rastgele path → network-first DYNAMIC fallback', () => {
    const cfg = getCacheStrategy('/some-arbitrary-path');
    expect(cfg.strategy).toBe('network-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.DYNAMIC);
  });

  it('boş URL → fallback', () => {
    expect(getCacheStrategy('').cacheName).toBe(CACHE_NAMES.DYNAMIC);
  });

  it('fallback maxAge yok (default fonksiyona bırakılır)', () => {
    expect(getCacheStrategy('/random').maxAge).toBeUndefined();
  });
});

describe('getCacheStrategy — pattern öncelik sırası', () => {
  it('JS .js + /api/ aynı path varsa pattern sırası önemli (JS önce)', () => {
    // Implementation: routeStrategies[0] = JS, [3] = API
    // /api/script.js — pattern[0] (JS) önce match → cache-first STATIC
    const cfg = getCacheStrategy('/api/script.js');
    expect(cfg.strategy).toBe('cache-first');
    expect(cfg.cacheName).toBe(CACHE_NAMES.STATIC);
  });

  it('image içeren API path — IMAGES kazanır (pattern sırası)', () => {
    const cfg = getCacheStrategy('/api/avatar.png');
    expect(cfg.cacheName).toBe(CACHE_NAMES.IMAGES);
  });
});
