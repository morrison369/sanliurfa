/**
 * Unit Tests — home-presentation pure helpers
 *
 * getQuickCategoryIcon, buildHistoricalCardImage, buildDistrictServiceLinks,
 * HOME_QUICK_CATEGORY_ICON_MAP, HOME_PRIMARY_ACTIONS_FALLBACK
 *
 * Pure helpers (no DB) — anasayfa render'ında kategori icon mapping,
 * tarihi yer kart görseli, ilçe link listesi.
 */

import { describe, it, expect } from 'vitest';
import {
  getQuickCategoryIcon,
  buildHistoricalCardImage,
  buildDistrictServiceLinks,
  HOME_QUICK_CATEGORY_ICON_MAP,
  HOME_PRIMARY_ACTIONS_FALLBACK,
} from '../home-presentation';

describe('getQuickCategoryIcon', () => {
  it('bilinen slug için doğru lucide icon', () => {
    expect(getQuickCategoryIcon('kebapcilar')).toBe('lucide:beef');
    expect(getQuickCategoryIcon('cigerciler')).toBe('lucide:flame');
    expect(getQuickCategoryIcon('lahmacuncular')).toBe('lucide:pizza');
    expect(getQuickCategoryIcon('pideciler')).toBe('lucide:sandwich');
    expect(getQuickCategoryIcon('cig-kofteciler')).toBe('lucide:utensils-crossed');
    expect(getQuickCategoryIcon('yoresel-yemekler')).toBe('lucide:chef-hat');
    expect(getQuickCategoryIcon('kahvalti-mekanlari')).toBe('lucide:sun');
    expect(getQuickCategoryIcon('tatlicilar')).toBe('lucide:ice-cream-bowl');
    expect(getQuickCategoryIcon('kafeler')).toBe('lucide:coffee');
    expect(getQuickCategoryIcon('cay-bahceleri')).toBe('lucide:cup-soda');
    expect(getQuickCategoryIcon('firinlar')).toBe('lucide:croissant');
    expect(getQuickCategoryIcon('balik-restoranlari')).toBe('lucide:fish');
  });

  it('bilinmeyen slug için fallback grid icon', () => {
    expect(getQuickCategoryIcon('unknown-category')).toBe('lucide:grid-2x2');
    expect(getQuickCategoryIcon('')).toBe('lucide:grid-2x2');
  });

  it('case-sensitive: KEBAPCILAR (uppercase) → fallback', () => {
    expect(getQuickCategoryIcon('KEBAPCILAR')).toBe('lucide:grid-2x2');
  });

  it('HOME_QUICK_CATEGORY_ICON_MAP 12 yöresel kategori içerir', () => {
    expect(Object.keys(HOME_QUICK_CATEGORY_ICON_MAP)).toHaveLength(12);
  });

  it('tüm icon değerleri lucide: prefix ile başlar', () => {
    for (const icon of Object.values(HOME_QUICK_CATEGORY_ICON_MAP)) {
      expect(icon).toMatch(/^lucide:/);
    }
  });
});

describe('buildHistoricalCardImage', () => {
  it('cover_image mevcut → cover_image döner', () => {
    const site = { cover_image: '/images/site/gobeklitepe.jpg', images: ['/img/x.jpg'] };
    expect(buildHistoricalCardImage(site)).toBe('/images/site/gobeklitepe.jpg');
  });

  it('cover_image yok → images[0] döner', () => {
    const site = { images: ['/img/first.jpg', '/img/second.jpg'] };
    expect(buildHistoricalCardImage(site)).toBe('/img/first.jpg');
  });

  it('cover_image ve images yok → varsayılan hero', () => {
    const site = { name: 'X', description: 'Y' };
    expect(buildHistoricalCardImage(site)).toBe('/images/hero/hero-home.webp');
  });

  it('images boş array → varsayılan hero', () => {
    const site = { images: [] };
    expect(buildHistoricalCardImage(site)).toBe('/images/hero/hero-home.webp');
  });

  it('images null → varsayılan hero (Array.isArray check)', () => {
    const site = { images: null as any };
    expect(buildHistoricalCardImage(site)).toBe('/images/hero/hero-home.webp');
  });

  it('cover_image string olarak coerce edilir', () => {
    const site = { cover_image: 12345 as any };
    expect(buildHistoricalCardImage(site)).toBe('12345');
  });
});

