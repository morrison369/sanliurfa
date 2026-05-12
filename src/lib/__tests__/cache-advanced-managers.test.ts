/**
 * Unit Tests - cache/advanced.ts AdvancedCacheManager + constants
 *
 * - CacheNamespaces / CacheTags constants
 * - AdvancedCacheManager.getStats / resetStats / updateHitRate (private via stats access)
 * - cache get/set/delete with vi.mock redis (sGet/sSet/sDel/sAdd/sRem/sMembers/scan/del/setEx)
 *
 * vi.mock cache module (parent) - getRedisClient ile in-memory redis fake.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory redis fake (key-value store)
const fakeRedisStore = new Map<string, string>();
const fakeRedisSets = new Map<string, Set<string>>();

vi.mock('../cache/cache', () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    get: vi.fn(async (k: string) => fakeRedisStore.get(k) ?? null),
    setEx: vi.fn(async (k: string, _ttl: number, v: string) => {
      fakeRedisStore.set(k, v);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const k of keys) {
        if (fakeRedisStore.delete(k)) count++;
      }
      return count;
    }),
    sAdd: vi.fn(async (k: string, ...members: string[]) => {
      const set = fakeRedisSets.get(k) || new Set();
      for (const m of members) set.add(m);
      fakeRedisSets.set(k, set);
      return members.length;
    }),
    sRem: vi.fn(async (k: string, ...members: string[]) => {
      const set = fakeRedisSets.get(k);
      if (!set) return 0;
      let count = 0;
      for (const m of members) {
        if (set.delete(m)) count++;
      }
      return count;
    }),
    sMembers: vi.fn(async (k: string) => {
      return Array.from(fakeRedisSets.get(k) || []);
    }),
    scan: vi.fn(async (_cursor: number, _opts: any) => ({ cursor: 0, keys: [] })),
  }),
}));

import {
  CacheNamespaces,
  CacheTags,
  advancedCache,
  cacheQuery,
  cachePage,
} from '../cache/advanced';

beforeEach(() => {
  fakeRedisStore.clear();
  fakeRedisSets.clear();
  advancedCache.resetStats();
});

describe('CacheNamespaces / CacheTags constants', () => {
  it('CacheNamespaces - 8 namespace key tanimli', () => {
    expect(Object.keys(CacheNamespaces).sort()).toEqual([
      'ANALYTICS', 'BLOG', 'PLACES', 'RATE_LIMIT', 'REVIEWS', 'SEARCH', 'SESSIONS', 'USERS',
    ]);
  });

  it('CacheTags - 8 tag tanimli', () => {
    expect(Object.keys(CacheTags).length).toBe(8);
    expect(CacheTags.PLACE_LIST).toBe('place:list');
    expect(CacheTags.HOME_PAGE).toBe('page:home');
  });
});

describe('AdvancedCacheManager.getStats / resetStats', () => {
  it('initial stats - 0 hits / 0 misses / 0 hitRate / 0 evictions', () => {
    const s = advancedCache.getStats();
    expect(s.hits).toBe(0);
    expect(s.misses).toBe(0);
    expect(s.hitRate).toBe(0);
    expect(s.evictions).toBe(0);
  });

  it('resetStats - tum sayaci sifirlar', () => {
    advancedCache.resetStats();
    expect(advancedCache.getStats().hits).toBe(0);
  });

  it('cache miss - misses counter artar', async () => {
    await advancedCache.get('test', 'non-existent-key');
    expect(advancedCache.getStats().misses).toBe(1);
  });

  it('cache set then get - hits counter artar', async () => {
    await advancedCache.set('test', 'k1', { foo: 'bar' });
    const r = await advancedCache.get<{ foo: string }>('test', 'k1');
    expect(r).toEqual({ foo: 'bar' });
    expect(advancedCache.getStats().hits).toBe(1);
  });

  it('hitRate hesaplanir - hits / (hits+misses) * 100', async () => {
    await advancedCache.set('test', 'k2', 'value');
    await advancedCache.get('test', 'k2');
    await advancedCache.get('test', 'non-existent');
    const s = advancedCache.getStats();
    expect(s.hitRate).toBe(50); // 1/2 * 100
  });
});

describe('AdvancedCacheManager.getOrSet', () => {
  it('cache miss - fn calisir + sonucu cache eder', async () => {
    let calls = 0;
    const r = await advancedCache.getOrSet('test', 'k-orset', async () => {
      calls++;
      return { computed: true };
    });
    expect(r).toEqual({ computed: true });
    expect(calls).toBe(1);
  });

  it('cache hit - fn yeniden calismaz', async () => {
    let calls = 0;
    await advancedCache.getOrSet('test', 'k-orset2', async () => {
      calls++;
      return 'first';
    });
    await advancedCache.getOrSet('test', 'k-orset2', async () => {
      calls++;
      return 'should-not-run';
    });
    expect(calls).toBe(1);
  });
});

describe('AdvancedCacheManager.delete', () => {
  it('delete - evictions counter artar', async () => {
    await advancedCache.set('test', 'to-delete', 'value');
    const before = advancedCache.getStats().evictions;
    await advancedCache.delete('test', 'to-delete');
    expect(advancedCache.getStats().evictions).toBe(before + 1);
  });
});

describe('AdvancedCacheManager.invalidateByTag', () => {
  it('tag yoksa - 0 doner', async () => {
    const r = await advancedCache.invalidateByTag('non-existent-tag');
    expect(r).toBe(0);
  });
});

describe('cacheQuery / cachePage helpers', () => {
  it('cacheQuery - sql + params key uretir + cache kullanir', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return ['row1', 'row2'];
    };
    const r1 = await cacheQuery('SELECT *', [1], fn);
    const r2 = await cacheQuery('SELECT *', [1], fn);
    expect(r1).toEqual(r2);
    expect(calls).toBe(1); // sadece bir kez fn calisti
  });

  it('cachePage - URL key + tag HOME_PAGE', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return '<html />';
    };
    await cachePage('/test/url?param=1', fn);
    await cachePage('/test/url?param=1', fn);
    expect(calls).toBe(1);
  });
});
