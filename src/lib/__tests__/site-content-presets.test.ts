/**
 * Unit Tests — site-content-presets.ts
 *
 * Admin-installable site content preset registry:
 * - SECTION_STYLES_BASE: shared default Tailwind class bundle
 * - SITE_CONTENT_PRESETS: 5 preset (agency-modern + service-dense + 3 section-style variants)
 * - findSitePresetById(id): preset lookup or null
 *
 * Bu helper'lar pure data + 1 lookup fonksiyonu — admin "Apply Preset" butonu
 * setting bundle döker. Preset shape değişirse anasayfa tema yönetimi kırılır.
 */

import { describe, it, expect } from 'vitest';
import {
  SECTION_STYLES_BASE,
  SITE_CONTENT_PRESETS,
  findSitePresetById,
} from '../site-content-presets';

describe('SECTION_STYLES_BASE', () => {
  it('non-empty Tailwind class bundle', () => {
    expect(Object.keys(SECTION_STYLES_BASE).length).toBeGreaterThan(50);
  });

  it('tüm değerler string', () => {
    for (const value of Object.values(SECTION_STYLES_BASE)) {
      expect(typeof value).toBe('string');
    }
  });

  it('temel section heading class kayıtlı', () => {
    expect(SECTION_STYLES_BASE.sectionHeadingClass).toContain('text-');
    expect(SECTION_STYLES_BASE.sectionHeadingClass).toContain('font-bold');
  });

  it('mvpQuickStart class grubu mevcut', () => {
    expect(SECTION_STYLES_BASE.mvpQuickStartSectionClass).toBeDefined();
    expect(SECTION_STYLES_BASE.mvpQuickStartContainerClass).toBeDefined();
    expect(SECTION_STYLES_BASE.mvpQuickStartGridClass).toBeDefined();
    expect(SECTION_STYLES_BASE.mvpQuickStartCardClass).toBeDefined();
  });

  it('liveStatus class grubu mevcut', () => {
    expect(SECTION_STYLES_BASE.liveStatusSectionClass).toBeDefined();
    expect(SECTION_STYLES_BASE.liveStatusGridClass).toBeDefined();
    expect(SECTION_STYLES_BASE.liveStatusCardClass).toBeDefined();
  });

  it('quickActions + popularCategories + districts grid var', () => {
    expect(SECTION_STYLES_BASE.quickActionsGridClass).toContain('grid');
    expect(SECTION_STYLES_BASE.popularCategoriesGridClass).toContain('grid');
    expect(SECTION_STYLES_BASE.districtsGridClass).toContain('grid');
  });

  it('trendDensity, audiencePlans bölümleri tanımlı', () => {
    expect(SECTION_STYLES_BASE.trendDensitySectionClass).toContain('py-');
    expect(SECTION_STYLES_BASE.audiencePlansSectionClass).toContain('py-');
  });
});

describe('SITE_CONTENT_PRESETS', () => {
  it('5 preset kayıtlı', () => {
    expect(SITE_CONTENT_PRESETS).toHaveLength(5);
  });

  it('tüm preset id unique', () => {
    const ids = SITE_CONTENT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tüm preset zorunlu field (id/label/description/tags/settings)', () => {
    for (const preset of SITE_CONTENT_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(Array.isArray(preset.tags)).toBe(true);
      expect(preset.settings).toBeDefined();
      expect(typeof preset.settings).toBe('object');
    }
  });

  it('tüm preset id kebab-case format', () => {
    for (const preset of SITE_CONTENT_PRESETS) {
      expect(preset.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('tüm preset settings key tanınmış prefix (homepage./header./footer.) ile başlar', () => {
    const allowedPrefixes = /^(homepage|header|footer|navigation|site|social)\./;
    for (const preset of SITE_CONTENT_PRESETS) {
      for (const settingKey of Object.keys(preset.settings)) {
        expect(settingKey).toMatch(allowedPrefixes);
      }
    }
  });

  it('agency-modern preset var ve tags ile etiketli', () => {
    const agency = SITE_CONTENT_PRESETS.find((p) => p.id === 'agency-modern');
    expect(agency).toBeDefined();
    expect(agency?.tags).toContain('landing');
  });

  it('service-dense agency-modern\'i extend eder', () => {
    const dense = SITE_CONTENT_PRESETS.find((p) => p.id === 'service-dense');
    expect(dense).toBeDefined();
    // Hero override'lı ama schema agency'den miras
    expect(dense?.settings['homepage.schema']).toBeDefined();
    expect(dense?.settings['homepage.hero']).toBeDefined();
  });

  it('3 section-style preset (minimal/agency/dense)', () => {
    const styleIds = SITE_CONTENT_PRESETS.filter((p) => p.id.startsWith('section-style-')).map((p) => p.id);
    expect(styleIds).toContain('section-style-minimal');
    expect(styleIds).toContain('section-style-agency');
    expect(styleIds).toContain('section-style-dense');
  });

  it('section-style preset\'lerin sectionStyles SECTION_STYLES_BASE\'i extend eder', () => {
    const minimal = SITE_CONTENT_PRESETS.find((p) => p.id === 'section-style-minimal');
    const styles = minimal?.settings['homepage.sectionStyles'];
    // SECTION_STYLES_BASE\'in tüm key'leri preset'te de olmalı (override edilmemiş olanlar miras)
    expect(styles).toBeDefined();
    if (styles) {
      expect(styles.sectionHeadingClass).toBe(SECTION_STYLES_BASE.sectionHeadingClass);
    }
  });

  it('section-style-agency override sectionHeadingClass farklı', () => {
    const agency = SITE_CONTENT_PRESETS.find((p) => p.id === 'section-style-agency');
    const styles = agency?.settings['homepage.sectionStyles'];
    expect(styles?.sectionHeadingClass).not.toBe(SECTION_STYLES_BASE.sectionHeadingClass);
    expect(styles?.sectionHeadingClass).toContain('font-extrabold');
  });

  it('section-style-dense override grid kompakt', () => {
    const dense = SITE_CONTENT_PRESETS.find((p) => p.id === 'section-style-dense');
    const styles = dense?.settings['homepage.sectionStyles'];
    expect(styles?.popularCategoriesGridClass).toContain('lg:grid-cols-8');
  });
});

describe('findSitePresetById', () => {
  it('mevcut id → preset döner', () => {
    const result = findSitePresetById('agency-modern');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('agency-modern');
  });

  it('mevcut olmayan id → null', () => {
    expect(findSitePresetById('non-existent')).toBeNull();
  });

  it('boş string → null', () => {
    expect(findSitePresetById('')).toBeNull();
  });

  it('case-sensitive: AGENCY-MODERN (uppercase) → null', () => {
    expect(findSitePresetById('AGENCY-MODERN')).toBeNull();
  });

  it('section-style-minimal → bulunur', () => {
    expect(findSitePresetById('section-style-minimal')).not.toBeNull();
  });

  it('null/undefined cast → null (defensive)', () => {
    // String() coerce: null → 'null', undefined → 'undefined' — bunlar id değil
    expect(findSitePresetById(null as any)).toBeNull();
    expect(findSitePresetById(undefined as any)).toBeNull();
  });
});
