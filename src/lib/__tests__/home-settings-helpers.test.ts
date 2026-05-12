/**
 * Unit Tests — home-settings.ts pure helpers
 *
 * - HOMEPAGE_SECTION_IDS / HOMEPAGE_SECTIONS_FALLBACK / HOMEPAGE_SECTION_COPY_OVERRIDES
 * - readRecord(value): plain object guard (Array hariç)
 * - readItems(value): { items: [...] } şekilli payload'tan filtered records çıkarır
 * - resolveHomepageSections(): platform > settings > fallback öncelik zinciri,
 *   bilinmeyen ID filter, eksik ID'ler default sırada eklenir
 * - summarizeHomepageSections(): order + enabled state özet listesi
 * - applySectionContentOverrides(): copy override (title/description/cta) admin-controlled
 *
 * Bu helper'lar SADECE pure (DB call yok). loadHomepagePresentationSettings
 * (async, DB-bound) bu test dosyasında değil.
 */

import { describe, it, expect } from 'vitest';
import {
  HOMEPAGE_SECTION_IDS,
  HOMEPAGE_SECTIONS_FALLBACK,
  HOMEPAGE_SECTION_COPY_OVERRIDES,
  readRecord,
  readItems,
  resolveHomepageSections,
  summarizeHomepageSections,
  applySectionContentOverrides,
} from '../home-settings';

describe('HOMEPAGE_SECTION_IDS', () => {
  it('21 anasayfa section ID kayıtlı', () => {
    expect(HOMEPAGE_SECTION_IDS).toHaveLength(21);
  });

  it('hero ilk, main-cta son', () => {
    expect(HOMEPAGE_SECTION_IDS[0]).toBe('hero');
    expect(HOMEPAGE_SECTION_IDS[HOMEPAGE_SECTION_IDS.length - 1]).toBe('main-cta');
  });

  it('faq + blog + recipes section dahil', () => {
    expect(HOMEPAGE_SECTION_IDS).toContain('faq');
    expect(HOMEPAGE_SECTION_IDS).toContain('blog');
    expect(HOMEPAGE_SECTION_IDS).toContain('recipes');
  });

  it('duplicate yok', () => {
    const set = new Set(HOMEPAGE_SECTION_IDS);
    expect(set.size).toBe(HOMEPAGE_SECTION_IDS.length);
  });
});

describe('HOMEPAGE_SECTIONS_FALLBACK', () => {
  it('order = HOMEPAGE_SECTION_IDS kopyası', () => {
    expect(HOMEPAGE_SECTIONS_FALLBACK.order).toEqual([...HOMEPAGE_SECTION_IDS]);
  });

  it('visibility default boş object', () => {
    expect(HOMEPAGE_SECTIONS_FALLBACK.visibility).toEqual({});
  });
});

describe('HOMEPAGE_SECTION_COPY_OVERRIDES', () => {
  it('non-empty', () => {
    expect(HOMEPAGE_SECTION_COPY_OVERRIDES.length).toBeGreaterThan(10);
  });

  it('tüm sectionKey HOMEPAGE_SECTION_IDS içinde', () => {
    for (const override of HOMEPAGE_SECTION_COPY_OVERRIDES) {
      expect(HOMEPAGE_SECTION_IDS).toContain(override.sectionKey as any);
    }
  });

  it('quick-actions override 3 alan da var (title/description/cta)', () => {
    const override = HOMEPAGE_SECTION_COPY_OVERRIDES.find((o) => o.sectionKey === 'quick-actions');
    expect(override?.title).toBeDefined();
    expect(override?.description).toBeDefined();
    expect(override?.cta).toBeDefined();
  });
});

