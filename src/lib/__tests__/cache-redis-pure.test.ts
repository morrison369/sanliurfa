/**
 * Unit Tests - cache/redis.ts pure helpers (vi.mock createClient + REDIS_URL env)
 *
 * - getRedisClient (REDIS_URL yoksa null + connect fail null)
 * - get / set (JSON.parse + JSON.stringify + redis null fallback false)
 * - del + invalidateByTag (sMembers + del array + tag key delete)
 * - getOrSet (cache hit OR factory + set)
 * - clear (flushDb)
 *
 * vi.hoisted createClient mock + tag-based invalidation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fakeStore = new Map<string, string>();
const fakeSets = new Map<string, Set<string>>();

const { createClientMock, fakeClient } = vi.hoisted(() => {
  const fake = {
    isOpen: true,
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    sAdd: vi.fn(),
    sMembers: vi.fn(),
    flushDb: vi.fn(),
  };
  return { createClientMock: vi.fn(() => fake), fakeClient: fake };
});

vi.mock('redis', () => ({
  createClient: createClientMock,
}));

beforeEach(() => {
  fakeStore.clear();
  fakeSets.clear();
  fakeClient.get.mockImplementation(async (k: string) => fakeStore.get(k) ?? null);
  fakeClient.set.mockImplementation(async (k: string, v: string) => { fakeStore.set(k, v); return 'OK'; });
  fakeClient.setEx.mockImplementation(async (k: string, _ttl: number, v: string) => { fakeStore.set(k, v); return 'OK'; });
  fakeClient.del.mockImplementation(async (keys: string | string[]) => {
    const ks = Array.isArray(keys) ? keys : [keys];
    let count = 0;
    for (const k of ks) if (fakeStore.delete(k)) count++;
    return count;
  });
  fakeClient.sAdd.mockImplementation(async (k: string, ...members: string[]) => {
    const set = fakeSets.get(k) || new Set();
    for (const m of members) set.add(m);
    fakeSets.set(k, set);
    return members.length;
  });
  fakeClient.sMembers.mockImplementation(async (k: string) => Array.from(fakeSets.get(k) || []));
  fakeClient.flushDb.mockResolvedValue('OK');
  process.env.REDIS_URL = 'redis://localhost:6379';
});

afterEach(() => {
  vi.clearAllMocks();
});

import { get, set, del, invalidateByTag, clear, getOrSet } from '../cache/redis';

describe('getRedisClient via get/set', () => {
  it('REDIS_URL yok → null fallback (set returns false)', async () => {
    delete process.env.REDIS_URL;
    fakeClient.isOpen = false;
    const r = await set('key', 'value');
    expect(r).toBe(false);
    fakeClient.isOpen = true;
  });
});

describe('get / set', () => {
  it('set + get - JSON serialization roundtrip', async () => {
    await set('key1', { foo: 'bar' });
    const r = await get<{ foo: string }>('key1');
    expect(r).toEqual({ foo: 'bar' });
  });

  it('get - bilinmeyen key → null', async () => {
    const r = await get('non-existent');
    expect(r).toBeNull();
  });

  it('set with TTL - setEx çağrılır', async () => {
    await set('ttl-key', 'value', { ttl: 60 });
    expect(fakeClient.setEx).toHaveBeenCalled();
  });

  it('set without TTL - set çağrılır', async () => {
    await set('no-ttl', 'value');
    expect(fakeClient.set).toHaveBeenCalled();
  });

  it('set with tags - sAdd çağrılır her tag için', async () => {
    await set('tagged-key', 'v', { tags: ['places', 'home'] });
    expect(fakeClient.sAdd).toHaveBeenCalledTimes(2);
  });
});

describe('del', () => {
  it('del - true return + key silinir', async () => {
    await set('to-del', 'v');
    const r = await del('to-del');
    expect(r).toBe(true);
    expect(await get('to-del')).toBeNull();
  });
});

describe('invalidateByTag', () => {
  it('boş tag → 0', async () => {
    const r = await invalidateByTag('non-existent-tag');
    expect(r).toBe(0);
  });

  it('tagged keys delete + count', async () => {
    await set('k1', 'v', { tags: ['my-tag'] });
    await set('k2', 'v', { tags: ['my-tag'] });
    const r = await invalidateByTag('my-tag');
    expect(r).toBe(2);
  });
});

describe('getOrSet', () => {
  it('cache miss - factory çağrılır + set', async () => {
    let calls = 0;
    const v = await getOrSet('factory-key', async () => {
      calls++;
      return { computed: true };
    });
    expect(v).toEqual({ computed: true });
    expect(calls).toBe(1);
  });

  it('cache hit - factory çağrılmaz', async () => {
    let calls = 0;
    const factory = async () => {
      calls++;
      return 'value';
    };
    await getOrSet('cached-key', factory);
    await getOrSet('cached-key', factory);
    expect(calls).toBe(1);
  });
});

describe('clear', () => {
  it('clear - flushDb çağrılır + true', async () => {
    const r = await clear();
    expect(r).toBe(true);
    expect(fakeClient.flushDb).toHaveBeenCalled();
  });
});
