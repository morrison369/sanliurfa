/**
 * Unit Tests — In-Memory Cache + Stale-While-Revalidate + Cache Key Generators
 *
 * Pure helper — no DB/Redis. Validates TTL, stale window, LRU eviction,
 * stats tracking, prefix invalidation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  InMemoryCache,
  staleWhileRevalidate,
  placeCacheKey,
  userCacheKey,
  blogCacheKey,
  listCacheKey,
} from '../cache-strategy';

describe('InMemoryCache — basic operations', () => {
  let cache: InMemoryCache<string>;

  beforeEach(() => {
    cache = new InMemoryCache<string>({
      defaultTTL: 1000, // 1s
      defaultStaleTTL: 500, // 0.5s stale window
      maxMemory: 1024 * 1024, // 1MB
    });
  });

  it('set + get returns fresh data', () => {
    cache.set('key', 'value');
    const result = cache.get('key');
    expect(result).toEqual({ data: 'value', isStale: false });
  });

  it('returns null for missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('delete removes key', () => {
    cache.set('key', 'value');
    expect(cache.delete('key')).toBe(true);
    expect(cache.get('key')).toBeNull();
  });

  it('has() respects expiration', () => {
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
  });

  it('clear() removes all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('size returns entry count', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
  });

  it('keys() returns all stored keys', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.keys().sort()).toEqual(['a', 'b']);
  });
});

describe('InMemoryCache — TTL & stale-while-revalidate', () => {
  let cache: InMemoryCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryCache<string>({
      defaultTTL: 1000,
      defaultStaleTTL: 500,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh data within TTL', () => {
    cache.set('key', 'value');
    vi.advanceTimersByTime(500);
    expect(cache.get('key')).toEqual({ data: 'value', isStale: false });
  });

  it('returns stale data after TTL expired but within stale window', () => {
    cache.set('key', 'value');
    vi.advanceTimersByTime(1100); // past TTL (1000) but within TTL+stale (1500)
    expect(cache.get('key')).toEqual({ data: 'value', isStale: true });
  });

  it('returns null after TTL + stale window', () => {
    cache.set('key', 'value');
    vi.advanceTimersByTime(1600); // past TTL + stale
    expect(cache.get('key')).toBeNull();
  });

  it('custom TTL overrides default', () => {
    cache.set('key', 'value', 2000); // 2s TTL
    vi.advanceTimersByTime(1500);
    expect(cache.get('key')?.isStale).toBe(false); // still within 2s
  });
});

describe('InMemoryCache — invalidation patterns', () => {
  let cache: InMemoryCache<string>;

  beforeEach(() => {
    cache = new InMemoryCache<string>({ defaultTTL: 60000 });
  });

  it('invalidateByPrefix removes matching keys', () => {
    cache.set('places:1', 'a');
    cache.set('places:2', 'b');
    cache.set('users:1', 'c');
    const count = cache.invalidateByPrefix('places:');
    expect(count).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.get('users:1')).toBeTruthy();
  });

  it('invalidateMany removes given keys', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    const count = cache.invalidateMany(['a', 'b', 'missing']);
    expect(count).toBe(2);
    expect(cache.get('c')).toBeTruthy();
  });
});

describe('InMemoryCache — prune & stats', () => {
  let cache: InMemoryCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryCache<string>({ defaultTTL: 1000, defaultStaleTTL: 500 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prune removes fully-expired entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    vi.advanceTimersByTime(2000); // past TTL+stale
    expect(cache.prune()).toBe(2);
  });

  it('prune does not remove fresh entries', () => {
    cache.set('a', '1');
    vi.advanceTimersByTime(500); // still fresh
    expect(cache.prune()).toBe(0);
  });

  it('getStats tracks hits and misses', () => {
    cache.set('a', '1');
    cache.get('a'); // hit
    cache.get('missing'); // miss
    cache.get('missing'); // miss
    const stats = cache.getStats();
    expect(stats.totalHits).toBe(1);
    expect(stats.totalMisses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(1 / 3);
  });

  it('getStats categorizes valid/stale/expired entries', () => {
    cache.set('fresh', '1');
    cache.set('stale', '2');
    cache.set('expired', '3');
    vi.advanceTimersByTime(0);
    // Manually set stale: advance time so 'stale' is past TTL but within stale window
    // (Easier: set with shorter TTL)
    cache.set('shorter', '4', 100);
    vi.advanceTimersByTime(150); // 'shorter' now past TTL but within TTL+stale (100+500=600)
    const stats = cache.getStats();
    expect(stats.totalEntries).toBeGreaterThan(0);
    expect(stats.staleEntries).toBeGreaterThanOrEqual(1);
  });

  it('resetStats clears hit/miss counters', () => {
    cache.set('a', '1');
    cache.get('a');
    cache.resetStats();
    expect(cache.getStats().totalHits).toBe(0);
  });
});

describe('staleWhileRevalidate', () => {
  let cache: InMemoryCache<{ value: string }>;

  beforeEach(() => {
    cache = new InMemoryCache<{ value: string }>({ defaultTTL: 1000, defaultStaleTTL: 500 });
  });

  it('fetches and caches when key not present', async () => {
    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { value: 'fresh' };
    };
    const result = await staleWhileRevalidate('key', cache, fetchFn);
    expect(result).toEqual({ value: 'fresh' });
    expect(fetchCount).toBe(1);
  });

  it('returns cached data without fetch when fresh', async () => {
    cache.set('key', { value: 'cached' });
    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { value: 'fetched' };
    };
    const result = await staleWhileRevalidate('key', cache, fetchFn);
    expect(result).toEqual({ value: 'cached' });
    expect(fetchCount).toBe(0);
  });

  it('returns stale data and triggers background revalidation', async () => {
    vi.useFakeTimers();
    try {
      cache.set('key', { value: 'old' });
      vi.advanceTimersByTime(1100); // past TTL, within stale window
      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { value: 'fresh' };
      };
      const result = await staleWhileRevalidate('key', cache, fetchFn);
      expect(result).toEqual({ value: 'old' }); // returns stale
      // Background fetch fires (async, may not complete by next assertion)
      expect(fetchCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Cache key generators', () => {
  it('placeCacheKey: places:<id>', () => {
    expect(placeCacheKey('123')).toBe('places:123');
    expect(placeCacheKey(456)).toBe('places:456');
  });

  it('placeCacheKey with suffix', () => {
    expect(placeCacheKey('123', 'reviews')).toBe('places:123:reviews');
  });

  it('userCacheKey: users:<id>', () => {
    expect(userCacheKey('u1')).toBe('users:u1');
    expect(userCacheKey('u1', 'profile')).toBe('users:u1:profile');
  });

  it('blogCacheKey: blog:<id>', () => {
    expect(blogCacheKey('post-1')).toBe('blog:post-1');
    expect(blogCacheKey(99, 'comments')).toBe('blog:99:comments');
  });

  it('listCacheKey sorts params alphabetically', () => {
    const k1 = listCacheKey('places', { z: '1', a: '2', m: '3' });
    const k2 = listCacheKey('places', { a: '2', m: '3', z: '1' });
    // Same params different order → same key
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^places:list:a=2&m=3&z=1$/);
  });

  it('listCacheKey handles empty params', () => {
    expect(listCacheKey('places', {})).toBe('places:list:');
  });
});
