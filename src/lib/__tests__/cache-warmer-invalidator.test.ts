/**
 * Unit Tests - cache/distributed-cache.ts CacheWarmer + CacheInvalidator (Phase 46)
 *
 * - CacheWarmer (registerJob + warmAll Promise.allSettled + warmKey loader exec + scheduleWarm interval ID)
 * - CacheInvalidator (registerRule + invalidateByPattern + invalidateOnEvent triggers + cascade dependencies + getDependencies)
 *
 * Singleton state shared.
 */

import { describe, it, expect, vi } from 'vitest';
import { cacheWarmer, cacheInvalidator } from '../cache/distributed-cache';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('CacheWarmer', () => {
  it('registerJob + warmAll - loader çağrılır', async () => {
    const loader = vi.fn().mockResolvedValue('warmed');
    cacheWarmer.registerJob({ cacheKey: uniq('warm-key'), loader, ttl: 60, priority: 1 });
    await cacheWarmer.warmAll();
    expect(loader).toHaveBeenCalled();
  });

  it('warmAll - allSettled (failed loader counted)', async () => {
    cacheWarmer.registerJob({
      cacheKey: uniq('warm-fail'),
      loader: async () => { throw new Error('loader failed'); },
      ttl: 60,
      priority: 1,
    });
    const r = await cacheWarmer.warmAll();
    expect(typeof r.warmed).toBe('number');
    expect(typeof r.failed).toBe('number');
    expect(r.failed).toBeGreaterThanOrEqual(1);
  });

  it('warmKey - kayıtlı key → loader çalışır + true', async () => {
    const key = uniq('warm-specific');
    const loader = vi.fn().mockResolvedValue('value');
    cacheWarmer.registerJob({ cacheKey: key, loader, ttl: 60, priority: 1 });
    expect(await cacheWarmer.warmKey(key)).toBe(true);
    expect(loader).toHaveBeenCalled();
  });

  it('warmKey - bilinmeyen key → false', async () => {
    expect(await cacheWarmer.warmKey('non-existent')).toBe(false);
  });

  it('warmKey - loader throw → false', async () => {
    const key = uniq('warm-error');
    cacheWarmer.registerJob({
      cacheKey: key,
      loader: async () => { throw new Error('error'); },
      ttl: 60,
      priority: 1,
    });
    expect(await cacheWarmer.warmKey(key)).toBe(false);
  });

  it('scheduleWarm + stopSchedule - schedule ID prefix "schedule-"', () => {
    const scheduleId = cacheWarmer.scheduleWarm(uniq('schedule-key'), 60000);
    expect(scheduleId.startsWith('schedule-')).toBe(true);
    cacheWarmer.stopSchedule(scheduleId); // cleanup
  });

  it('stopSchedule - bilinmeyen ID no-throw', () => {
    expect(() => cacheWarmer.stopSchedule('non-existent')).not.toThrow();
  });
});

describe('CacheInvalidator', () => {
  it('registerRule + invalidateOnEvent - trigger match → invalidate', async () => {
    const pattern = uniq('inv-pattern');
    cacheInvalidator.registerRule({ pattern, triggers: ['post.published'] });
    cacheInvalidator.cascade(`${pattern}-key1`, ['dep1']);
    const r = await cacheInvalidator.invalidateOnEvent('post.published');
    expect(typeof r).toBe('number');
  });

  it('invalidateByPattern - includes match', async () => {
    const pattern = uniq('cascade-test');
    cacheInvalidator.cascade(`${pattern}:user-1`, ['d1']);
    cacheInvalidator.cascade(`${pattern}:user-2`, ['d2']);
    const r = await cacheInvalidator.invalidateByPattern(pattern);
    expect(r).toBeGreaterThanOrEqual(2);
  });

  it('invalidateByPattern - eşleşme yok → 0', async () => {
    expect(await cacheInvalidator.invalidateByPattern(uniq('non-existent'))).toBe(0);
  });

  it('cascade + getDependencies - dependent keys döner', () => {
    const root = uniq('root');
    cacheInvalidator.cascade(root, ['dep1', 'dep2', 'dep3']);
    expect(cacheInvalidator.getDependencies(root)).toEqual(['dep1', 'dep2', 'dep3']);
  });

  it('getDependencies - bilinmeyen key → []', () => {
    expect(cacheInvalidator.getDependencies('non-existent')).toEqual([]);
  });

  it('invalidateOnEvent - trigger eşleşme yoksa → 0', async () => {
    const r = await cacheInvalidator.invalidateOnEvent(uniq('non-existent-event'));
    expect(r).toBe(0);
  });
});
