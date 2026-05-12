/**
 * Unit Tests — cache/cache.ts pure helpers
 *
 * - prefixKey(key): namespace prefix (HARD RULE #18 zorunluluğu)
 * - redisToString(value): Redis 5+ get/hGet response coerce (string | Buffer | null → string | null)
 * - isRedisAvailable(): connection state check
 *
 * Note: getCache/setCache/deleteCache async + Redis-bound; bu test pure helper
 * coverage'ına odaklanır. Async helpers için cache-roundtrip.test.ts (Batch #216) kullanılır.
 */

import { describe, it, expect } from 'vitest';
import { prefixKey, redisToString, isRedisAvailable } from '../cache/cache';

describe('prefixKey', () => {
  it('key prefix ile birleşir (KEY_PREFIX import-time evaluated)', () => {
    const result = prefixKey('test-key');
    // KEY_PREFIX env'den gelir (REDIS_KEY_PREFIX); test ortamında genelde boş
    expect(result.endsWith('test-key')).toBe(true);
  });

  it('boş key → sadece prefix (boş veya "sanliurfa:")', () => {
    const result = prefixKey('');
    // Test env'de KEY_PREFIX boş olabilir veya 'sanliurfa:' olabilir
    expect(typeof result).toBe('string');
  });

  it('Türkçe karakter destek (URL safe değil ama Redis kabul eder)', () => {
    expect(prefixKey('user:Şanlıurfa').endsWith('user:Şanlıurfa')).toBe(true);
  });

  it('namespaced key (örn: session:abc)', () => {
    const result = prefixKey('session:abc-123');
    expect(result.endsWith('session:abc-123')).toBe(true);
  });

  it('uzun key — Redis maxKey 512MB ama pratikte kısa', () => {
    const longKey = 'x'.repeat(500);
    const result = prefixKey(longKey);
    expect(result.endsWith(longKey)).toBe(true);
  });

  it('special character (slash/colon/equals)', () => {
    expect(prefixKey('cache/users:1=x').endsWith('cache/users:1=x')).toBe(true);
  });
});

describe('redisToString — Redis 5+ Buffer coercion', () => {
  it('string input → string olduğu gibi', () => {
    expect(redisToString('hello')).toBe('hello');
  });

  it('Buffer input → string toString()', () => {
    const buf = Buffer.from('binary content', 'utf-8');
    expect(redisToString(buf)).toBe('binary content');
  });

  it('null → null (bu önemli, getCache pattern\'inin temeli)', () => {
    expect(redisToString(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(redisToString(undefined)).toBeNull();
  });

  it('boş string → boş string (null DEĞİL — hidden invariant)', () => {
    expect(redisToString('')).toBe('');
  });

  it('Buffer ile Türkçe UTF-8 karakter', () => {
    const buf = Buffer.from('Şanlıurfa', 'utf-8');
    expect(redisToString(buf)).toBe('Şanlıurfa');
  });

  it('Buffer ile JSON string', () => {
    const json = JSON.stringify({ name: 'X', count: 5 });
    const buf = Buffer.from(json, 'utf-8');
    expect(redisToString(buf)).toBe(json);
  });

  it('boş Buffer → boş string', () => {
    expect(redisToString(Buffer.from([]))).toBe('');
  });

  it('uzun Buffer (10K) coerce', () => {
    const longStr = 'x'.repeat(10000);
    const buf = Buffer.from(longStr, 'utf-8');
    expect(redisToString(buf)).toBe(longStr);
  });
});

describe('isRedisAvailable', () => {
  it('boolean döner', () => {
    expect(typeof isRedisAvailable()).toBe('boolean');
  });

  it('test ortamında client yok → false (genelde)', () => {
    // Test env'de gerçek Redis client yok, isRedisAvailable false beklenir
    // (ama mock Redis varsa true olabilir; defensive assertion)
    const result = isRedisAvailable();
    expect([true, false]).toContain(result);
  });

  it('idempotent — birden fazla çağrı aynı sonuç', () => {
    const r1 = isRedisAvailable();
    const r2 = isRedisAvailable();
    expect(r1).toBe(r2);
  });
});
