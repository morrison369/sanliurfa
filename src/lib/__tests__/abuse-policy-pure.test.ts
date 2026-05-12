/**
 * Unit Tests — social/abuse-policy.ts pure helpers (rate limit policy resolution)
 *
 * - resolveTenantId (header > host subdomain > 'default')
 * - getTenantSocialPolicy (env override JSON + admin/moderator tolerance)
 * - sanitizeLimitConfig fallback (NaN/0/negative → fallback)
 *
 * NOT: enforceSocialRateLimit (DB+cache) + getUserRecentSocialAbuseCount kapsam dışı.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveTenantId, getTenantSocialPolicy } from '../social/abuse-policy';

afterEach(() => {
  vi.unstubAllEnvs();
});

const mkRequest = (headers: Record<string, string>) =>
  new Request('http://localhost/test', { headers });

describe('resolveTenantId', () => {
  it('x-tenant-id header → öncelik', () => {
    expect(resolveTenantId(mkRequest({ 'x-tenant-id': 'acme' }))).toBe('acme');
  });

  it('host subdomain → tenant ("acme.sanliurfa.com" → "acme")', () => {
    expect(resolveTenantId(mkRequest({ host: 'acme.sanliurfa.com' }))).toBe('acme');
  });

  it('host yoksa → default', () => {
    expect(resolveTenantId(mkRequest({}))).toBe('default');
  });

  it('localhost (no port) → default blacklist', () => {
    expect(resolveTenantId(mkRequest({ host: 'localhost' }))).toBe('default');
  });

  it('EDGE CASE: localhost:PORT → tenant olarak geçer (blacklist tam eşleşme, port hariç tutmaz)', () => {
    // Helper'da `subdomain && !['localhost', '127', 'www'].includes(subdomain)`
    // 'localhost:3000'.split('.')[0] === 'localhost:3000' (port dahil) → blacklist eşleşmez
    // Bu davranış dokümante edilmiş bug — prod'da custom_domain split sorunu olabilir.
    expect(resolveTenantId(mkRequest({ host: 'localhost:3000' }))).toBe('localhost:3000');
  });

  it('www subdomain → default (blacklist)', () => {
    expect(resolveTenantId(mkRequest({ host: 'www.sanliurfa.com' }))).toBe('default');
  });

  it('127 subdomain → default (blacklist)', () => {
    expect(resolveTenantId(mkRequest({ host: '127.0.0.1' }))).toBe('default');
  });

  it('header trim whitespace', () => {
    expect(resolveTenantId(mkRequest({ 'x-tenant-id': '  acme  ' }))).toBe('acme');
  });
});

describe('getTenantSocialPolicy', () => {
  it('default policy — 4 action (swipe/follow/message_write/message_read)', () => {
    const p = getTenantSocialPolicy('default');
    expect(p.swipe.windowSeconds).toBe(60);
    expect(p.follow.windowSeconds).toBe(60);
    expect(p.message_write.windowSeconds).toBe(60);
    expect(p.message_read.windowSeconds).toBe(60);
  });

  it('default limits — env yoksa swipe 120/follow 60/write 80/read 240', () => {
    const p = getTenantSocialPolicy('non-existent-tenant');
    expect(p.swipe.limit).toBeGreaterThanOrEqual(120);
    expect(p.message_read.limit).toBeGreaterThanOrEqual(240);
  });

  it('admin role → tolerance Math.max ≥ default thresholds', () => {
    const p = getTenantSocialPolicy('default', 'admin');
    expect(p.swipe.limit).toBeGreaterThanOrEqual(400);
    expect(p.follow.limit).toBeGreaterThanOrEqual(300);
    expect(p.message_read.limit).toBeGreaterThanOrEqual(600);
  });

  it('moderator role → admin gibi tolerance', () => {
    const p = getTenantSocialPolicy('default', 'moderator');
    expect(p.swipe.limit).toBeGreaterThanOrEqual(400);
  });

  it('user role → tolerance uygulanmaz', () => {
    const p = getTenantSocialPolicy('default', 'user');
    expect(p.swipe.limit).toBeLessThan(400); // sadece base
  });

  it('SOCIAL_ABUSE_TENANT_POLICY_JSON env override — invalid JSON → silent fallback', () => {
    vi.stubEnv('SOCIAL_ABUSE_TENANT_POLICY_JSON', 'not-json');
    const p = getTenantSocialPolicy('default');
    expect(p.swipe.limit).toBeGreaterThanOrEqual(120); // default
  });

  it('env override — geçerli JSON tenant policy', () => {
    vi.stubEnv(
      'SOCIAL_ABUSE_TENANT_POLICY_JSON',
      JSON.stringify({ acme: { swipe: { limit: 999, windowSeconds: 120 } } })
    );
    const p = getTenantSocialPolicy('acme');
    expect(p.swipe.limit).toBe(999);
    expect(p.swipe.windowSeconds).toBe(120);
  });

  it('sanitizeLimitConfig — windowSeconds < 10 → fallback (10s minimum)', () => {
    vi.stubEnv(
      'SOCIAL_ABUSE_TENANT_POLICY_JSON',
      JSON.stringify({ acme: { swipe: { limit: 100, windowSeconds: 5 } } })
    );
    const p = getTenantSocialPolicy('acme');
    expect(p.swipe.windowSeconds).toBeGreaterThanOrEqual(10);
  });

  it('sanitizeLimitConfig — limit 0 → fallback', () => {
    vi.stubEnv(
      'SOCIAL_ABUSE_TENANT_POLICY_JSON',
      JSON.stringify({ acme: { swipe: { limit: 0, windowSeconds: 60 } } })
    );
    const p = getTenantSocialPolicy('acme');
    expect(p.swipe.limit).toBeGreaterThanOrEqual(120); // fallback default
  });
});
