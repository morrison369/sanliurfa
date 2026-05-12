/**
 * Unit Tests — site-settings-schema.ts
 *
 * - SITE_SETTING_SCHEMAS: 11+ field schema (homepage.schema/seo/hero/heroMeta/mainCta/...)
 * - validateSiteSetting(key, value): per-section validation rules
 *   - homepage.schema: 10 string field zorunlu, baseUrl https:// ile başlamalı
 *   - homepage.seo: title/desc/canonical/ogImage/keywords; ogImage /images/ ile
 *   - generic schemas: SITE_SETTING_SCHEMAS map'inden field validation
 *
 * Note: site-setting-schemas.test.ts (Batch #230) ayrı module — Zod-based.
 * Bu test ham validate function'ı.
 */

import { describe, it, expect } from 'vitest';
import { SITE_SETTING_SCHEMAS, validateSiteSetting } from '../site-settings-schema';

describe('SITE_SETTING_SCHEMAS — registry', () => {
  it('homepage.schema kayıtlı', () => {
    expect(SITE_SETTING_SCHEMAS['homepage.schema']).toBeDefined();
  });

  it('homepage.schema 10 zorunlu field', () => {
    const fields = SITE_SETTING_SCHEMAS['homepage.schema'];
    expect(fields.length).toBe(10);
    expect(fields.every((f) => f.required)).toBe(true);
  });

  it('homepage.seo — title/description/canonical/ogImage/keywords', () => {
    const fields = SITE_SETTING_SCHEMAS['homepage.seo'];
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('title');
    expect(keys).toContain('description');
    expect(keys).toContain('canonical');
    expect(keys).toContain('ogImage');
    expect(keys).toContain('keywords');
  });

  it('keywords field type "array"', () => {
    const fields = SITE_SETTING_SCHEMAS['homepage.seo'];
    const kw = fields.find((f) => f.key === 'keywords');
    expect(kw?.type).toBe('array');
  });

  it('homepage.heroMeta 30+ field (CSS class registry)', () => {
    expect(SITE_SETTING_SCHEMAS['homepage.heroMeta'].length).toBeGreaterThan(30);
  });
});

describe('validateSiteSetting — homepage.schema', () => {
  it('non-object → error', () => {
    const result = validateSiteSetting('homepage.schema', 'not-object');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('JSON object');
  });

  it('null → error', () => {
    expect(validateSiteSetting('homepage.schema', null).ok).toBe(false);
  });

  it('eksik field → required error', () => {
    const result = validateSiteSetting('homepage.schema', { siteName: 'X' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('zorunlu');
  });

  it('boş string field → zorunlu error', () => {
    const fullPayload: any = {
      siteName: '', alternateName: 'X', baseUrl: 'https://x.com',
      searchPathTemplate: '/?q=', organizationId: '#org',
      webpageId: '#wp', cityName: 'X', trendingListName: 'X',
      servicesListName: 'X', webpageName: 'X',
    };
    expect(validateSiteSetting('homepage.schema', fullPayload).ok).toBe(false);
  });

  it('baseUrl http:// → baseUrl https:// error', () => {
    const payload: any = {
      siteName: 'X', alternateName: 'X', baseUrl: 'http://example.com',
      searchPathTemplate: '/?q=', organizationId: '#org',
      webpageId: '#wp', cityName: 'X', trendingListName: 'X',
      servicesListName: 'X', webpageName: 'X',
    };
    const result = validateSiteSetting('homepage.schema', payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('https://');
  });

  it('valid full payload → ok:true', () => {
    const payload: any = {
      siteName: 'Sanliurfa.com', alternateName: 'X', baseUrl: 'https://sanliurfa.com',
      searchPathTemplate: '/arama?q=', organizationId: '/#org',
      webpageId: '/#wp', cityName: 'Şanlıurfa',
      trendingListName: 'Trending', servicesListName: 'Services',
      webpageName: 'Şanlıurfa Şehir Rehberi',
    };
    expect(validateSiteSetting('homepage.schema', payload).ok).toBe(true);
  });
});

describe('validateSiteSetting — bilinmeyen key', () => {
  it('non-object → error', () => {
    expect(validateSiteSetting('any.key', 'string').ok).toBe(false);
  });

  it('valid object — schema yoksa "tanımsız ayar anahtarı" error', () => {
    const result = validateSiteSetting('completely.unknown.key', { x: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('tanımsız');
  });
});

describe('validateSiteSetting — generic schema validation', () => {
  it('homepage.seo — eksik title → error', () => {
    const result = validateSiteSetting('homepage.seo', {
      description: 'd', canonical: '/', ogImage: '/img.jpg', keywords: ['x'],
    });
    expect(result.ok).toBe(false);
  });

  it('homepage.seo — keywords array değil → type error', () => {
    const result = validateSiteSetting('homepage.seo', {
      title: 't', description: 'd', canonical: '/',
      ogImage: '/img.jpg', keywords: 'not-array',
    });
    expect(result.ok).toBe(false);
  });

  it('homepage.hero — minimum required field', () => {
    const result = validateSiteSetting('homepage.hero', {});
    expect(result.ok).toBe(false);
  });
});
