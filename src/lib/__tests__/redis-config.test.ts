/**
 * Unit Tests — cache/redis-config.ts
 *
 * - redisConfig: production-ready Redis config (env-driven)
 * - REDIS_NAMESPACES: namespace constants (session/cache/ratelimit/queue/lock/analytics)
 * - REDIS_TTL: TTL preset constants (saniye)
 * - buildRedisKey(namespace, key): keyPrefix + namespace + key
 * - parseRedisUrl(url): URL → Partial<RedisConfig>
 *
 * Note: redisConfig env-evaluated at module load time; vi.stubEnv DEĞİL,
 * import sırasındaki process.env değerlerine bağlı.
 */

import { describe, it, expect } from 'vitest';
import {
  redisConfig,
  REDIS_NAMESPACES,
  REDIS_TTL,
  buildRedisKey,
  parseRedisUrl,
} from '../cache/redis-config';

describe('redisConfig', () => {
  it('keyPrefix "sanliurfa:" hardcoded (HARD RULE #18 namespace izolasyon)', () => {
    expect(redisConfig.keyPrefix).toBe('sanliurfa:');
  });

  it('production-ready timeout/retry değerleri', () => {
    expect(redisConfig.connectTimeout).toBe(10000); // 10s connect
    expect(redisConfig.commandTimeout).toBe(5000); // 5s command
    expect(redisConfig.maxRetriesPerRequest).toBe(3);
  });

  it('lazyConnect=true (boot-time bağlanma yok)', () => {
    expect(redisConfig.lazyConnect).toBe(true);
  });

  it('enableReadyCheck=true (cluster ready)', () => {
    expect(redisConfig.enableReadyCheck).toBe(true);
  });

  it('keepAlive 30 saniye (TCP keep-alive)', () => {
    expect(redisConfig.keepAlive).toBe(30000);
  });

  it('host/port set edilmiş (env yoksa default)', () => {
    expect(typeof redisConfig.host).toBe('string');
    expect(typeof redisConfig.port).toBe('number');
    expect(redisConfig.port).toBeGreaterThan(0);
  });

  it('db number tip', () => {
    expect(typeof redisConfig.db).toBe('number');
  });
});

describe('REDIS_NAMESPACES', () => {
  it('6 namespace kayıtlı', () => {
    expect(Object.keys(REDIS_NAMESPACES)).toHaveLength(6);
  });

  it('temel namespace adları (kebab-case değil snake)', () => {
    expect(REDIS_NAMESPACES.SESSION).toBe('session');
    expect(REDIS_NAMESPACES.CACHE).toBe('cache');
    expect(REDIS_NAMESPACES.RATE_LIMIT).toBe('ratelimit');
    expect(REDIS_NAMESPACES.QUEUE).toBe('queue');
    expect(REDIS_NAMESPACES.LOCK).toBe('lock');
    expect(REDIS_NAMESPACES.ANALYTICS).toBe('analytics');
  });

  it('tüm değerler lowercase (Redis convention)', () => {
    for (const value of Object.values(REDIS_NAMESPACES)) {
      expect(value).toBe(value.toLowerCase());
    }
  });
});

describe('REDIS_TTL', () => {
  it('SESSION 7 gün', () => {
    expect(REDIS_TTL.SESSION).toBe(86400 * 7);
  });

  it('CACHE_SHORT 5 dakika', () => {
    expect(REDIS_TTL.CACHE_SHORT).toBe(300);
  });

  it('CACHE_MEDIUM 1 saat', () => {
    expect(REDIS_TTL.CACHE_MEDIUM).toBe(3600);
  });

  it('CACHE_LONG 1 gün', () => {
    expect(REDIS_TTL.CACHE_LONG).toBe(86400);
  });

  it('RATE_LIMIT 1 dakika', () => {
    expect(REDIS_TTL.RATE_LIMIT).toBe(60);
  });

  it('LOCK 30 saniye', () => {
    expect(REDIS_TTL.LOCK).toBe(30);
  });

  it('TTL\'ler hierarchical: SHORT < MEDIUM < LONG < SESSION', () => {
    expect(REDIS_TTL.CACHE_SHORT).toBeLessThan(REDIS_TTL.CACHE_MEDIUM);
    expect(REDIS_TTL.CACHE_MEDIUM).toBeLessThan(REDIS_TTL.CACHE_LONG);
    expect(REDIS_TTL.CACHE_LONG).toBeLessThan(REDIS_TTL.SESSION);
  });
});

describe('buildRedisKey', () => {
  it('keyPrefix + namespace + key birleştirir', () => {
    expect(buildRedisKey('cache', 'user:123')).toBe('sanliurfa:cache:user:123');
  });

  it('namespace REDIS_NAMESPACES sabit ile uyumlu', () => {
    expect(buildRedisKey(REDIS_NAMESPACES.SESSION, 'token-abc')).toBe('sanliurfa:session:token-abc');
  });

  it('boş key → sadece prefix + namespace + ":"', () => {
    expect(buildRedisKey('cache', '')).toBe('sanliurfa:cache:');
  });

  it('boş namespace → prefix + ":" + key', () => {
    expect(buildRedisKey('', 'mykey')).toBe('sanliurfa::mykey');
  });

  it('nested key (slash-separated)', () => {
    expect(buildRedisKey('rate-limit', 'ip:10.0.0.1/api/places')).toBe(
      'sanliurfa:rate-limit:ip:10.0.0.1/api/places',
    );
  });
});

describe('parseRedisUrl', () => {
  it('basit redis:// URL — host + port', () => {
    const cfg = parseRedisUrl('redis://localhost:6379');
    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(6379);
  });

  it('password set ediliyse password field eklenir', () => {
    const cfg = parseRedisUrl('redis://:secret@localhost:6379');
    expect(cfg.password).toBe('secret');
  });

  it('password yoksa field eklenmez (optional)', () => {
    const cfg = parseRedisUrl('redis://localhost:6379');
    expect(cfg.password).toBeUndefined();
  });

  it('port yoksa default 6379', () => {
    const cfg = parseRedisUrl('redis://localhost');
    expect(cfg.port).toBe(6379);
  });

  it('user:pass@host format', () => {
    const cfg = parseRedisUrl('redis://user:p@ssw0rd@example.com:6380');
    expect(cfg.host).toBe('example.com');
    expect(cfg.port).toBe(6380);
    expect(cfg.password).toBe('p%40ssw0rd'); // @ encoded
  });

  it('rediss:// (TLS) URL parse', () => {
    const cfg = parseRedisUrl('rediss://secure.example.com:6380');
    expect(cfg.host).toBe('secure.example.com');
    expect(cfg.port).toBe(6380);
  });

  it('invalid URL → boş object', () => {
    expect(parseRedisUrl('not a url')).toEqual({});
  });

  it('boş string → boş object', () => {
    expect(parseRedisUrl('')).toEqual({});
  });

  it('IPv4 address host', () => {
    const cfg = parseRedisUrl('redis://10.0.0.1:6380');
    expect(cfg.host).toBe('10.0.0.1');
  });
});
