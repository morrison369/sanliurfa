/**
 * Phase 7: Advanced Caching Strategy
 * Multi-level caching: L1 in-memory (fast), L2 Redis (persistent)
 * Smart invalidation with pattern matching and dependency tracking
 */

import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

// ==================== L1 IN-MEMORY CACHE ====================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * L1 in-memory cache with TTL
 * Used for frequently accessed data (100-1000ms TTL)
 * Backed by L2 Redis for persistence
 */
export class MultiLevelCache {
  private l1Cache = new Map<string, CacheEntry<any>>();
  private readonly l1MaxSize = 1000; // Max entries in memory
  private readonly l1DefaultTtl = 300; // 5 minutes default for L1

  /**
   * Get from L1 cache if available and not expired
   */
  private getL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.l1Cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set in L1 cache with TTL (in seconds)
   */
  private setL1<T>(key: string, value: T, ttl: number = this.l1DefaultTtl): void {
    // Evict oldest entry if cache is full (simple LRU)
    if (this.l1Cache.size >= this.l1MaxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) this.l1Cache.delete(firstKey);
    }

    this.l1Cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Delete from L1 cache
   */
  private deleteL1(key: string): void {
    this.l1Cache.delete(key);
  }

  /**
   * Delete from L1 cache by pattern (simple wildcard)
   */
  private deleteL1Pattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        this.l1Cache.delete(key);
      }
    }
  }

  /**
   * Get from multi-level cache (L1 → L2)
   */
  async get<T>(key: string, l1Ttl?: number): Promise<T | null> {
    // Try L1 first (fastest)
    const l1Hit = this.getL1<T>(key);
    if (l1Hit !== null) {
      return l1Hit;
    }

    // Fall back to L2 (Redis)
    const l2Hit = await getCache(key);
    if (l2Hit) {
      try {
        const value = JSON.parse(l2Hit) as T;
        // Promote to L1
        this.setL1(key, value, l1Ttl);
        return value;
      } catch (err) {
        logger.warn('Failed to parse L2 cache value', { key });
      }
    }

    return null;
  }

  /**
   * Set in multi-level cache (L1 + L2)
   */
  async set<T>(key: string, value: T, l2Ttl: number = 300, l1Ttl?: number): Promise<void> {
    // Set L1 (in-memory)
    this.setL1(key, value, l1Ttl || l2Ttl);

    // Set L2 (Redis) for persistence
    await setCache(key, JSON.stringify(value), l2Ttl);
  }

  /**
   * Delete from both L1 and L2
   */
  async delete(key: string): Promise<void> {
    this.deleteL1(key);
    await deleteCache(key);
  }

  /**
   * Delete by pattern from both levels
   */
  async deletePattern(pattern: string): Promise<void> {
    this.deleteL1Pattern(pattern);
    await deleteCachePattern(pattern);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const entry of this.l1Cache.values()) {
      if (now - entry.timestamp <= entry.ttl * 1000) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      l1Size: this.l1Cache.size,
      l1Valid: validCount,
      l1Expired: expiredCount,
      l1MaxSize: this.l1MaxSize
    };
  }

  /**
   * Clear entire L1 cache (for testing or maintenance)
   */
  clearL1(): void {
    this.l1Cache.clear();
  }
}

// ==================== CACHE DEPENDENCY TRACKING ====================

/**
 * Track cache dependencies to enable smart invalidation
 * Example: UserProfile cache depends on User table
 */
class CacheDependencyGraph {
  private dependencies = new Map<string, Set<string>>();
  private dependents = new Map<string, Set<string>>();

  /**
   * Register a cache key as dependent on a table/resource
   */
  addDependency(cacheKey: string, dependsOn: string): void {
    if (!this.dependencies.has(cacheKey)) {
      this.dependencies.set(cacheKey, new Set());
    }
    this.dependencies.get(cacheKey)!.add(dependsOn);

    if (!this.dependents.has(dependsOn)) {
      this.dependents.set(dependsOn, new Set());
    }
    this.dependents.get(dependsOn)!.add(cacheKey);
  }

  /**
   * Get all cache keys that depend on a resource
   */
  getDependents(resource: string): string[] {
    return Array.from(this.dependents.get(resource) || new Set());
  }

  /**
   * Get all resources that a cache key depends on
   */
  getDependencies(cacheKey: string): string[] {
    return Array.from(this.dependencies.get(cacheKey) || new Set());
  }
}

export const cacheDependencies = new CacheDependencyGraph();

/**
 * Smart invalidation: Given a modified table, invalidate dependent caches
 */
export async function invalidateDependents(
  table: string,
  multiLevelCache: MultiLevelCache
): Promise<void> {
  const dependentCaches = cacheDependencies.getDependents(table);

  for (const cacheKey of dependentCaches) {
    await multiLevelCache.delete(cacheKey);
    logger.debug('Invalidated dependent cache', { cacheKey, table });
  }
}

// ==================== CACHE WARMING ====================

/**
 * Cache warming strategy for predictable data
 * Pre-load frequently accessed data into cache at startup or on schedule
 */
export interface CacheWarmingConfig {
  key: string;
  loader: () => Promise<any>;
  ttl: number;
  interval?: number; // Refresh interval in seconds (if recurring)
}

/**
 * Warm cache with data
 */
export async function warmCache(
  config: CacheWarmingConfig,
  multiLevelCache: MultiLevelCache
): Promise<void> {
  try {
    const data = await config.loader();
    await multiLevelCache.set(config.key, data, config.ttl);
    logger.debug('Cache warmed', { key: config.key, ttl: config.ttl });
  } catch (err) {
    logger.warn('Cache warming failed', { key: config.key, error: err });
  }
}

/**
 * Schedule recurring cache warming
 */
export function scheduleRecurringWarm(
  config: CacheWarmingConfig,
  multiLevelCache: MultiLevelCache
): NodeJS.Timer {
  // Warm immediately
  warmCache(config, multiLevelCache);

  // Warm on interval if specified
  if (config.interval) {
    return setInterval(
      () => warmCache(config, multiLevelCache),
      config.interval! * 1000
    );
  }

  return null as any;
}

// ==================== CACHE OPTIMIZATION HINTS ====================

/**
 * Analyze cache hit rates and suggest optimizations
 */
export interface CacheHealthMetrics {
  hitRate: number; // 0-100%
  avgTtl: number; // seconds
  recommendation: string;
}

/**
 * Get cache health recommendation based on metrics
 */
export function analyzeCacheHealth(hitRate: number, avgTtl: number): CacheHealthMetrics {
  let recommendation = '';

  if (hitRate < 50) {
    recommendation = 'Low hit rate (<50%). Consider increasing TTL or warming cache more frequently.';
  } else if (hitRate < 70) {
    recommendation = 'Moderate hit rate (50-70%). Consider optimizing cache keys or invalidation strategy.';
  } else if (hitRate < 85) {
    recommendation = 'Good hit rate (70-85%). Cache strategy is working well.';
  } else {
    recommendation = 'Excellent hit rate (85%+). Cache strategy is optimal.';
  }

  if (avgTtl < 60) {
    recommendation += ' Short TTL detected - may cause excessive misses.';
  } else if (avgTtl > 3600) {
    recommendation += ' Long TTL detected - may cause stale data.';
  }

  return {
    hitRate,
    avgTtl,
    recommendation
  };
}

// ==================== EXPORTS ====================

export const multiLevelCache = new MultiLevelCache();
