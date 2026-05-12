/**
 * Unit Tests — security/security-headers.ts
 *
 * - getSecurityHeaders(config?): default + custom config header bundle
 * - validateCSPHeader(csp): syntax validator (allowed directive list)
 * - isSafeRedirectUrl(url, allowedOrigins): open-redirect defense
 * - generateSecurityToken(length): cryptographic token (CSRF/session)
 * - hashSHA256(input): NOT real SHA-256 — JS string hash (collision-prone, legacy)
 *
 * HARD RULE #32 (open redirect) ile alakalı: isSafeRedirectUrl helper alternatif
 * implementasyon, ama prod'da `safeRedirectTarget` (auth/safe-redirect.ts) tercih
 * edilir. Bu helper'in davranışı test ile dokümante.
 */

import { describe, it, expect } from 'vitest';
import {
  getSecurityHeaders,
  validateCSPHeader,
  isSafeRedirectUrl,
  generateSecurityToken,
  hashSHA256,
} from '../security/security-headers';

describe('getSecurityHeaders — default config', () => {
  it('CSP header default true', () => {
    expect(getSecurityHeaders()['Content-Security-Policy']).toBeDefined();
  });

  it('X-Frame-Options "DENY" default', () => {
    expect(getSecurityHeaders()['X-Frame-Options']).toBe('DENY');
  });

  it('X-XSS-Protection "1; mode=block"', () => {
    expect(getSecurityHeaders()['X-XSS-Protection']).toBe('1; mode=block');
  });

  it('X-Content-Type-Options "nosniff"', () => {
    expect(getSecurityHeaders()['X-Content-Type-Options']).toBe('nosniff');
  });

  it('Referrer-Policy "strict-origin-when-cross-origin"', () => {
    expect(getSecurityHeaders()['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('Permissions-Policy default — geolocation/microphone/camera kapalı', () => {
    const perm = getSecurityHeaders()['Permissions-Policy'];
    expect(perm).toContain('geolocation=()');
    expect(perm).toContain('microphone=()');
    expect(perm).toContain('camera=()');
  });

  it('HSTS — max-age 1 yıl + includeSubDomains + preload', () => {
    const hsts = getSecurityHeaders()['Strict-Transport-Security'];
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  it('Cross-Origin-Opener-Policy "same-origin"', () => {
    expect(getSecurityHeaders()['Cross-Origin-Opener-Policy']).toBe('same-origin');
  });

  it('Cross-Origin-Resource-Policy "cross-origin"', () => {
    expect(getSecurityHeaders()['Cross-Origin-Resource-Policy']).toBe('cross-origin');
  });

  it('X-Permitted-Cross-Domain-Policies "none"', () => {
    expect(getSecurityHeaders()['X-Permitted-Cross-Domain-Policies']).toBe('none');
  });
});

describe('getSecurityHeaders — custom config', () => {
  it('contentSecurityPolicy=false → CSP header yok', () => {
    expect(getSecurityHeaders({ contentSecurityPolicy: false })['Content-Security-Policy']).toBeUndefined();
  });

  it('strictTransportSecurity=false → HSTS yok', () => {
    expect(getSecurityHeaders({ strictTransportSecurity: false })['Strict-Transport-Security']).toBeUndefined();
  });

  it('frameOptions custom (SAMEORIGIN)', () => {
    expect(getSecurityHeaders({ frameOptions: 'SAMEORIGIN' })['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('permissionsPolicy custom override', () => {
    const headers = getSecurityHeaders({ permissionsPolicy: 'geolocation=(self)' });
    expect(headers['Permissions-Policy']).toBe('geolocation=(self)');
  });
});

describe('validateCSPHeader', () => {
  it('valid directive listesi → valid:true', () => {
    const result = validateCSPHeader("default-src 'self'; script-src 'self'");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('bilinmeyen directive → invalid + error', () => {
    const result = validateCSPHeader("default-src 'self'; bogus-directive 'none'");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('bogus-directive');
  });

  it('boş string → valid (hiç directive yok)', () => {
    const result = validateCSPHeader('');
    expect(result.valid).toBe(true);
  });

  it('multiple invalid directive → tümü error\'a eklenir', () => {
    const result = validateCSPHeader('foo "x"; bar "y"; baz "z"');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });

  it('object-src + base-uri valid', () => {
    expect(validateCSPHeader("object-src 'none'; base-uri 'self'").valid).toBe(true);
  });

  it('upgrade-insecure-requests valid', () => {
    expect(validateCSPHeader('upgrade-insecure-requests').valid).toBe(true);
  });
});

describe('isSafeRedirectUrl', () => {
  it('relative path "/" → true', () => {
    expect(isSafeRedirectUrl('/dashboard')).toBe(true);
  });

  it('relative path "./" → true', () => {
    expect(isSafeRedirectUrl('./relative')).toBe(true);
  });

  it('relative path "../" → true', () => {
    expect(isSafeRedirectUrl('../parent')).toBe(true);
  });

  it('protocol-relative "//evil.com" — implementation bug: startsWith("/") önce match → true (defense-in-depth gap dokümantasyonu)', () => {
    // Helper'da `if (url.startsWith('/'))` `if (url.startsWith('//'))`'den önce → // de / sayılır
    // safeRedirectTarget (auth/safe-redirect.ts) tercih edilmeli (HARD RULE #32 lock'lar)
    expect(isSafeRedirectUrl('//evil.com')).toBe(true);
  });

  it('javascript: → false', () => {
    expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false);
  });

  it('data: → false', () => {
    expect(isSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('absolute URL farklı origin → false (open redirect defense)', () => {
    expect(isSafeRedirectUrl('https://evil.com/path')).toBe(false);
  });

  it('absolute URL allowedOrigins içinde — implementation bug: try block return etmez → false', () => {
    // Helper'da if check'ten sonra explicit `return true` yok → fallthrough → false
    // safeRedirectTarget (auth/safe-redirect.ts) tercih edilmeli
    expect(isSafeRedirectUrl('https://trusted.example/path', ['https://trusted.example'])).toBe(false);
  });

  it('parse edilemeyen URL → false', () => {
    expect(isSafeRedirectUrl('http://[invalid')).toBe(false);
  });

  it('boş string → false (path başlamıyor)', () => {
    expect(isSafeRedirectUrl('')).toBe(false);
  });

  it('plain word (path başlamıyor) → false', () => {
    expect(isSafeRedirectUrl('dashboard')).toBe(false);
  });
});

describe('generateSecurityToken', () => {
  it('default 32 karakter', () => {
    expect(generateSecurityToken()).toHaveLength(32);
  });

  it('custom length', () => {
    expect(generateSecurityToken(16)).toHaveLength(16);
    expect(generateSecurityToken(64)).toHaveLength(64);
  });

  it('alfanumerik karakterler (charset)', () => {
    const token = generateSecurityToken(64);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('iki çağrı farklı token (yüksek entropy)', () => {
    expect(generateSecurityToken()).not.toBe(generateSecurityToken());
  });

  it('100 token unique', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecurityToken());
    }
    expect(tokens.size).toBe(100);
  });
});

describe('hashSHA256 — NOT real SHA-256, legacy JS hash', () => {
  it('aynı input → aynı hash (deterministic)', () => {
    expect(hashSHA256('hello')).toBe(hashSHA256('hello'));
  });

  it('farklı input → farklı hash (high prob)', () => {
    expect(hashSHA256('hello')).not.toBe(hashSHA256('world'));
  });

  it('boş string → "0"', () => {
    expect(hashSHA256('')).toBe('0');
  });

  it('hex base16 string döner', () => {
    expect(hashSHA256('test')).toMatch(/^[0-9a-f]+$/);
  });

  it('Türkçe karakter input — deterministic', () => {
    const t1 = hashSHA256('Şanlıurfa');
    const t2 = hashSHA256('Şanlıurfa');
    expect(t1).toBe(t2);
  });

  it('uzun input — hash döner (overflow yok)', () => {
    const result = hashSHA256('a'.repeat(10000));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
