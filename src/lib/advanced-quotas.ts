/**
 * Phase 122: Advanced Rate Limiting & Quotas
 * Enterprise rate limiting with per-tier quotas, burst allowances, and quota pooling
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type QuotaWindow = 'hourly' | 'daily' | 'monthly';

export interface QuotaLimit {
  limit: number;
  window: QuotaWindow;
  burst?: number;
}

export interface QuotaAllocation {
  userId: string;
  tier: SubscriptionTier;
  quotas: Record<string, { used: number; limit: number; resetAt: number }>;
  burst: { available: number; refillRate: number };
}

export interface QuotaThreshold {
  percentage: number;
  action: string;
}

// ==================== TIERED QUOTA MANAGER ====================

export class TieredQuotaManager {
  private allocations = new Map<string, QuotaAllocation>();
  private tiers = new Map<SubscriptionTier, Record<string, QuotaLimit>>();
  private allocationCount = 0;

  constructor() {
    this.initializeTiers();
  }

  /**
   * Initialize tier limits
   */
  private initializeTiers(): void {
    this.tiers.set('free', {
      'api-requests': { limit: 1000, window: 'monthly' },
      'file-uploads': { limit: 100, window: 'monthly' },
      'storage': { limit: 1000000, window: 'monthly' }
    });

    this.tiers.set('pro', {
      'api-requests': { limit: 100000, window: 'monthly' },
      'file-uploads': { limit: 10000, window: 'monthly' },
      'storage': { limit: 100000000, window: 'monthly' }
    });

    this.tiers.set('enterprise', {
      'api-requests': { limit: Infinity, window: 'monthly' },
      'file-uploads': { limit: Infinity, window: 'monthly' },
      'storage': { limit: Infinity, window: 'monthly' }
    });
  }

  /**
   * Get allocation
   */
  getAllocation(tier: SubscriptionTier, userId: string): QuotaAllocation {
    const key = `${tier}:${userId}`;

    if (!this.allocations.has(key)) {
      const tierLimits = this.tiers.get(tier) || {};
      const quotas: Record<string, any> = {};

      for (const [feature, limit] of Object.entries(tierLimits)) {
        quotas[feature] = {
          used: 0,
          limit: limit.limit,
          resetAt: this.getResetTime(limit.window)
        };
      }

      const allocation: QuotaAllocation = {
        userId,
        tier,
        quotas,
        burst: { available: 100, refillRate: 10 }
      };

      this.allocations.set(key, allocation);
    }

    return this.allocations.get(key)!;
  }

  /**
   * Check quota
   */
  checkQuota(tier: SubscriptionTier, userId: string, feature: string, amount: number = 1): boolean {
    const allocation = this.getAllocation(tier, userId);
    const quota = allocation.quotas[feature];

    if (!quota) return true;

    if (quota.used + amount > quota.limit) {
      // Check burst
      const burstNeeded = quota.used + amount - quota.limit;

      if (allocation.burst.available >= burstNeeded) {
        return true;
      }

      logger.warn('Quota exceeded', { userId, feature, used: quota.used, limit: quota.limit });

      return false;
    }

    return true;
  }

  /**
   * Consume quota
   */
  consume(tier: SubscriptionTier, userId: string, feature: string, amount: number = 1): void {
    const allocation = this.getAllocation(tier, userId);
    const quota = allocation.quotas[feature];

    if (quota) {
      quota.used += amount;

      logger.debug('Quota consumed', { userId, feature, amount, used: quota.used });
    }
  }

  /**
   * Check threshold
   */
  checkThreshold(tier: SubscriptionTier, userId: string, feature: string, threshold: number = 0.8): boolean {
    const allocation = this.getAllocation(tier, userId);
    const quota = allocation.quotas[feature];

    if (!quota) return false;

    const usage = quota.used / quota.limit;

    return usage >= threshold;
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(tier: SubscriptionTier, userId: string, feature: string): number {
    const allocation = this.getAllocation(tier, userId);
    const quota = allocation.quotas[feature];

    if (!quota || quota.limit === Infinity) return 0;

    return (quota.used / quota.limit) * 100;
  }

  /**
   * Reset quota
   */
  resetQuota(tier: SubscriptionTier, userId: string, feature: string): void {
    const allocation = this.getAllocation(tier, userId);
    const quota = allocation.quotas[feature];

    if (quota) {
      quota.used = 0;
      quota.resetAt = this.getResetTime('monthly');

      logger.debug('Quota reset', { userId, feature });
    }
  }

  /**
   * Get reset time
   */
  private getResetTime(window: QuotaWindow): number {
    const now = new Date();

    switch (window) {
      case 'hourly':
        return now.getTime() + 3600000;
      case 'daily':
        return now.getTime() + 86400000;
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.getTime();
      default:
        return now.getTime();
    }
  }
}

