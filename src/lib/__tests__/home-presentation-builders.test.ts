/**
 * Unit Tests — home-presentation builders & resolvers
 *
 * Coverage: anasayfa render'da settings → platform → fallback öncelik zinciri,
 * service freshness/stale logic, MVP card link filter, review excerpt, density ratio,
 * runtime meta freshness aggregation.
 *
 * Note: city-service-freshness gerçek implementasyon kullanılır (mock yok) —
 * isFreshnessStale + buildFreshnessLabel pure helper.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  buildLiveStatusCards,
  resolveLiveStatusCardItems,
  buildServiceQuickLinks,
  buildRecentTrustSignals,
  buildMvpQuickStartCards,
  buildReviewHighlights,
  buildCategoryDensityCards,
  buildPrimaryActions,
  buildQuickCategories,
  buildHeroQuickLinks,
  buildTrendingFallbackQueries,
  buildCommunityPanel,
  buildFaqItems,
  buildFeaturedGuides,
  buildHomepageRuntimeMeta,
  HOME_MVP_QUICK_START_FALLBACK,
  HOME_QUICK_CATEGORIES_FALLBACK,
  HOME_HERO_QUICK_LINKS_FALLBACK,
  HOME_TRENDING_FALLBACK,
  HOME_COMMUNITY_PANEL_FALLBACK,
  HOME_FAQ_FALLBACK,
  HOME_FEATURED_GUIDES_FALLBACK,
} from '../home-presentation';

// Sabit "now" — freshness testleri deterministik çalışsın
const FIXED_NOW = new Date('2026-05-03T12:00:00Z').getTime();

describe('buildLiveStatusCards', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('boş items → boş array', () => {
    const result = buildLiveStatusCards({
      items: [],
      pharmacyCount: 5,
      busRouteCount: 10,
      serviceFreshness: {},
    });
    expect(result).toEqual([]);
  });

  it('pharmacy card metric pharmacyCount+ ile fill edilir', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy', title: 'Eczane', icon: 'lucide:cross', href: '/x' }],
      pharmacyCount: 25,
      busRouteCount: 0,
      serviceFreshness: {
        'jobs.contentQuality.lastRun': new Date(FIXED_NOW - 1000).toISOString(),
      },
    });
    expect(result[0].metric).toBe('25+');
  });

  it('bus card metric busRouteCount+ ile fill edilir', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'bus', title: 'Otobüs' }],
      pharmacyCount: 0,
      busRouteCount: 47,
      serviceFreshness: {
        'transport.lastUpdated': new Date(FIXED_NOW - 1000).toISOString(),
      },
    });
    expect(result[0].metric).toBe('47+');
  });

  it('flight card metric "GAP"', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'flight', title: 'Uçak' }],
      pharmacyCount: 0,
      busRouteCount: 0,
      serviceFreshness: {
        'weather.lastUpdated': new Date(FIXED_NOW - 1000).toISOString(),
      },
    });
    expect(result[0].metric).toBe('GAP');
  });

  it('bilinmeyen key metric "--"', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'unknown', title: 'X' }],
      pharmacyCount: 0,
      busRouteCount: 0,
      serviceFreshness: {},
    });
    expect(result[0].metric).toBe('--');
  });

  it('custom metric override (card.metric)', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy', metric: 'CUSTOM' }],
      pharmacyCount: 100,
      busRouteCount: 0,
      serviceFreshness: {},
    });
    expect(result[0].metric).toBe('CUSTOM');
  });

  it('stale = true → amber badgeClass + SLA disi statusText', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy' }],
      pharmacyCount: 5,
      busRouteCount: 0,
      // 2 gün önce → 1440 dak (24sa) TTL'i geçti
      serviceFreshness: {
        'jobs.contentQuality.lastRun': new Date(FIXED_NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    expect(result[0].stale).toBe(true);
    expect(result[0].badgeClass).toContain('amber');
    expect(result[0].statusText).toBe('SLA disi veri');
  });

  it('stale = false → emerald badge (default)', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy' }],
      pharmacyCount: 5,
      busRouteCount: 0,
      serviceFreshness: {
        'jobs.contentQuality.lastRun': new Date(FIXED_NOW - 1000).toISOString(),
      },
    });
    expect(result[0].stale).toBe(false);
    expect(result[0].badgeClass).toContain('emerald');
  });

  it('eksik freshness → stale=true (varsayılan)', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy' }],
      pharmacyCount: 5,
      busRouteCount: 0,
      serviceFreshness: {},
    });
    expect(result[0].stale).toBe(true);
  });

  it('default values (icon/title/href/cta)', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'pharmacy' }],
      pharmacyCount: 5,
      busRouteCount: 0,
      serviceFreshness: {
        'jobs.contentQuality.lastRun': new Date(FIXED_NOW - 1000).toISOString(),
      },
    });
    expect(result[0].icon).toBe('lucide:activity');
    expect(result[0].title).toBe('Şehir Servisi');
    expect(result[0].href).toBe('#');
    expect(result[0].cta).toBe('Detay');
    expect(result[0].metricLabel).toBe('canlı servis');
  });

  it('payload.metric/payload.cta okunur (card.metric yoksa)', () => {
    const result = buildLiveStatusCards({
      items: [{ key: 'unknown', payload: { metric: 'P-METRIC', cta: 'P-CTA' } }],
      pharmacyCount: 0,
      busRouteCount: 0,
      serviceFreshness: {},
    });
    expect(result[0].metric).toBe('P-METRIC');
    expect(result[0].cta).toBe('P-CTA');
  });
});

describe('resolveLiveStatusCardItems', () => {
  it('items > 0 → items olduğu gibi', () => {
    const items = [{ key: 'a' }, { key: 'b' }];
    expect(
      resolveLiveStatusCardItems({ items, platformCityServices: [], pharmacyCount: 0, busRouteCount: 0 }),
    ).toBe(items);
  });

  it('items boş + platformCityServices > 0 → ilk 3 platform', () => {
    const platform = Array.from({ length: 5 }, (_, i) => ({
      service_key: `svc-${i}`,
      title: `Service ${i}`,
      summary: `summary ${i}`,
      href: `/s/${i}`,
    }));
    const result = resolveLiveStatusCardItems({
      items: [],
      platformCityServices: platform,
      pharmacyCount: 0,
      busRouteCount: 0,
    });
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('svc-0');
  });

  it('hem items hem platform boş → 3-card fallback (pharmacy/bus/flight)', () => {
    const result = resolveLiveStatusCardItems({
      items: [],
      platformCityServices: [],
      pharmacyCount: 5,
      busRouteCount: 10,
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(['pharmacy', 'bus', 'flight']);
  });

  it('fallback: pharmacyCount > 0 → emerald badge', () => {
    const result = resolveLiveStatusCardItems({
      items: [],
      platformCityServices: [],
      pharmacyCount: 5,
      busRouteCount: 0,
    });
    expect(result[0].badgeClass).toContain('emerald');
  });

  it('fallback: pharmacyCount = 0 → amber badge', () => {
    const result = resolveLiveStatusCardItems({
      items: [],
      platformCityServices: [],
      pharmacyCount: 0,
      busRouteCount: 0,
    });
    expect(result[0].badgeClass).toContain('amber');
  });
});

describe('buildServiceQuickLinks', () => {
  it('items > 0 → items as-is', () => {
    const items = [{ key: 'a', title: 'A' }];
    const result = buildServiceQuickLinks(items, []);
    expect(result).toBe(items as any);
  });

  it('items boş + platform > 0 → ilk 3 platform mapped', () => {
    const platform = Array.from({ length: 5 }, (_, i) => ({
      service_key: `svc-${i}`,
      service_group: `Group ${i}`,
      title: `Service ${i}`,
      summary: `s ${i}`,
      href: `/s/${i}`,
    }));
    const result = buildServiceQuickLinks([], platform);
    expect(result).toHaveLength(3);
    expect(result[0].hoverBorderClass).toContain('emerald');
    expect(result[1].hoverBorderClass).toContain('sky');
    expect(result[2].hoverBorderClass).toContain('violet');
  });

  it('hem items hem platform boş → 3-card fallback (pharmacy/bus/flight)', () => {
    const result = buildServiceQuickLinks([], []);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(['pharmacy', 'bus', 'flight']);
  });
});

describe('buildRecentTrustSignals', () => {
  const fmtDate = (v?: string | Date) => (v ? `D-${String(v)}` : '');

  it('place listesini trust signal objelerine çevirir', () => {
    const places = [
      {
        slug: 'a',
        name: 'Mekan A',
        district_name: 'Eyyübiye',
        updated_at: '2026-05-01',
        rating: 4.567,
      },
    ];
    const result = buildRecentTrustSignals(places, fmtDate);
    expect(result[0]).toEqual({
      slug: 'a',
      name: 'Mekan A',
      district: 'Eyyübiye',
      updatedAt: 'D-2026-05-01',
      rating: '4.6',
    });
  });

  it('en fazla 6 place döner', () => {
    const places = Array.from({ length: 10 }, (_, i) => ({ slug: `p-${i}`, name: `P${i}` }));
    expect(buildRecentTrustSignals(places, fmtDate)).toHaveLength(6);
  });

  it('district fallback: address_district → "Şanlıurfa"', () => {
    const places = [{ slug: 'x', name: 'X', address_district: 'Halil' }];
    expect(buildRecentTrustSignals(places, fmtDate)[0].district).toBe('Halil');

    const placesNoDistrict = [{ slug: 'x', name: 'X' }];
    expect(buildRecentTrustSignals(placesNoDistrict, fmtDate)[0].district).toBe('Şanlıurfa');
  });

  it('rating yok → "-"', () => {
    const places = [{ slug: 'x', name: 'X' }];
    expect(buildRecentTrustSignals(places, fmtDate)[0].rating).toBe('-');
  });

  it('updated_at yoksa created_at fallback', () => {
    const places = [{ slug: 'x', name: 'X', created_at: '2026-01-01' }];
    expect(buildRecentTrustSignals(places, fmtDate)[0].updatedAt).toBe('D-2026-01-01');
  });
});

describe('buildMvpQuickStartCards', () => {
  it('boş items → fallback', () => {
    expect(buildMvpQuickStartCards([])).toBe(HOME_MVP_QUICK_START_FALLBACK);
  });

  it('valid card → kabul edilir', () => {
    const items = [
      {
        badge: 'B',
        title: 'T',
        description: 'D',
        href: '/path',
        links: [{ href: '/a', label: 'A' }],
      },
    ];
    const result = buildMvpQuickStartCards(items);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('T');
    expect(result[0].links).toHaveLength(1);
  });

  it('href "/" ile başlamayan → reddedilir → fallback', () => {
    const items = [{ badge: 'B', title: 'T', description: 'D', href: 'http://evil' }];
    expect(buildMvpQuickStartCards(items)).toBe(HOME_MVP_QUICK_START_FALLBACK);
  });

  it('badge/title/description eksik → reddedilir', () => {
    const items = [{ href: '/x' }];
    expect(buildMvpQuickStartCards(items)).toBe(HOME_MVP_QUICK_START_FALLBACK);
  });

  it('links içindeki href "/" ile başlamayanlar filter ediliyor', () => {
    const items = [
      {
        badge: 'B',
        title: 'T',
        description: 'D',
        href: '/x',
        links: [
          { href: '/ok', label: 'OK' },
          { href: 'http://bad', label: 'BAD' },
          { href: '/empty', label: '' },
        ],
      },
    ];
    const result = buildMvpQuickStartCards(items);
    expect(result[0].links).toEqual([{ href: '/ok', label: 'OK' }]);
  });
});

describe('buildReviewHighlights', () => {
  const fmtDate = (v?: string | Date) => (v ? `D-${String(v)}` : '');

  it('content excerpt 180 char ile sınırlı', () => {
    const longContent = 'a'.repeat(300);
    const items = [{ place_slug: 'x', place_name: 'X', content: longContent, rating: 5 }];
    const result = buildReviewHighlights(items, fmtDate);
    expect(result[0].excerpt).toHaveLength(180);
  });

  it('content boş → varsayılan TR mesaj', () => {
    const items = [{ place_slug: 'x', place_name: 'X' }];
    expect(buildReviewHighlights(items, fmtDate)[0].excerpt).toBe(
      'Bu mekan için yeni bir değerlendirme eklendi.',
    );
  });

  it('rating string → number coerce', () => {
    const items = [{ place_slug: 'x', place_name: 'X', rating: '4.5' as any }];
    expect(buildReviewHighlights(items, fmtDate)[0].rating).toBe(4.5);
  });

  it('rating yok → null', () => {
    const items = [{ place_slug: 'x', place_name: 'X' }];
    expect(buildReviewHighlights(items, fmtDate)[0].rating).toBeNull();
  });

  it('whitespace collapse: çoklu boşluk tek boşluk', () => {
    const items = [{ place_slug: 'x', place_name: 'X', content: 'a   b\n\nc' }];
    expect(buildReviewHighlights(items, fmtDate)[0].excerpt).toBe('a b c');
  });
});

describe('buildCategoryDensityCards', () => {
  it('ratio max kategori 100, diğerleri orantılı', () => {
    const heatmap = [
      { slug: 'a', name: 'A', place_count: 100 },
      { slug: 'b', name: 'B', place_count: 50 },
      { slug: 'c', name: 'C', place_count: 25 },
    ];
    const result = buildCategoryDensityCards(heatmap);
    expect(result[0].ratio).toBe(100); // 100/100*100 = 100
    expect(result[1].ratio).toBe(50);  // 50/100*100 = 50
    expect(result[2].ratio).toBe(25);  // 25/100*100 = 25
  });

  it('minimum ratio 8 (görsel min height)', () => {
    const heatmap = [
      { slug: 'a', name: 'A', place_count: 1000 },
      { slug: 'b', name: 'B', place_count: 1 },
    ];
    const result = buildCategoryDensityCards(heatmap);
    expect(result[1].ratio).toBeGreaterThanOrEqual(8);
  });

  it('place_count yok → 0', () => {
    const heatmap = [{ slug: 'a', name: 'A' }];
    expect(buildCategoryDensityCards(heatmap)[0].count).toBe(0);
  });

  it('boş heatmap → boş array', () => {
    expect(buildCategoryDensityCards([])).toEqual([]);
  });
});

describe('buildPrimaryActions', () => {
  const baseParams = {
    pharmacyCount: 5,
    busRouteCount: 10,
    upcomingEventsCount: 3,
  };

  it('settingItems > 0 → settingItems direkt döner', () => {
    const settingItems = [{ icon: 'x', title: 'T', description: 'D', href: '/x' }];
    const result = buildPrimaryActions({
      settingItems,
      platformPrimaryActions: [],
      ...baseParams,
    });
    expect(result).toEqual(settingItems);
  });

  it('settingItems boş + platformPrimaryActions > 0 → platform + fallback (max 8)', () => {
    const platform = [{ icon: 'p', title: 'P', description: 'D', href: '/p', stat: 's' }] as any;
    const result = buildPrimaryActions({
      settingItems: [],
      platformPrimaryActions: platform,
      ...baseParams,
    });
    expect(result.length).toBeLessThanOrEqual(8);
    expect(result[0]).toEqual(platform[0]);
  });

  it('hem boş → fallback (7 default cards)', () => {
    const result = buildPrimaryActions({
      settingItems: [],
      platformPrimaryActions: [],
      ...baseParams,
    });
    expect(result.length).toBe(7);
  });
});

describe('buildQuickCategories', () => {
  it('boş items → fallback', () => {
    expect(buildQuickCategories([])).toBe(HOME_QUICK_CATEGORIES_FALLBACK);
  });

  it('valid items → mapped', () => {
    const items = [{ slug: 'kebap', name: 'Kebap' }];
    expect(buildQuickCategories(items)).toEqual([{ slug: 'kebap', name: 'Kebap' }]);
  });

  it('slug veya name boş → filter, kalan yok → fallback', () => {
    const items = [{ slug: '', name: '' }, { slug: 'x', name: '' }];
    expect(buildQuickCategories(items)).toBe(HOME_QUICK_CATEGORIES_FALLBACK);
  });

  it('whitespace trim', () => {
    const items = [{ slug: '  k  ', name: '  N  ' }];
    expect(buildQuickCategories(items)).toEqual([{ slug: 'k', name: 'N' }]);
  });
});

describe('buildFeaturedGuides', () => {
  it('boş items → fallback', () => {
    expect(buildFeaturedGuides([])).toBe(HOME_FEATURED_GUIDES_FALLBACK);
  });

  it('items > 0 → items as-is', () => {
    const items = [{ title: 'X', href: '/x', icon: 'lucide:y' }];
    expect(buildFeaturedGuides(items)).toBe(items as any);
  });
});

describe('buildHeroQuickLinks', () => {
  it('items > 0 → items as-is', () => {
    const items = [{ label: 'A', href: '/a' }];
    expect(buildHeroQuickLinks(items, [])).toBe(items as any);
  });

  it('items boş + platform > 0 → ilk 5 platform mapped', () => {
    const platform = Array.from({ length: 8 }, (_, i) => ({
      title: `T${i}`,
      href: `/p/${i}`,
    }));
    const result = buildHeroQuickLinks([], platform);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ label: 'T0', href: '/p/0' });
  });

  it('platform: title yok veya href "/" ile başlamıyor → filter', () => {
    const platform = [
      { title: 'OK', href: '/ok' },
      { title: '', href: '/empty' },
      { title: 'BAD', href: 'http://bad' },
    ];
    const result = buildHeroQuickLinks([], platform);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('OK');
  });

  it('hem items hem platform boş → fallback', () => {
    expect(buildHeroQuickLinks([], [])).toBe(HOME_HERO_QUICK_LINKS_FALLBACK);
  });
});

describe('buildTrendingFallbackQueries', () => {
  it('boş items → fallback', () => {
    expect(buildTrendingFallbackQueries([])).toBe(HOME_TRENDING_FALLBACK);
  });

  it('valid items → mapped, search_count = 0', () => {
    const items = [{ query: 'kebap' }, { query: '  pide  ' }];
    expect(buildTrendingFallbackQueries(items)).toEqual([
      { query: 'kebap', search_count: 0 },
      { query: 'pide', search_count: 0 },
    ]);
  });

  it('hepsi boş query → fallback', () => {
    const items = [{ query: '' }, { query: '   ' }];
    expect(buildTrendingFallbackQueries(items)).toBe(HOME_TRENDING_FALLBACK);
  });
});

describe('buildCommunityPanel', () => {
  it('null setting → fallback', () => {
    expect(buildCommunityPanel(null)).toBe(HOME_COMMUNITY_PANEL_FALLBACK);
  });

  it('title/description yok → fallback', () => {
    expect(buildCommunityPanel({ title: '', description: '' })).toBe(HOME_COMMUNITY_PANEL_FALLBACK);
  });

  it('valid setting → custom panel', () => {
    const setting = {
      title: 'Custom',
      description: 'Desc',
      items: [{ label: 'L', href: '/l' }],
    };
    const result = buildCommunityPanel(setting);
    expect(result.title).toBe('Custom');
    expect(result.items).toEqual([{ label: 'L', href: '/l' }]);
  });

  it('items "/" ile başlamayan filter, kalan boş → fallback items', () => {
    const setting = {
      title: 'T',
      description: 'D',
      items: [{ label: 'BAD', href: 'http://x' }],
    };
    expect(buildCommunityPanel(setting).items).toBe(HOME_COMMUNITY_PANEL_FALLBACK.items);
  });
});

describe('buildFaqItems', () => {
  it('boş items → fallback', () => {
    expect(buildFaqItems([])).toBe(HOME_FAQ_FALLBACK);
  });

  it('items > 0 → items as-is', () => {
    const items = [{ S: 'Soru', C: 'Cevap' }];
    expect(buildFaqItems(items)).toBe(items as any);
  });
});

describe('buildHomepageRuntimeMeta', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('boş freshness → generatedAtIso = maxFreshnessIso', () => {
    const meta = buildHomepageRuntimeMeta({});
    expect(meta.generatedAtIso).toBe(meta.maxFreshnessIso);
    expect(meta.generatedAtIso).toBe(new Date(FIXED_NOW).toISOString());
  });

  it('en yeni freshness max olarak seçilir', () => {
    const oldIso = new Date(FIXED_NOW - 86400000).toISOString();
    const newIso = new Date(FIXED_NOW - 3600000).toISOString();
    const meta = buildHomepageRuntimeMeta({
      'transport.lastUpdated': oldIso,
      'weather.lastUpdated': newIso,
      'jobs.contentQuality.lastRun': oldIso,
    });
    expect(meta.maxFreshnessIso).toBe(newIso);
  });

  it('invalid date string → ignore (skip)', () => {
    const validIso = new Date(FIXED_NOW - 1000).toISOString();
    const meta = buildHomepageRuntimeMeta({
      'transport.lastUpdated': 'NOT A DATE',
      'weather.lastUpdated': validIso,
    });
    expect(meta.maxFreshnessIso).toBe(validIso);
  });

  it('lastUpdatedLabel TR locale formatı (dd.MM.yyyy HH:mm)', () => {
    const meta = buildHomepageRuntimeMeta({
      'weather.lastUpdated': new Date(FIXED_NOW - 1000).toISOString(),
    });
    // Türkçe locale: GG.AA.YYYY HH:mm formatı
    expect(meta.lastUpdatedLabel).toMatch(/\d{1,2}[.\/]\d{1,2}[.\/]\d{4}/);
  });
});