describe('readRecord', () => {
  it('plain object → record', () => {
    expect(readRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('array → null (Array.isArray exclude)', () => {
    expect(readRecord([1, 2, 3])).toBeNull();
  });

  it('null → null', () => {
    expect(readRecord(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(readRecord(undefined)).toBeNull();
  });

  it('primitive (string/number) → null', () => {
    expect(readRecord('text')).toBeNull();
    expect(readRecord(42)).toBeNull();
    expect(readRecord(true)).toBeNull();
  });

  it('boş object → boş object (truthy)', () => {
    expect(readRecord({})).toEqual({});
  });
});

describe('readItems', () => {
  it('valid items array → record list', () => {
    const value = { items: [{ a: 1 }, { b: 2 }] };
    expect(readItems(value)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('items eksik → boş array', () => {
    expect(readItems({})).toEqual([]);
  });

  it('items array değil → boş array', () => {
    expect(readItems({ items: 'not-an-array' })).toEqual([]);
  });

  it('items içindeki array eleman filter (sadece record)', () => {
    const value = { items: [{ a: 1 }, [1, 2], 'string', null, { b: 2 }] };
    expect(readItems(value)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('null/array root → boş array', () => {
    expect(readItems(null)).toEqual([]);
    expect(readItems([1, 2])).toEqual([]);
  });

  it('boş items array → boş array', () => {
    expect(readItems({ items: [] })).toEqual([]);
  });
});

describe('resolveHomepageSections', () => {
  it('platform sections > 0 → platform sırası kullanılır', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: null,
      platformHomepageSections: [
        { section_key: 'faq', is_active: true },
        { section_key: 'hero', is_active: true },
      ],
    });
    // hero index 1 değil 2 olur (faq önce)
    expect(result.sectionOrderMap.faq).toBe(1);
    expect(result.sectionOrderMap.hero).toBe(2);
  });

  it('platform empty + setting order → setting kullanılır', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: { order: ['faq', 'hero'] },
      platformHomepageSections: [],
    });
    expect(result.sectionOrderMap.faq).toBe(1);
    expect(result.sectionOrderMap.hero).toBe(2);
  });

  it('hem platform hem setting yok → fallback order (HOMEPAGE_SECTION_IDS)', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: null,
      platformHomepageSections: [],
    });
    expect(result.sectionOrderMap.hero).toBe(1);
    expect(result.sectionOrderMap['main-cta']).toBe(HOMEPAGE_SECTION_IDS.length);
  });

  it('konfigüre edilmemiş ID default sırada eklenir (eksik bırakılmaz)', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: { order: ['faq'] }, // sadece faq belirtildi
      platformHomepageSections: [],
    });
    expect(result.sectionOrderMap.faq).toBe(1);
    // Diğer 20 ID 2..21 arasında konumlanmalı
    expect(result.sectionOrderMap.hero).toBe(2);
    expect(Object.keys(result.sectionOrderMap)).toHaveLength(HOMEPAGE_SECTION_IDS.length);
  });

  it('bilinmeyen section ID filter (allowlist enforcement)', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: { order: ['unknown-section', 'hero'] },
      platformHomepageSections: [],
    });
    expect(result.sectionOrderMap['unknown-section']).toBeUndefined();
    expect(result.sectionOrderMap.hero).toBe(1);
  });

  it('visibility setting object kabul edilir', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: { order: ['hero'], visibility: { faq: false } },
      platformHomepageSections: [],
    });
    expect(result.sectionVisibilitySetting.faq).toBe(false);
  });

  it('platform sections is_active=false → visibility false', () => {
    const result = resolveHomepageSections({
      homepageSectionsSetting: null,
      platformHomepageSections: [{ section_key: 'faq', is_active: false }],
    });
    expect(result.sectionVisibilitySetting.faq).toBe(false);
  });

  it('platform sections registry oluşur', () => {
    const platformSection = { section_key: 'hero', is_active: true };
    const result = resolveHomepageSections({
      homepageSectionsSetting: null,
      platformHomepageSections: [platformSection],
    });
    expect(result.homepageSectionRegistry.hero).toBe(platformSection);
  });
});

