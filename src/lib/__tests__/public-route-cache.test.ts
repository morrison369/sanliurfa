import { describe, expect, it, beforeEach } from 'vitest';
import { clearPublicRouteCacheForTests, getCachedPublicRouteData } from '../public-route-cache';

describe('public route cache', () => {
  beforeEach(() => {
    clearPublicRouteCacheForTests();
  });

  it('aynı key için loader sonucunu TTL içinde yeniden kullanır', async () => {
    let calls = 0;
    const load = () => {
      calls += 1;
      return Promise.resolve({ value: calls });
    };

    await expect(getCachedPublicRouteData('same-key', load, 1000)).resolves.toEqual({ value: 1 });
    await expect(getCachedPublicRouteData('same-key', load, 1000)).resolves.toEqual({ value: 1 });
    expect(calls).toBe(1);
  });

  it('eşzamanlı istekleri tek loader çağrısına düşürür', async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { value: calls };
    };

    const [first, second, third] = await Promise.all([
      getCachedPublicRouteData('inflight-key', load, 1000),
      getCachedPublicRouteData('inflight-key', load, 1000),
      getCachedPublicRouteData('inflight-key', load, 1000),
    ]);

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(third).toEqual({ value: 1 });
    expect(calls).toBe(1);
  });

  it('clear helper cache durumunu sıfırlar', async () => {
    let calls = 0;
    const load = () => {
      calls += 1;
      return Promise.resolve(calls);
    };

    await getCachedPublicRouteData('clear-key', load, 1000);
    clearPublicRouteCacheForTests();
    await expect(getCachedPublicRouteData('clear-key', load, 1000)).resolves.toBe(2);
  });
});
