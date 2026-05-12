/**
 * Unit Tests — site-setting-schemas.ts
 *
 * Zod schema validation for admin-editable homepage section payloads.
 * `validateSiteSettingValue(key, value)`:
 * - bilinmeyen key → value as-is (passthrough, geçersiz key admin tarafından gelmez)
 * - schema valid → parsed data döner
 * - schema invalid → null (caller fallback dönmeli)
 *
 * Coverage: 11 farklı section schema (primaryActions, quickCategories, featuredGuides,
 * faq, heroQuickLinks, liveStatusCards, serviceQuickLinks, communityPanel,
 * trendingFallbackQueries, sections, mvpQuickStart).
 */

import { describe, it, expect } from 'vitest';
import { validateSiteSettingValue, siteSettingSchemas } from '../site-setting-schemas';

describe('validateSiteSettingValue — bilinmeyen key', () => {
  it('schema yoksa value as-is döner (passthrough)', () => {
    const value = { foo: 'bar' };
    expect(validateSiteSettingValue('unknown.key', value)).toBe(value);
  });

  it('boş key → passthrough', () => {
    const value = { x: 1 };
    expect(validateSiteSettingValue('', value)).toBe(value);
  });
});

describe('homepage.primaryActions', () => {
  const KEY = 'homepage.primaryActions';

  it('valid items → parse success', () => {
    const value = {
      items: [
        { icon: 'lucide:cross', title: 'Eczane', description: 'Eczane bilgisi', href: '/x', stat: '5+' },
      ],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('icon optional', () => {
    const value = {
      items: [{ title: 'X', description: 'D', href: '/x', stat: 's' }],
    };
    expect(validateSiteSettingValue(KEY, value)).not.toBeNull();
  });

  it('title boş → null', () => {
    const value = { items: [{ title: '', description: 'D', href: '/x', stat: 's' }] };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });

  it('eksik field → null', () => {
    const value = { items: [{ title: 'X' }] };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });

  it('boş items array → valid (admin clear edebilir)', () => {
    expect(validateSiteSettingValue(KEY, { items: [] })).toEqual({ items: [] });
  });
});

describe('homepage.quickCategories', () => {
  const KEY = 'homepage.quickCategories';

  it('valid slug+name → success', () => {
    const value = { items: [{ slug: 'kebap', name: 'Kebapçılar' }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('slug boş → null', () => {
    const value = { items: [{ slug: '', name: 'X' }] };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });

  it('name boş → null', () => {
    const value = { items: [{ slug: 'x', name: '' }] };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });
});

describe('homepage.featuredGuides', () => {
  const KEY = 'homepage.featuredGuides';

  it('valid title+href → success (icon optional)', () => {
    const value = { items: [{ title: 'Rehber', href: '/r' }] };
    expect(validateSiteSettingValue(KEY, value)).not.toBeNull();
  });

  it('icon ile valid', () => {
    const value = { items: [{ title: 'Rehber', href: '/r', icon: 'lucide:book' }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('href eksik → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ title: 'X' }] })).toBeNull();
  });
});

describe('homepage.faq', () => {
  const KEY = 'homepage.faq';

  it('valid S/C → success', () => {
    const value = { items: [{ S: 'Soru?', C: 'Cevap.' }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('S boş → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ S: '', C: 'C' }] })).toBeNull();
  });

  it('C boş → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ S: 'S', C: '' }] })).toBeNull();
  });
});

describe('homepage.heroQuickLinks', () => {
  const KEY = 'homepage.heroQuickLinks';

  it('valid label+href → success', () => {
    const value = { items: [{ label: 'Eczane', href: '/x' }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('label boş → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ label: '', href: '/x' }] })).toBeNull();
  });
});

describe('homepage.liveStatusCards', () => {
  const KEY = 'homepage.liveStatusCards';

  it('minimum required (title+href) → success', () => {
    const value = { items: [{ title: 'X', href: '/x' }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('tüm optional alanlar dolu', () => {
    const value = {
      items: [
        {
          key: 'pharmacy',
          icon: 'lucide:cross',
          title: 'Eczane',
          metric: '5+',
          metricLabel: 'eczane',
          statusText: 'aktif',
          freshnessKey: 'jobs.contentQuality.lastRun',
          href: '/x',
          cta: 'Aç',
          badgeClass: 'bg-emerald-500',
        },
      ],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('title eksik → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ href: '/x' }] })).toBeNull();
  });
});

describe('homepage.serviceQuickLinks', () => {
  const KEY = 'homepage.serviceQuickLinks';

  it('valid card → success', () => {
    const value = {
      items: [
        {
          categoryLabel: 'Sağlık',
          title: 'Eczane',
          description: 'Açıklama',
          href: '/x',
        },
      ],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('categoryLabel boş → null', () => {
    const value = {
      items: [{ categoryLabel: '', title: 'X', description: 'D', href: '/x' }],
    };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });
});

describe('homepage.communityPanel', () => {
  const KEY = 'homepage.communityPanel';

  it('valid — title/description/items', () => {
    const value = {
      title: 'Topluluk',
      description: 'Açıklama',
      items: [{ href: '/x', label: 'Topluluk' }],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('items boş array → valid', () => {
    const value = { title: 'T', description: 'D', items: [] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('title eksik → null', () => {
    const value = { description: 'D', items: [] };
    expect(validateSiteSettingValue(KEY, value as any)).toBeNull();
  });

  it('items array değil → null', () => {
    const value = { title: 'T', description: 'D', items: 'not-an-array' };
    expect(validateSiteSettingValue(KEY, value as any)).toBeNull();
  });
});

describe('homepage.trendingFallbackQueries', () => {
  const KEY = 'homepage.trendingFallbackQueries';

  it('search_count optional', () => {
    const value = { items: [{ query: 'kebap' }] };
    expect(validateSiteSettingValue(KEY, value)).not.toBeNull();
  });

  it('valid search_count number', () => {
    const value = { items: [{ query: 'kebap', search_count: 100 }] };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('query boş → null', () => {
    expect(validateSiteSettingValue(KEY, { items: [{ query: '' }] })).toBeNull();
  });
});

describe('homepage.sections', () => {
  const KEY = 'homepage.sections';

  it('valid order ile (enum)', () => {
    const value = {
      order: ['hero', 'live-status', 'faq'],
      visibility: { hero: true, faq: false },
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('visibility optional', () => {
    const value = { order: ['hero'] };
    expect(validateSiteSettingValue(KEY, value)).not.toBeNull();
  });

  it('order içinde unknown section ID → null', () => {
    const value = { order: ['hero', 'unknown-section-id'] };
    expect(validateSiteSettingValue(KEY, value as any)).toBeNull();
  });

  it('boş order array → valid', () => {
    expect(validateSiteSettingValue(KEY, { order: [] })).toEqual({ order: [] });
  });
});

describe('homepage.mvpQuickStart', () => {
  const KEY = 'homepage.mvpQuickStart';

  it('valid card → success', () => {
    const value = {
      items: [
        {
          badge: 'B',
          title: 'T',
          description: 'D',
          href: '/x',
          links: [{ href: '/a', label: 'A' }],
        },
      ],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('links boş array → valid', () => {
    const value = {
      items: [{ badge: 'B', title: 'T', description: 'D', href: '/x', links: [] }],
    };
    expect(validateSiteSettingValue(KEY, value)).toEqual(value);
  });

  it('badge eksik → null', () => {
    const value = {
      items: [{ title: 'T', description: 'D', href: '/x', links: [] }],
    };
    expect(validateSiteSettingValue(KEY, value as any)).toBeNull();
  });

  it('link.href boş → null', () => {
    const value = {
      items: [
        {
          badge: 'B',
          title: 'T',
          description: 'D',
          href: '/x',
          links: [{ href: '', label: 'A' }],
        },
      ],
    };
    expect(validateSiteSettingValue(KEY, value)).toBeNull();
  });
});

describe('siteSettingSchemas — schema registry', () => {
  it('11 anasayfa section schema kayıtlı', () => {
    expect(Object.keys(siteSettingSchemas)).toHaveLength(11);
  });

  it('tüm anahtar adları homepage. prefix ile başlar', () => {
    for (const key of Object.keys(siteSettingSchemas)) {
      expect(key).toMatch(/^homepage\./);
    }
  });
});
