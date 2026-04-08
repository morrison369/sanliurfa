/**
 * Usage Tracking Library
 * Track and enforce usage quotas for limited premium features
 */

import { queryOne, queryMany, update as updateDb } from './postgres';
import { getActiveSubscription } from './subscription-management';
import { logger } from './logging';

/**
 * Quota configuration per tier and feature
 * Format: { [featureName]: { [tierLevel]: limit } }
 * null/undefined = unlimited
 */
export const FEATURE_QUOTAS = {
  // Reviews: Free=10/month, Basic+=Unlimited
  UNLIMITED_REVIEWS: {
    0: 10, // Free tier
    1: null, // Basic+: unlimited
    2: null,
    3: null,
  },

  // Favorites/Collections: Free=50, Basic+=Unlimited
  UNLIMITED_FAVORITES: {
    0: 50,
    1: null,
    2: null,
    3: null,
  },

  // Event RSVP: Free=20/month, Basic+=Unlimited
  UNLIMITED_RSVP: {
    0: 20,
    1: null,
    2: null,
    3: null,
  },

  // Photo uploads: Free=0, Basic+=Unlimited (5/day)
  PHOTO_UPLOADS: {
    0: 0,
    1: 5,
    2: null,
    3: null,
  },

  // Coupon usage: Free=0, Basic+=Unlimited
  COUPON_USAGE: {
    0: 0,
    1: null,
    2: null,
    3: null,
  },
} as const;

export type QuotaFeature = keyof typeof FEATURE_QUOTAS;

/**
 * Usage record in database
 */
