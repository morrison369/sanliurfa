/**
 * Unit Tests — api/api-versioning.ts
 *
 * - getApiVersion(request): Accept-Version header → 'v1' | 'v2'
 * - getVersionFromPath(path): URL path → 'v1' | 'v2'
 * - API_VERSIONS: version metadata registry
 *
 * Note: tek pure helper module, hızlı kapsama.
 */

import { describe, it, expect } from 'vitest';
import { getApiVersion, getVersionFromPath, API_VERSIONS } from '../api/api-versioning';

describe('getApiVersion — Accept-Version header parser', () => {
  it('Accept-Version "v2" → v2', () => {
    const req = new Request('https://x.com/api', { headers: { 'accept-version': 'v2' } });
    expect(getApiVersion(req)).toBe('v2');
  });

  it('Accept-Version "v1" → v1', () => {
    const req = new Request('https://x.com/api', { headers: { 'accept-version': 'v1' } });
    expect(getApiVersion(req)).toBe('v1');
  });

  it('Accept-Version yok → v1 default', () => {
    const req = new Request('https://x.com/api');
    expect(getApiVersion(req)).toBe('v1');
  });

  it('Accept-Version "v3" (bilinmeyen) → v1 default', () => {
    const req = new Request('https://x.com/api', { headers: { 'accept-version': 'v3' } });
    expect(getApiVersion(req)).toBe('v1');
  });

  it('case-sensitive: "V2" (büyük harf) → v1 default', () => {
    const req = new Request('https://x.com/api', { headers: { 'accept-version': 'V2' } });
    expect(getApiVersion(req)).toBe('v1');
  });

  it('boş Accept-Version → v1 default', () => {
    const req = new Request('https://x.com/api', { headers: { 'accept-version': '' } });
    expect(getApiVersion(req)).toBe('v1');
  });
});

describe('getVersionFromPath', () => {
  it('/api/v2/places → v2', () => {
    expect(getVersionFromPath('/api/v2/places')).toBe('v2');
  });

  it('/api/v1/places → v1 (default)', () => {
    expect(getVersionFromPath('/api/v1/places')).toBe('v1');
  });

  it('/api/places (versioning yok) → v1 default', () => {
    expect(getVersionFromPath('/api/places')).toBe('v1');
  });

  it('/api/v2/users/123/profile → v2 (nested path)', () => {
    expect(getVersionFromPath('/api/v2/users/123/profile')).toBe('v2');
  });

  it('case-sensitive: /api/V2/x → v1 default', () => {
    expect(getVersionFromPath('/api/V2/x')).toBe('v1');
  });

  it('boş path → v1', () => {
    expect(getVersionFromPath('')).toBe('v1');
  });

  it('full URL içinde /api/v2/ → v2', () => {
    expect(getVersionFromPath('https://x.com/api/v2/places?q=test')).toBe('v2');
  });

  it('/api/v22/x — yanlış pozitif yok (substring değil exact match)', () => {
    // Implementation: includes('/api/v2/') — '/api/v22/' başka bir yer; ama '/api/v2' substring olarak eşleşmez
    // çünkü /api/v22/ → /api/v22 → /api/v2 substring zaten match olur (/api/v2/ trailing slash önemli)
    // Test gerçek davranışı dökümante eder
    expect(getVersionFromPath('/api/v22/x')).toBe('v1'); // /api/v22/ ≠ /api/v2/ (slash sonu farklı)
  });
});

describe('API_VERSIONS — registry', () => {
  it('v1 + v2 kayıtlı', () => {
    expect(API_VERSIONS.v1).toBeDefined();
    expect(API_VERSIONS.v2).toBeDefined();
  });

  it('v1 description "Stable API"', () => {
    expect(API_VERSIONS.v1.description).toBe('Stable API');
  });

  it('v2 description "Next generation API (future)"', () => {
    expect(API_VERSIONS.v2.description).toContain('Next generation');
  });

  it('hiçbir version henüz deprecated değil', () => {
    expect(API_VERSIONS.v1.deprecated).toBe(false);
    expect(API_VERSIONS.v2.deprecated).toBe(false);
  });

  it('2 version kayıtlı (registry size)', () => {
    expect(Object.keys(API_VERSIONS)).toHaveLength(2);
  });
});