describe('buildDistrictServiceLinks', () => {
  it('ilçe listesini link objelerine çevirir', () => {
    const districts = [
      { name: 'Eyyübiye', slug: 'eyyubiye', place_count: 120 },
      { name: 'Haliliye', slug: 'haliliye', place_count: 85 },
    ];
    const result = buildDistrictServiceLinks(districts);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'Eyyübiye',
      href: '/ilceler/eyyubiye',
      placeCount: 120,
    });
  });

  it('en fazla 8 ilçe döner (slice(0, 8))', () => {
    const districts = Array.from({ length: 15 }, (_, i) => ({
      name: `District ${i}`,
      slug: `slug-${i}`,
      place_count: i,
    }));
    expect(buildDistrictServiceLinks(districts)).toHaveLength(8);
  });

  it('slug whitespace trim ediliyor', () => {
    const districts = [{ name: 'X', slug: '  spaced  ', place_count: 5 }];
    expect(buildDistrictServiceLinks(districts)[0].href).toBe('/ilceler/spaced');
  });

  it('eksik field default değerler', () => {
    const districts = [{}];
    const result = buildDistrictServiceLinks(districts);
    expect(result[0].name).toBe('');
    expect(result[0].href).toBe('/ilceler/');
    expect(result[0].placeCount).toBe(0);
  });

  it('place_count number coerce', () => {
    const districts = [{ name: 'X', slug: 'x', place_count: '42' as any }];
    expect(buildDistrictServiceLinks(districts)[0].placeCount).toBe(42);
  });

  it('boş array → boş result', () => {
    expect(buildDistrictServiceLinks([])).toEqual([]);
  });
});

describe('HOME_PRIMARY_ACTIONS_FALLBACK', () => {
  it('factory function returns array of action cards', () => {
    const cards = HOME_PRIMARY_ACTIONS_FALLBACK({
      pharmacyCount: 25,
      busRouteCount: 12,
      upcomingEventsCount: 8,
    });
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('pharmacy stat dynamic', () => {
    const cards = HOME_PRIMARY_ACTIONS_FALLBACK({
      pharmacyCount: 99,
      busRouteCount: 0,
      upcomingEventsCount: 0,
    });
    const pharmacy = cards.find((c) => c.title.includes('Eczane'));
    expect(pharmacy?.stat).toContain('99');
  });

  it('bus stat dynamic', () => {
    const cards = HOME_PRIMARY_ACTIONS_FALLBACK({
      pharmacyCount: 0,
      busRouteCount: 47,
      upcomingEventsCount: 0,
    });
    const bus = cards.find((c) => c.title.includes('Otobüs'));
    expect(bus?.stat).toContain('47');
  });

  it('all cards have required fields (icon/title/description/href)', () => {
    const cards = HOME_PRIMARY_ACTIONS_FALLBACK({
      pharmacyCount: 0,
      busRouteCount: 0,
      upcomingEventsCount: 0,
    });
    for (const card of cards) {
      expect(card.icon).toMatch(/^lucide:/);
      expect(card.title).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.href).toMatch(/^\//);
    }
  });

  it('handles zero counts (placeholder text)', () => {
    const cards = HOME_PRIMARY_ACTIONS_FALLBACK({
      pharmacyCount: 0,
      busRouteCount: 0,
      upcomingEventsCount: 0,
    });
    // Cards still rendered with 0+ stat (not hidden)
    expect(cards.length).toBeGreaterThan(0);
  });
});
