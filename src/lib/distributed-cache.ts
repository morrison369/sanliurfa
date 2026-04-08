/**
 * Phase 46: Distributed Locking & Cache Intelligence
 * Distributed locks, cache warming, cache invalidation, dependency tracking
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface Lock {
  key: string;
  token: string;
  expiresAt: number;
  owner: string;
}

export interface CacheWarmJob {
  cacheKey: string;
  loader: () => Promise<any>;
  ttl: number;
  priority: number;
}

export interface InvalidationRule {
  pattern: string;
  triggers: string[];
}

// ==================== DISTRIBUTED LOCK ====================

export class DistributedLock {
  private locks = new Map<string, Lock>();

  /**
   * Acquire lock
   */
  acquire(key: string, ttlMs: number, owner?: string): Lock | null {
    if (this.locks.has(key)) {
      const existingLock = this.locks.get(key)!;

      if (existingLock.expiresAt > Date.now()) {
        return null; // Lock still held
      }

      this.locks.delete(key); // Expired lock, remove it
    }

    const token = 'token-' + Math.random().toString(36).substr(2, 9);
    const lock: Lock = {
      key,
      token,
      expiresAt: Date.now() + ttlMs,
      owner: owner || 'anonymous'
    };

    this.locks.set(key, lock);
    logger.debug('Lock acquired', { key, owner: lock.owner });

    return lock;
  }

  /**
   * Release lock
   */
  release(lock: Lock): boolean {
    const existingLock = this.locks.get(lock.key);

    if (existingLock && existingLock.token === lock.token) {
      this.locks.delete(lock.key);
      logger.debug('Lock released', { key: lock.key });

      return true;
    }

    return false;
  }

  /**
   * Extend lock
   */
  extend(lock: Lock, extraMs: number): boolean {
    const existingLock = this.locks.get(lock.key);

    if (existingLock && existingLock.token === lock.token) {
      existingLock.expiresAt += extraMs;
      return true;
    }

    return false;
  }

  /**
   * Check if locked
   */
  isLocked(key: string): boolean {
    const lock = this.locks.get(key);

    if (!lock) return false;

    if (lock.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }

    return true;
  }

  /**
   * With lock helper
   */
  async withLock<T>(key: string, fn: () => Promise<T>, ttlMs: number = 10000): Promise<T> {
    const lock = this.acquire(key, ttlMs);

    if (!lock) {
      throw new Error(`Could not acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      this.release(lock);
    }
  }
}

// ==================== CACHE WARMER ====================

export class CacheWarmer {
  private jobs = new Map<string, CacheWarmJob>();
  private schedules = new Map<string, NodeJS.Timeout>();

  /**
   * Register warm job
   */
  registerJob(job: CacheWarmJob): void {
    this.jobs.set(job.cacheKey, job);
    logger.debug('Cache warm job registered', { cacheKey: job.cacheKey });
  }

  /**
   * Warm all
   */
  async warmAll(): Promise<{ warmed: number; failed: number }> {
    let warmed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      try {
        await job.loader();
        warmed++;
      } catch (err) {
        failed++;
        logger.error('Cache warm failed', err instanceof Error ? err : new Error(String(err)), {
          cacheKey: job.cacheKey
        });
      }
    }

    return { warmed, failed };
  }

  /**
   * Warm specific key
   */
  async warmKey(cacheKey: string): Promise<boolean> {
    const job = this.jobs.get(cacheKey);

    if (!job) return false;

    try {
      await job.loader();
      return true;
    } catch (err) {
      logger.error('Cache warm failed', err instanceof Error ? err : new Error(String(err)));

      return false;
    }
  }

  /**
   * Schedule warm
   */
  scheduleWarm(cacheKey: string, intervalMs: number): string {
    const scheduleId = 'schedule-' + Math.random().toString(36).substr(2, 9);

    const interval = setInterval(() => {
      this.warmKey(cacheKey);
    }, intervalMs);

    this.schedules.set(scheduleId, interval);

    return scheduleId;
  }

  /**
   * Stop schedule
   */
  stopSchedule(scheduleId: string): void {
    const interval = this.schedules.get(scheduleId);

    if (interval) {
      clearInterval(interval);
      this.schedules.delete(scheduleId);
    }
  }
}

// ==================== CACHE INVALIDATOR ====================

export class CacheInvalidator {
  private rules = new Map<string, InvalidationRule>();
  private dependencies = new Map<string, string[]>();

  /**
   * Register invalidation rule
   */
  registerRule(rule: InvalidationRule): void {
    this.rules.set(rule.pattern, rule);
    logger.debug('Cache invalidation rule registered', { pattern: rule.pattern });
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;

    // Simple pattern matching
    for (const [key] of this.dependencies) {
      if (key.includes(pattern)) {
        this.dependencies.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Invalidate on event
   */
  async invalidateOnEvent(event: string): Promise<number> {
    let count = 0;

    for (const [, rule] of this.rules) {
      if (rule.triggers.includes(event)) {
        count += await this.invalidateByPattern(rule.pattern);
      }
    }

    return count;
  }

  /**
   * Cascade invalidation
   */
  cascade(rootKey: string, dependentKeys: string[]): void {
    this.dependencies.set(rootKey, dependentKeys);
    logger.debug('Cache dependency cascade registered', { rootKey, dependentCount: dependentKeys.length });
  }

  /**
   * Get dependencies
   */
  getDependencies(cacheKey: string): string[] {
    return this.dependencies.get(cacheKey) || [];
  }
}

// ==================== EXPORTS ====================

export const distributedLock = new DistributedLock();
export const cacheWarmer = new CacheWarmer();
export const cacheInvalidator = new CacheInvalidator();
