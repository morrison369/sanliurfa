/**
 * Integration Tests — Cache Helper Round-Trip
 *
 * Background: Batch #208 + #209 cache layer chain bugs:
 * - Batch #208: caller'lar `JSON.parse(cached as string)` yapıyordu — getCache zaten parse'lı T dönerdi → SyntaxError → silent null.
 * - Batch #209: caller'lar setCache'i `JSON.stringify(value)` ile çağırıyordu — double encode + single decode → string döner.
 *
 * Bu test 3 setCache pattern'inin getCache ile doğru round-trip yaptığını kanıtlar.
 *
 * Strategy: vi.mock('redis') paket-level mock — `createClient` factory in-memory client döndürür.
 * Bu yaklaşım module-level state caching sorununu by-pass eder (cache.ts içindeki `client` variable).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory Redis store (Map per test)
const memStore = new Map<string, string>();

// Mock the entire `redis` package before any imports
vi.mock('redis', () => {
  return {
    createClient: vi.fn(() => {
      let connected = false;
      const client = {
        isOpen: false,
        connect: vi.fn(async () => {
          connected = true;
          client.isOpen = true;
        }),
        on: vi.fn(),
        setEx: vi.fn(async (key: string, _ttl: number, value: string) => {
          memStore.set(key, value);
          return 'OK';
        }),
        get: vi.fn(async (key: string) => memStore.get(key) ?? null),
        del: vi.fn(async (...keys: string[]) => {
          let count = 0;
          // Handle del(['k1', 'k2']) and del('k1')
          const flat = keys.flat();
          for (const k of flat) if (memStore.delete(k)) count++;
          return count;
        }),
        keys: vi.fn(async (pattern: string) => {
          const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return [...memStore.keys()].filter((k) => re.test(k));
        }),
        sAdd: vi.fn(async () => 0),
        sRem: vi.fn(async () => 0),
        info: vi.fn(async () => ''),
        incr: vi.fn(async (key: string) => {
          const cur = parseInt(memStore.get(key) || '0', 10);
          memStore.set(key, String(cur + 1));
          return cur + 1;
        }),
        expire: vi.fn(async () => true),
        quit: vi.fn(async () => {
          client.isOpen = false;
        }),
      };
      return client;
    }),
  };
});

// Import after mocks set up
const { setCache, getCache, deleteCache } = await import('../cache/cache');

describe('Cache helper round-trip', () => {
  beforeEach(() => {
    memStore.clear();
  });

  describe('Pattern 1: object → setCache → getCache → object (yeni temiz pattern)', () => {
    it('round-trips a simple object', async () => {
      await setCache('test:obj', { a: 1, b: 'two' }, 60);
      const result = await getCache<{ a: number; b: string }>('test:obj');
      expect(result).toEqual({ a: 1, b: 'two' });
    });

    it('round-trips a nested structure', async () => {
      const data = { users: [{ id: 1 }, { id: 2 }], total: 2 };
      await setCache('test:nested', data, 60);
      const result = await getCache<typeof data>('test:nested');
      expect(result).toEqual(data);
    });

    it('round-trips an array', async () => {
      await setCache('test:arr', [1, 2, 3], 60);
      const result = await getCache<number[]>('test:arr');
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Pattern 2: legacy double-encode (setCache(k, JSON.stringify(v)))', () => {
    it('caller pre-stringify still works (Batch #209 backward-compat)', async () => {
      const obj = { a: 1, b: 'two' };
      await setCache('test:legacy', JSON.stringify(obj), 60);
      const result = await getCache<typeof obj>('test:legacy');
      expect(result).toEqual(obj);
    });

    it('caller pre-stringify nested still works', async () => {
      const data = { users: [{ id: 1 }] };
      await setCache('test:legacy:nested', JSON.stringify(data), 60);
      const result = await getCache<typeof data>('test:legacy:nested');
      expect(result).toEqual(data);
    });
  });

  describe('Pattern 3: raw string flag (existence marker)', () => {
    it('round-trips raw word that is not JSON-valid', async () => {
      await setCache('test:status', 'pending', 60);
      const result = await getCache<string>('test:status');
      expect(result).toBe('pending');
    });

    it('round-trips raw "ok" string (health-check pattern)', async () => {
      await setCache('test:health', 'ok', 60);
      const result = await getCache<string>('test:health');
      expect(result).toBe('ok');
    });

    it('numeric string "1" — valid JSON literal parses to number 1 (truthy preserved)', async () => {
      // Note: '1' is valid JSON literal → stored raw → parsed as number 1.
      // OK for truthy existence checks (both '1' and 1 are truthy).
      await setCache('test:exists', '1', 60);
      const result = await getCache('test:exists');
      expect(result).toBe(1);
      expect(result).toBeTruthy();
    });
  });

  describe('Cache miss', () => {
    it('returns null for missing key', async () => {
      const result = await getCache('test:missing');
      expect(result).toBeNull();
    });
  });

  describe('Cache delete', () => {
    it('removes key after delete', async () => {
      await setCache('test:del', { a: 1 }, 60);
      expect(await getCache('test:del')).toEqual({ a: 1 });
      await deleteCache('test:del');
      expect(await getCache('test:del')).toBeNull();
    });
  });

  describe('Type assertion pattern (Batch #208 fix)', () => {
    it('cached as Type returns object (not string)', async () => {
      await setCache('test:user', { id: 1, name: 'Test' }, 60);
      const cached = await getCache('test:user');
      expect(typeof cached).toBe('object');
      expect(cached).toEqual({ id: 1, name: 'Test' });
    });

    it('legacy stringify pattern returns object (Batch #209 compat)', async () => {
      const data = { rating: 5, count: 10 };
      await setCache('test:legacy:cast', JSON.stringify(data), 60);
      const cached = await getCache('test:legacy:cast');
      expect(typeof cached).toBe('object');
      expect(cached).toEqual(data);
    });
  });
});
