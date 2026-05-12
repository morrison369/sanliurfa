/**
 * Unit Tests — env-validator
 *
 * Production startup'ta required env var'ları kontrol eden helper.
 * validateEnv() boot-time'da çağrılır; eksik env varsa errors döner.
 *
 * Tests vi.stubEnv ile process.env'i mock'lar — gerçek env'i bozmaz.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEnv, getEnv } from '../env-validator';

describe('validateEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns valid=true when all required env vars present', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-1234567890');
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid=false with error when DATABASE_URL missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('JWT_SECRET', 'secret');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required env var: DATABASE_URL');
  });

  it('returns valid=false with error when SUPABASE_URL missing', () => {
    vi.stubEnv('DATABASE_URL', 'pg://x');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('JWT_SECRET', 'secret');
    const result = validateEnv();
    expect(result.errors).toContain('Missing required env var: SUPABASE_URL');
  });

  it('returns valid=false with error when JWT_SECRET missing', () => {
    vi.stubEnv('DATABASE_URL', 'pg://x');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('JWT_SECRET', '');
    const result = validateEnv();
    expect(result.errors).toContain('Missing required env var: JWT_SECRET');
  });

  it('reports multiple missing env vars', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('JWT_SECRET', '');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('error messages prefix consistent: "Missing required env var: <KEY>"', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('JWT_SECRET', '');
    const result = validateEnv();
    for (const err of result.errors) {
      expect(err).toMatch(/^Missing required env var: \w+$/);
    }
  });

  it('result shape: { valid: boolean, errors: string[] }', () => {
    const result = validateEnv();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('getEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns env var value when present', () => {
    vi.stubEnv('CUSTOM_TEST_VAR', 'custom-value');
    expect(getEnv('CUSTOM_TEST_VAR')).toBe('custom-value');
  });

  it('returns default value when env var missing', () => {
    vi.stubEnv('MISSING_VAR_X', '');
    expect(getEnv('MISSING_VAR_X', 'default-x')).toBe('default-x');
  });

  it('returns undefined when missing and no default', () => {
    vi.stubEnv('MISSING_VAR_Y', '');
    expect(getEnv('MISSING_VAR_Y')).toBeUndefined();
  });

  it('env var value takes precedence over default', () => {
    vi.stubEnv('PRIORITY_TEST', 'env-value');
    expect(getEnv('PRIORITY_TEST', 'default-fallback')).toBe('env-value');
  });

  it('empty string env var → falls back to default', () => {
    vi.stubEnv('EMPTY_TEST', '');
    expect(getEnv('EMPTY_TEST', 'default')).toBe('default');
  });
});
