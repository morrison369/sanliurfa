/**
 * Unit Tests — multi/multi-level-cache.ts pure helpers
 *
 * - MultiLevelCache: L1 in-memory + L2 Redis fallback (test sadece L1 path)
 *   - get/set/delete L1 only when L2 unavailable
 *   - getStats: l1Size + valid + expired count
 *   - clearL1: in-memory cache temizler
 * - CacheDependencyGraph: dependency tracking + getDependents/getDependencies
 *
 * Note: get/set Redis-bound async; vi.mock olmadan L2 path test edilemez.
 * Bu test L1-only operations (clearL1, getStats) ve dependency graph kapsar.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiLevelCache, cacheDependencies } from '../multi/multi-level-cache';

describe('MultiLevelCache — L1 only operations', () => {
  let cache: MultiLevelCache;
  beforeEach(() => { cache = new MultiLevelCache(); });

  it('clearL1 — L1 cache boş', () => {
    cache.clearL1();
    expect(cache.getStats().l1Size).toBe(0);
  });

  it('getStats — boş cache → tüm sayaçlar 0', () => {
    const stats = cache.getStats();
    expect(stats.l1Size).toBe(0);
    expect(stats.l1Valid).toBe(0);
    expect(stats.l1Expired).toBe(0);
  });

  it('getStats — l1MaxSize 1000 (sabit)', () => {
    expect(cache.getStats().l1MaxSize).toBe(1000);
  });
});

describe('CacheDependencyGraph (cacheDependencies singleton)', () => {
  it('addDependency + getDependents — resource → cache keys', () => {
    cacheDependencies.addDependency('user:1:profile', 'users-table-test-1');
    cacheDependencies.addDependency('user:1:posts', 'users-table-test-1');
    const deps = cacheDependencies.getDependents('users-table-test-1');
    expect(deps).toContain('user:1:profile');
    expect(deps).toContain('user:1:posts');
  });

  it('addDependency + getDependencies — cache key → resources', () => {
    cacheDependencies.addDependency('cache-key-A', 'res-a');
    cacheDependencies.addDependency('cache-key-A', 'res-b');
    const deps = cacheDependencies.getDependencies('cache-key-A');
    expect(deps).toContain('res-a');
    expect(deps).toContain('res-b');
  });

  it('addDependency — duplicate skip (Set semantik)', () => {
    cacheDependencies.addDependency('key-dup', 'res-dup');
    cacheDependencies.addDependency('key-dup', 'res-dup');
    cacheDependencies.addDependency('key-dup', 'res-dup');
    expect(cacheDependencies.getDependencies('key-dup').filter((d) => d === 'res-dup')).toHaveLength(1);
  });

  it('getDependents — bilinmeyen resource → boş array', () => {
    expect(cacheDependencies.getDependents('non-existent-resource-xyz')).toEqual([]);
  });

  it('getDependencies — bilinmeyen key → boş array', () => {
    expect(cacheDependencies.getDependencies('non-existent-key-xyz')).toEqual([]);
  });

  it('addDependency — multiple resource per cache key', () => {
    cacheDependencies.addDependency('multi-resource-key', 'r1');
    cacheDependencies.addDependency('multi-resource-key', 'r2');
    cacheDependencies.addDependency('multi-resource-key', 'r3');
    expect(cacheDependencies.getDependencies('multi-resource-key').length).toBeGreaterThanOrEqual(3);
  });

  it('addDependency — multiple cache key per resource', () => {
    cacheDependencies.addDependency('k1', 'multi-key-resource');
    cacheDependencies.addDependency('k2', 'multi-key-resource');
    cacheDependencies.addDependency('k3', 'multi-key-resource');
    expect(cacheDependencies.getDependents('multi-key-resource').length).toBeGreaterThanOrEqual(3);
  });
});