export interface UsageRecord {
  id: string;
  userId: string;
  featureName: string;
  limitValue: number | null;
  currentUsage: number;
  resetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get or initialize usage tracking for a feature
 */
async function getOrInitializeUsage(userId: string, feature: QuotaFeature): Promise<UsageRecord> {
  try {
    // Check if record exists
    const existing = await queryOne(
      `SELECT id, user_id, feature_name, limit_value, current_usage, reset_date, created_at, updated_at
       FROM feature_access
       WHERE user_id = $1 AND feature_name = $2`,
      [userId, feature]
    );

    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        featureName: existing.feature_name,
        limitValue: existing.limit_value,
        currentUsage: existing.current_usage,
        resetDate: existing.reset_date,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // Get user's subscription tier to determine limit
    const subscription = await getActiveSubscription(userId);
    const tierLevel = subscription?.tier?.tierLevel ?? 0;
    const quotaConfig = FEATURE_QUOTAS[feature];
    const limitValue = quotaConfig?.[tierLevel as keyof typeof quotaConfig] ?? null;

    // Calculate next reset date (30 days from now for monthly reset)
    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + 30);

    // Initialize new record
    const newRecord = await queryOne(
      `INSERT INTO feature_access (user_id, feature_name, limit_value, current_usage, reset_date, created_at, updated_at)
       VALUES ($1, $2, $3, 0, $4, NOW(), NOW())
       ON CONFLICT (user_id, feature_name) DO UPDATE
       SET limit_value = $3, updated_at = NOW()
       RETURNING id, user_id, feature_name, limit_value, current_usage, reset_date, created_at, updated_at`,
      [userId, feature, limitValue, nextResetDate.toISOString()]
    );

    return {
      id: newRecord.id,
      userId: newRecord.user_id,
      featureName: newRecord.feature_name,
      limitValue: newRecord.limit_value,
      currentUsage: newRecord.current_usage,
      resetDate: newRecord.reset_date,
      createdAt: newRecord.created_at,
      updatedAt: newRecord.updated_at,
    };
  } catch (error) {
    logger.error('Failed to get or initialize usage', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check if user has exceeded quota for a feature
 * Returns: { canUse: boolean, current: number, limit: number|null, remaining: number|null }
 */
export async function checkQuota(userId: string, feature: QuotaFeature): Promise<{
  canUse: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}> {
  try {
    const usage = await getOrInitializeUsage(userId, feature);

    // Reset if date has passed
    if (usage.resetDate && new Date(usage.resetDate) < new Date()) {
      await resetUsage(userId, feature);
      return {
        canUse: true,
        current: 0,
        limit: usage.limitValue,
        remaining: usage.limitValue,
      };
    }

    // No limit = unlimited
    if (usage.limitValue === null) {
      return {
        canUse: true,
        current: usage.currentUsage,
        limit: null,
        remaining: null,
      };
    }

    const canUse = usage.currentUsage < usage.limitValue;
    const remaining = usage.limitValue - usage.currentUsage;

    return {
      canUse,
      current: usage.currentUsage,
      limit: usage.limitValue,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    logger.error('Failed to check quota', error instanceof Error ? error : new Error(String(error)));
    // Fail open - allow usage on error
    return { canUse: true, current: 0, limit: null, remaining: null };
  }
}

/**
 * Increment usage counter for a feature
 * Returns the new usage count
 */
export async function incrementUsage(userId: string, feature: QuotaFeature, amount: number = 1): Promise<number> {
  try {
    await getOrInitializeUsage(userId, feature);

    const result = await queryOne(
      `UPDATE feature_access
       SET current_usage = current_usage + $1, updated_at = NOW()
       WHERE user_id = $2 AND feature_name = $3
       RETURNING current_usage`,
      [amount, userId, feature]
    );

    return result?.current_usage ?? 0;
  } catch (error) {
    logger.error('Failed to increment usage', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Reset usage counter for a feature
 */
export async function resetUsage(userId: string, feature: QuotaFeature): Promise<void> {
  try {
    // Get quota limit for user's current tier
    const subscription = await getActiveSubscription(userId);
    const tierLevel = subscription?.tier?.tierLevel ?? 0;
    const quotaConfig = FEATURE_QUOTAS[feature];
    const limitValue = quotaConfig?.[tierLevel as keyof typeof quotaConfig] ?? null;

    // Calculate next reset date
    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + 30);

    await updateDb('feature_access', userId, {
      current_usage: 0,
      limit_value: limitValue,
      reset_date: nextResetDate.toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset usage', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all usage records for a user
 */
export async function getUserUsage(userId: string): Promise<UsageRecord[]> {
  try {
    const results = await queryMany(
      `SELECT id, user_id, feature_name, limit_value, current_usage, reset_date, created_at, updated_at
       FROM feature_access
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      featureName: r.feature_name,
      limitValue: r.limit_value,
      currentUsage: r.current_usage,
      resetDate: r.reset_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    logger.error('Failed to get user usage', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get quota status message
 */
export function getQuotaMessage(feature: QuotaFeature, quota: { current: number; limit: number | null; remaining: number | null }): string {
  if (quota.limit === null) {
    return 'Sınırsız';
  }

  const percentageUsed = Math.round((quota.current / quota.limit) * 100);

  if (percentageUsed >= 100) {
    return `Kotanız tükendi. Sıfırlanması: 30 gün sonra`;
  }

  if (percentageUsed >= 80) {
    return `⚠️ ${quota.remaining} / ${quota.limit} kaldı`;
  }

  return `${quota.remaining} / ${quota.limit} kullanabilirsiniz`;
}

/**
 * Bulk update quotas when user subscription changes
 */
export async function updateUserQuotas(userId: string): Promise<void> {
  try {
    const subscription = await getActiveSubscription(userId);
    const tierLevel = subscription?.tier?.tierLevel ?? 0;

    // Update all feature quotas for this user
    const allFeatures = Object.keys(FEATURE_QUOTAS) as QuotaFeature[];

    for (const feature of allFeatures) {
      const quotaConfig = FEATURE_QUOTAS[feature];
      const limitValue = quotaConfig?.[tierLevel as keyof typeof quotaConfig] ?? null;

      await queryOne(
        `UPDATE feature_access
         SET limit_value = $1, updated_at = NOW()
         WHERE user_id = $2 AND feature_name = $3`,
        [limitValue, userId, feature]
      );
    }

    logger.info('Updated user quotas after subscription change', { userId, tierLevel });
  } catch (error) {
    logger.error('Failed to update user quotas', error instanceof Error ? error : new Error(String(error)));
  }
}
