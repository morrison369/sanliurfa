/**
 * Unit Tests — security/csp/index.ts CSP Builder
 *
 * - generateNonce(): 16-byte random base64 (per-request CSP nonce)
 * - buildCSP(config?): directive string from CSP_DIRECTIVES;
 *   nonce → script-src 'unsafe-inline' kaldırır + 'nonce-XXX' ekler
 * - getCSPHeaderName(reportOnly): header name (CSP veya CSP-Report-Only)
 *
 * Note: cspMiddleware ve handleCSPViolation Astro context bağımlı (mock gerekir),
 * bu test dosyasında pure builder helpers'a odaklan.
 */

import { describe, it, expect } from 'vitest';
import { generateNonce, buildCSP, getCSPHeaderName } from '../security/csp';

describe('generateNonce', () => {
  it('base64 string döner', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('16-byte (24 base64 char + padding olabilir)', () => {
    const nonce = generateNonce();
    // 16 byte → 22 base64 char + ==/= padding (24 toplam)
    expect(nonce.length).toBeGreaterThanOrEqual(22);
    expect(nonce.length).toBeLessThanOrEqual(24);
  });

  it('iki çağrı farklı nonce', () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });

  it('100 nonce unique (collision yok)', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nonces.add(generateNonce());
    }
    expect(nonces.size).toBe(100);
  });
});

describe('buildCSP', () => {
  it('default config — temel directive\'ler içerir', () => {
    const csp = buildCSP();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('script-src');
    expect(csp).toContain('style-src');
    expect(csp).toContain('img-src');
    expect(csp).toContain('font-src');
    expect(csp).toContain('connect-src');
  });

  it("object-src 'none' (modern security best practice)", () => {
    expect(buildCSP()).toContain("object-src 'none'");
  });

  it("frame-ancestors 'self' (clickjacking defense)", () => {
    expect(buildCSP()).toContain("frame-ancestors 'self'");
  });

  it("base-uri 'self' (base injection defense)", () => {
    expect(buildCSP()).toContain("base-uri 'self'");
  });

  it("form-action 'self'", () => {
    expect(buildCSP()).toContain("form-action 'self'");
  });

  it("upgrade-insecure-requests directive boş value → filter nedeniyle output'ta yok", () => {
    // Implementation: filter `values.length > 0` — boş array directive'leri output'a girmez
    expect(buildCSP()).not.toContain('upgrade-insecure-requests');
  });

  it('directive\'ler "; " ile ayrılır', () => {
    const csp = buildCSP();
    expect(csp).toContain('; ');
  });

  it('default — script-src "unsafe-inline" içerir (Astro hydration)', () => {
    expect(buildCSP()).toContain("'unsafe-inline'");
  });

  it('nonce verildi → script-src "nonce-XXX" eklenir', () => {
    const csp = buildCSP({ nonce: 'abc123' });
    expect(csp).toContain("'nonce-abc123'");
  });

  it('nonce verildi → unsafe-inline script-src\'den çıkarılır', () => {
    const csp = buildCSP({ nonce: 'xyz789' });
    // script-src kısmında unsafe-inline yok (style-src etkilenmemeli ama script-src filter)
    const scriptSrcMatch = csp.match(/script-src ([^;]+)/);
    expect(scriptSrcMatch).toBeTruthy();
    expect(scriptSrcMatch?.[1]).not.toContain('unsafe-inline');
  });

  it('reportUri verildi → "; report-uri" suffix eklenir', () => {
    const csp = buildCSP({ reportUri: '/csp-report' });
    expect(csp).toContain('; report-uri /csp-report');
  });

  it('hem nonce hem reportUri', () => {
    const csp = buildCSP({ nonce: 'n1', reportUri: '/r' });
    expect(csp).toContain("'nonce-n1'");
    expect(csp).toContain('report-uri /r');
  });

  it('directive value\'su olmayan directive output\'tan filtrelenir', () => {
    const csp = buildCSP();
    // upgrade-insecure-requests CSP_DIRECTIVES'te boş array → filter dışı
    // Bu helper'in gerçek davranışı (dokümantasyon)
    expect(csp).not.toMatch(/upgrade-insecure-requests/);
  });
});

describe('getCSPHeaderName', () => {
  it('default reportOnly=false → "Content-Security-Policy"', () => {
    expect(getCSPHeaderName()).toBe('Content-Security-Policy');
    expect(getCSPHeaderName(false)).toBe('Content-Security-Policy');
  });

  it('reportOnly=true → "Content-Security-Policy-Report-Only"', () => {
    expect(getCSPHeaderName(true)).toBe('Content-Security-Policy-Report-Only');
  });
});
