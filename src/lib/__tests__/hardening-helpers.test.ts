/**
 * Unit Tests — security/hardening.ts pure helpers
 *
 * - getProductionSecurityConfig(): production hardening config snapshot
 * - buildCSPHeader(csp): CSP directive string builder (camelCase → kebab-case)
 *
 * Note: runSecurityAudit (DB-bound) ve securityHeadersMiddleware (Astro context)
 * bu dosyada yok.
 */

import { describe, it, expect } from 'vitest';
import { getProductionSecurityConfig, buildCSPHeader } from '../security/hardening';

describe('getProductionSecurityConfig', () => {
  it('config snapshot — 5 ana grup (headers/csp/cors/rateLimits/session)', () => {
    const config = getProductionSecurityConfig();
    expect(config.headers).toBeDefined();
    expect(config.csp).toBeDefined();
    expect(config.cors).toBeDefined();
    expect(config.rateLimits).toBeDefined();
    expect(config.session).toBeDefined();
  });

  describe('headers', () => {
    it('X-Frame-Options "DENY"', () => {
      expect(getProductionSecurityConfig().headers['X-Frame-Options']).toBe('DENY');
    });

    it('HSTS — max-age 1 yıl + includeSubDomains + preload', () => {
      const hsts = getProductionSecurityConfig().headers['Strict-Transport-Security'];
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('Permissions-Policy — geo (self), camera/mic kapalı + interest-cohort kapalı (FLoC opt-out)', () => {
      const perm = getProductionSecurityConfig().headers['Permissions-Policy'];
      expect(perm).toContain('camera=()');
      expect(perm).toContain('microphone=()');
      expect(perm).toContain('geolocation=(self)');
      expect(perm).toContain('interest-cohort=()');
    });

    it('Referrer-Policy "strict-origin-when-cross-origin"', () => {
      expect(getProductionSecurityConfig().headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('csp', () => {
    it("defaultSrc 'self'", () => {
      expect(getProductionSecurityConfig().csp.defaultSrc).toEqual(["'self'"]);
    });

    it("frameSrc 'none' (clickjacking defense)", () => {
      expect(getProductionSecurityConfig().csp.frameSrc).toEqual(["'none'"]);
    });

    it('upgradeInsecureRequests true (production)', () => {
      expect(getProductionSecurityConfig().csp.upgradeInsecureRequests).toBe(true);
    });

    it('connectSrc — sanliurfa.com/api dahil', () => {
      expect(getProductionSecurityConfig().csp.connectSrc).toContain('https://sanliurfa.com/api');
    });
  });

  describe('cors', () => {
    it('origins — sanliurfa.com (single)', () => {
      expect(getProductionSecurityConfig().cors.origins).toEqual(['https://sanliurfa.com']);
    });

    it('methods — GET/POST/PUT/DELETE/OPTIONS', () => {
      expect(getProductionSecurityConfig().cors.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    it('credentials true (cookie auth)', () => {
      expect(getProductionSecurityConfig().cors.credentials).toBe(true);
    });

    it('maxAge 86400 (24 saat preflight cache)', () => {
      expect(getProductionSecurityConfig().cors.maxAge).toBe(86400);
    });
  });

  describe('rateLimits', () => {
    it('windowMs 15 dakika', () => {
      expect(getProductionSecurityConfig().rateLimits.windowMs).toBe(15 * 60 * 1000);
    });

    it('maxRequests 100 / window', () => {
      expect(getProductionSecurityConfig().rateLimits.maxRequests).toBe(100);
    });
  });

  describe('session', () => {
    it('maxAge 7 gün', () => {
      expect(getProductionSecurityConfig().session.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('httpOnly + secure + sameSite "strict" + rolling', () => {
      const session = getProductionSecurityConfig().session;
      expect(session.httpOnly).toBe(true);
      expect(session.secure).toBe(true);
      expect(session.sameSite).toBe('strict');
      expect(session.rolling).toBe(true);
    });
  });
});

describe('buildCSPHeader', () => {
  it('boş array directive — output\'tan filtrelenir', () => {
    const csp = buildCSPHeader({
      defaultSrc: [],
      scriptSrc: [],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: false,
    });
    expect(csp).toBe('');
  });

  it('default-src directive', () => {
    const csp = buildCSPHeader({
      defaultSrc: ["'self'"],
      scriptSrc: [],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: false,
    });
    expect(csp).toBe("default-src 'self'");
  });

  it('multiple directive — "; " ile birleşir', () => {
    const csp = buildCSPHeader({
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: false,
    });
    expect(csp).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'");
  });

  it('upgradeInsecureRequests=true → directive eklenir (value yok)', () => {
    const csp = buildCSPHeader({
      defaultSrc: [],
      scriptSrc: [],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: true,
    });
    expect(csp).toBe('upgrade-insecure-requests');
  });

  it('camelCase → kebab-case (defaultSrc → default-src)', () => {
    const csp = buildCSPHeader({
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: false,
    });
    expect(csp).toContain('default-src');
    expect(csp).toContain('script-src');
    expect(csp).not.toContain('defaultSrc');
  });

  it('production config end-to-end build', () => {
    const cfg = getProductionSecurityConfig();
    const csp = buildCSPHeader(cfg.csp);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('scriptSrc çoklu source space ile birleşir', () => {
    const csp = buildCSPHeader({
      defaultSrc: [],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      frameSrc: [],
      upgradeInsecureRequests: false,
    });
    expect(csp).toBe("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });
});
