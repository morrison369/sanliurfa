/**
 * Unit Tests — env.ts (env-validator.ts'ten farklı module)
 *
 * - validateEnv(): server-side critical (DATABASE_URL/JWT_SECRET/REDIS_URL) eksik mi
 * - getEnv(): EnvConfig snapshot, missing critical → throw
 * - env.isDev/isProd/isServer/isClient
 * - env.get(key, default) / env.getBool / env.getInt
 *
 * Tests vi.stubEnv ile process.env mock.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEnv, getEnv, env } from '../env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validateEnv', () => {
  it('tüm critical env set → valid:true', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('REDIS_URL', 'redis://x');
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('DATABASE_URL eksik → missing içerir', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('REDIS_URL', 'redis://x');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('DATABASE_URL');
  });

  it('JWT_SECRET eksik → missing içerir', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('REDIS_URL', 'redis://x');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('JWT_SECRET');
  });

  it('multiple eksik → tümü missing\'de toplanır', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('REDIS_URL', '');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(3);
  });
});

describe('getEnv', () => {
  it('tüm critical set → EnvConfig döner', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubEnv('JWT_SECRET', 'jwt-test');
    vi.stubEnv('REDIS_URL', 'redis://test');
    const config = getEnv();
    expect(config.DATABASE_URL).toBe('postgres://test');
    expect(config.JWT_SECRET).toBe('jwt-test');
    expect(config.REDIS_URL).toBe('redis://test');
  });

  it('DATABASE_URL eksik → throw', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('JWT_SECRET', 'jwt-test');
    expect(() => getEnv()).toThrow(/Missing critical/);
  });

  it('JWT_SECRET eksik → throw', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', '');
    expect(() => getEnv()).toThrow(/Missing critical/);
  });

  it('REDIS_URL boş → fallback redis://127.0.0.1:6381', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('REDIS_URL', '');
    const config = getEnv();
    expect(config.REDIS_URL).toBe('redis://127.0.0.1:6381');
  });

  it('SITE_URL fallback chain — PUBLIC_SITE_URL → SITE_URL → localhost:4321', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('PUBLIC_SITE_URL', '');
    vi.stubEnv('SITE_URL', '');
    const config = getEnv();
    expect(config.SITE_URL).toBe('http://localhost:4321');
  });

  it('SITE_URL — PUBLIC_SITE_URL en yüksek öncelik', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('PUBLIC_SITE_URL', 'https://public.example');
    vi.stubEnv('SITE_URL', 'https://server.example');
    expect(getEnv().SITE_URL).toBe('https://public.example');
  });

  it('PORT geçerli sayı → parse', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('PORT', '8080');
    expect(getEnv().PORT).toBe(8080);
  });

  it('PORT geçersiz → 4321 fallback', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('PORT', 'abc');
    expect(getEnv().PORT).toBe(4321);
  });

  it('REDIS_KEY_PREFIX default sanliurfa:', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('REDIS_KEY_PREFIX', '');
    expect(getEnv().REDIS_KEY_PREFIX).toBe('sanliurfa:');
  });

  it('NODE_ENV default development', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('NODE_ENV', '');
    expect(getEnv().NODE_ENV).toBe('development');
  });
});

describe('env helper API', () => {
  describe('isDev / isProd', () => {
    it('NODE_ENV=development → isDev true', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(env.isDev()).toBe(true);
      expect(env.isProd()).toBe(false);
    });

    it('NODE_ENV=production → isProd true', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(env.isDev()).toBe(false);
      expect(env.isProd()).toBe(true);
    });

    it('NODE_ENV boş → development default', () => {
      vi.stubEnv('NODE_ENV', '');
      expect(env.isDev()).toBe(true);
    });
  });

  describe('isServer / isClient', () => {
    it('Node.js süreçinde isServer true, isClient false', () => {
      // Vitest Node ortamında çalışır, window undefined
      expect(env.isServer()).toBe(true);
      expect(env.isClient()).toBe(false);
    });
  });

  describe('env.get', () => {
    it('env var set → değer döner', () => {
      vi.stubEnv('CUSTOM_VAR', 'hello');
      expect(env.get('CUSTOM_VAR')).toBe('hello');
    });

    it('env var yok + default verildi → default döner', () => {
      vi.stubEnv('MISSING_VAR', '');
      expect(env.get('MISSING_VAR', 'fallback')).toBe('fallback');
    });

    it('env var yok + default verilmedi → throw', () => {
      vi.stubEnv('MISSING_NO_DEFAULT', '');
      expect(() => env.get('MISSING_NO_DEFAULT')).toThrow(/Missing environment variable/);
    });
  });

  describe('env.getBool', () => {
    it("'true' → true", () => {
      vi.stubEnv('FLAG', 'true');
      expect(env.getBool('FLAG')).toBe(true);
    });

    it("'1' → true", () => {
      vi.stubEnv('FLAG', '1');
      expect(env.getBool('FLAG')).toBe(true);
    });

    it("'false' → false", () => {
      vi.stubEnv('FLAG', 'false');
      expect(env.getBool('FLAG')).toBe(false);
    });

    it("'0' → false", () => {
      vi.stubEnv('FLAG', '0');
      expect(env.getBool('FLAG')).toBe(false);
    });

    it('eksik env → default değer', () => {
      vi.stubEnv('MISSING_FLAG', '');
      expect(env.getBool('MISSING_FLAG', true)).toBe(true);
      expect(env.getBool('MISSING_FLAG', false)).toBe(false);
    });

    it('default belirtilmedi → false', () => {
      vi.stubEnv('NEW_FLAG', '');
      expect(env.getBool('NEW_FLAG')).toBe(false);
    });
  });

  describe('env.getInt', () => {
    it('numeric string → number', () => {
      vi.stubEnv('NUM', '42');
      expect(env.getInt('NUM')).toBe(42);
    });

    it('eksik → default', () => {
      vi.stubEnv('MISSING_NUM', '');
      expect(env.getInt('MISSING_NUM', 100)).toBe(100);
    });

    it('default belirtilmedi → 0', () => {
      vi.stubEnv('NEW_NUM', '');
      expect(env.getInt('NEW_NUM')).toBe(0);
    });

    it('non-numeric → NaN (parseInt davranışı)', () => {
      vi.stubEnv('BAD_NUM', 'abc');
      expect(env.getInt('BAD_NUM')).toBeNaN();
    });

    it('mixed numeric (123abc) → 123', () => {
      vi.stubEnv('MIX_NUM', '123abc');
      expect(env.getInt('MIX_NUM')).toBe(123);
    });
  });
});