describe('summarizeHomepageSections', () => {
  it('order map + visibility birleştirilir, order küçükten büyüğe sıralanır', () => {
    const summary = summarizeHomepageSections({
      sectionOrderMap: { hero: 1, faq: 2, 'main-cta': 3 },
      sectionVisibilitySetting: { hero: true, faq: false, 'main-cta': true },
    });
    // İlk 3 index'in sırasına bak
    expect(summary[0].id).toBe('hero');
    expect(summary[0].order).toBe(1);
    expect(summary[1].id).toBe('faq');
    expect(summary[1].enabled).toBe(false);
  });

  it('eksik order → 999 (sonda görünür)', () => {
    const summary = summarizeHomepageSections({
      sectionOrderMap: { hero: 1 },
      sectionVisibilitySetting: { hero: true },
    });
    const last = summary[summary.length - 1];
    expect(last.order).toBe(999);
  });

  it('visibility setting yok → enabled true (varsayılan)', () => {
    const summary = summarizeHomepageSections({
      sectionOrderMap: { hero: 1 },
      sectionVisibilitySetting: {},
    });
    expect(summary[0].enabled).toBe(true);
  });

  it('explicit false → enabled false', () => {
    const summary = summarizeHomepageSections({
      sectionOrderMap: { hero: 1 },
      sectionVisibilitySetting: { hero: false },
    });
    expect(summary[0].enabled).toBe(false);
  });

  it('tüm 21 ID döner', () => {
    const summary = summarizeHomepageSections({
      sectionOrderMap: {},
      sectionVisibilitySetting: {},
    });
    expect(summary).toHaveLength(HOMEPAGE_SECTION_IDS.length);
  });
});

describe('applySectionContentOverrides', () => {
  it('section yoksa override skip', () => {
    const copy = { faqTitle: 'Default' } as any;
    const registry = {};
    const overrides = [{ sectionKey: 'faq', title: 'faqTitle' as any }];
    expect(applySectionContentOverrides(copy, registry, overrides)).toEqual({ faqTitle: 'Default' });
  });

  it('section.title varsa copy.title override', () => {
    const copy = { faqTitle: 'Default' } as any;
    const registry = { faq: { title: 'Custom Faq Title' } };
    const overrides = [{ sectionKey: 'faq', title: 'faqTitle' as any }];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.faqTitle).toBe('Custom Faq Title');
  });

  it('section.description override description copy', () => {
    const copy = { faqDescription: 'Default' } as any;
    const registry = { faq: { description: 'Custom Faq Desc' } };
    const overrides = [{ sectionKey: 'faq', description: 'faqDescription' as any }];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.faqDescription).toBe('Custom Faq Desc');
  });

  it('section.config.ctaLabel → cta copy override', () => {
    const copy = { recipesCtaLabel: 'Default' } as any;
    const registry = { recipes: { config: { ctaLabel: 'Yemek Tariflerini Aç' } } };
    const overrides = [{ sectionKey: 'recipes', cta: 'recipesCtaLabel' as any }];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.recipesCtaLabel).toBe('Yemek Tariflerini Aç');
  });

  it('section.title boş → skip (default kalır)', () => {
    const copy = { faqTitle: 'Default' } as any;
    const registry = { faq: { title: '' } };
    const overrides = [{ sectionKey: 'faq', title: 'faqTitle' as any }];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.faqTitle).toBe('Default');
  });

  it('section.config.ctaLabel yoksa cta override skip', () => {
    const copy = { recipesCtaLabel: 'Default' } as any;
    const registry = { recipes: { config: {} } };
    const overrides = [{ sectionKey: 'recipes', cta: 'recipesCtaLabel' as any }];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.recipesCtaLabel).toBe('Default');
  });

  it('multiple override sırayla işlenir', () => {
    const copy = {
      faqTitle: 'Default Faq Title',
      recipesTitle: 'Default Recipes Title',
    } as any;
    const registry = {
      faq: { title: 'New Faq' },
      recipes: { title: 'New Recipes' },
    };
    const overrides = [
      { sectionKey: 'faq', title: 'faqTitle' as any },
      { sectionKey: 'recipes', title: 'recipesTitle' as any },
    ];
    const result = applySectionContentOverrides(copy, registry, overrides);
    expect(result.faqTitle).toBe('New Faq');
    expect(result.recipesTitle).toBe('New Recipes');
  });
});