// ==================== QUOTA ALLOCATION ====================

export class QuotaAllocationManager {
  private pooledQuotas = new Map<string, number>();
  private allocationCount = 0;

  /**
   * Create pool
   */
  createPool(poolId: string, totalQuota: number): void {
    this.pooledQuotas.set(poolId, totalQuota);

    logger.debug('Quota pool created', { poolId, totalQuota });
  }

  /**
   * Allocate from pool
   */
  allocateFromPool(poolId: string, userId: string, amount: number): boolean {
    const available = this.pooledQuotas.get(poolId) || 0;

    if (available >= amount) {
      this.pooledQuotas.set(poolId, available - amount);

      logger.debug('Quota allocated from pool', { poolId, userId, amount });

      return true;
    }

    return false;
  }

  /**
   * Get pool status
   */
  getPoolStatus(poolId: string): { total: number; available: number; used: number } {
    const available = this.pooledQuotas.get(poolId) || 0;
    const total = 1000000; // Default total

    return {
      total,
      available,
      used: total - available
    };
  }
}

// ==================== BURST CONTROLLER ====================

export class BurstController {
  private burst = new Map<string, { available: number; refillRate: number; lastRefill: number }>();
  private burstCount = 0;

  /**
   * Initialize burst
   */
  initializeBurst(userId: string, burstCapacity: number, refillRate: number): void {
    this.burst.set(userId, {
      available: burstCapacity,
      refillRate,
      lastRefill: Date.now()
    });

    logger.debug('Burst initialized', { userId, burstCapacity, refillRate });
  }

  /**
   * Check burst available
   */
  canBurst(userId: string, amount: number): boolean {
    const burst = this.burst.get(userId);

    if (!burst) return false;

    this.refillBurst(userId);

    return burst.available >= amount;
  }

  /**
   * Consume burst
   */
  consumeBurst(userId: string, amount: number): void {
    const burst = this.burst.get(userId);

    if (burst) {
      burst.available = Math.max(0, burst.available - amount);

      logger.debug('Burst consumed', { userId, amount, available: burst.available });
    }
  }

  /**
   * Refill burst
   */
  private refillBurst(userId: string): void {
    const burst = this.burst.get(userId);

    if (burst) {
      const elapsed = Date.now() - burst.lastRefill;
      const tokensToAdd = (elapsed / 1000) * burst.refillRate;

      burst.available = Math.min(100, burst.available + tokensToAdd);
      burst.lastRefill = Date.now();
    }
  }

  /**
   * Get burst status
   */
  getBurstStatus(userId: string): { available: number; capacity: number; refillRate: number } | null {
    const burst = this.burst.get(userId);

    if (!burst) return null;

    this.refillBurst(userId);

    return {
      available: Math.floor(burst.available),
      capacity: 100,
      refillRate: burst.refillRate
    };
  }
}

// ==================== QUOTA METRICS ====================

export class QuotaMetrics {
  private metrics = new Map<string, Record<string, any>>();
  private metricsCount = 0;

  /**
   * Record metric
   */
  recordMetric(userId: string, feature: string, value: number): void {
    const key = `${userId}:${feature}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        lastRecordedAt: Date.now()
      });
    }

    const metric = this.metrics.get(key)!;

    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.lastRecordedAt = Date.now();
  }

  /**
   * Get metrics
   */
  getMetrics(userId: string, feature: string): Record<string, any> | null {
    const key = `${userId}:${feature}`;

    const metric = this.metrics.get(key);

    if (!metric) return null;

    return {
      count: metric.count,
      average: metric.total / metric.count,
      min: metric.min,
      max: metric.max,
      total: metric.total,
      lastRecordedAt: metric.lastRecordedAt
    };
  }

  /**
   * Forecast usage
   */
  forecastUsage(userId: string, feature: string, daysAhead: number): number {
    const metric = this.getMetrics(userId, feature);

    if (!metric || metric.count === 0) return 0;

    const dailyAverage = metric.total / metric.count;

    return dailyAverage * daysAhead;
  }
}

// ==================== EXPORTS ====================

export const tieredQuotaManager = new TieredQuotaManager();
export const quotaAllocation = new QuotaAllocationManager();
export const burstController = new BurstController();
export const quotaMetrics = new QuotaMetrics();
