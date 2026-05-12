/**
 * Unit Tests — 3 küçük API stub module BULK
 *
 * - api/marketplace.ts: APIMarketplace stub
 * - api/versioning.ts: APIVersioning stub (sunset 90 gün)
 * - api/api-legacy.ts: applyLegacyHeaders + legacyJsonHeaders + LEGACY_SUNSET
 */

import { describe, it, expect } from 'vitest';
import { APIMarketplace, apiMarketplace } from '../api/marketplace';
import { APIVersioning, apiVersioning } from '../api/versioning';
import { LEGACY_SUNSET, applyLegacyHeaders, legacyJsonHeaders } from '../api/api-legacy';

describe('APIMarketplace stub', () => {
  it('register — id auto-generated (12 hex char)', () => {
    const m = new APIMarketplace();
    const product = m.register({ name: 'A', description: 'd', price: 10, endpoint: '/x' });
    expect(product.id).toMatch(/^[0-9a-f]{12}$/);
    expect(product.name).toBe('A');
  });

  it('register — input field preserve', () => {
    const m = new APIMarketplace();
    const product = m.register({ name: 'X', description: 'D', price: 99, endpoint: '/api/x' });
    expect(product.price).toBe(99);
    expect(product.endpoint).toBe('/api/x');
  });

  it('list — registered products', () => {
    const m = new APIMarketplace();
    m.register({ name: 'P1', description: 'd', price: 1, endpoint: '/p1' });
    m.register({ name: 'P2', description: 'd', price: 2, endpoint: '/p2' });
    expect(m.list()).toHaveLength(2);
  });

  it('get — bilinmeyen → undefined', () => {
    expect(new APIMarketplace().get('non-existent')).toBeUndefined();
  });

  it('get — registered → product', () => {
    const m = new APIMarketplace();
    const p = m.register({ name: 'X', description: 'd', price: 1, endpoint: '/x' });
    expect(m.get(p.id)?.name).toBe('X');
  });

  it('singleton apiMarketplace exported', () => {
    expect(apiMarketplace).toBeInstanceOf(APIMarketplace);
  });
});

describe('APIVersioning stub', () => {
  it('register — version + deprecated false default', () => {
    const v = new APIVersioning();
    const ver = v.register('v1');
    expect(ver.version).toBe('v1');
    expect(ver.deprecated).toBe(false);
    expect(ver.sunsetDate).toBeUndefined();
  });

  it('register — deprecated:true → sunsetDate +90 gün', () => {
    const v = new APIVersioning();
    const before = Date.now();
    const ver = v.register('v0-old', true);
    expect(ver.deprecated).toBe(true);
    const expectedSunset = before + 90 * 24 * 60 * 60 * 1000;
    expect(ver.sunsetDate?.getTime()).toBeGreaterThanOrEqual(expectedSunset - 1000);
    expect(ver.sunsetDate?.getTime()).toBeLessThanOrEqual(expectedSunset + 1000);
  });

  it('get — bilinmeyen → undefined', () => {
    expect(new APIVersioning().get('non-existent')).toBeUndefined();
  });

  it('get — registered version', () => {
    const v = new APIVersioning();
    v.register('v3');
    expect(v.get('v3')?.version).toBe('v3');
  });

  it('isDeprecated — true/false', () => {
    const v = new APIVersioning();
    v.register('current');
    v.register('legacy', true);
    expect(v.isDeprecated('current')).toBe(false);
    expect(v.isDeprecated('legacy')).toBe(true);
  });

  it('isDeprecated — bilinmeyen → false (?? false)', () => {
    expect(new APIVersioning().isDeprecated('non-existent')).toBe(false);
  });

  it('singleton apiVersioning exported', () => {
    expect(apiVersioning).toBeInstanceOf(APIVersioning);
  });
});

describe('api-legacy headers', () => {
  it('LEGACY_SUNSET = "Tue, 30 Sep 2026 23:59:59 GMT"', () => {
    expect(LEGACY_SUNSET).toBe('Tue, 30 Sep 2026 23:59:59 GMT');
  });

  it('applyLegacyHeaders — Deprecation/Sunset/Link headers set', () => {
    const response = new Response('{}');
    const result = applyLegacyHeaders(response);
    expect(result.headers.get('Deprecation')).toBe('true');
    expect(result.headers.get('Sunset')).toBe(LEGACY_SUNSET);
    expect(result.headers.get('Link')).toContain('deprecation');
  });

  it('applyLegacyHeaders — same response döner (mutate, not clone)', () => {
    const response = new Response('{}');
    expect(applyLegacyHeaders(response)).toBe(response);
  });

  it('legacyJsonHeaders — Content-Type default application/json + 3 deprecation header', () => {
    const headers = legacyJsonHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Deprecation']).toBe('true');
    expect(headers['Sunset']).toBe(LEGACY_SUNSET);
    expect(headers['Link']).toContain('deprecation');
  });

  it('legacyJsonHeaders — custom contentType override', () => {
    const headers = legacyJsonHeaders('text/csv');
    expect(headers['Content-Type']).toBe('text/csv');
  });
});
