/**
 * Usage Tracking Library
 * Track and enforce usage quotas for limited premium features
 */

import { queryOne, queryMany } from '../postgres';
import { getActiveSubscription } from '../subscription/subscription-management';
import { logger } from '../logger';
import { PHASE1_FREE_MODE } from '../runtime/phase-policy';

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
  if (PHASE1_FREE_MODE) {
    return {
      canUse: true,
      current: 0,
      limit: null,
      remaining: null,
    };
  }

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
 * Atomically check quota and increment if allowed (HARD RULE #47).
 * Use instead of separate checkQuota + incrementUsage to prevent race conditions.
 */
export async function checkAndIncrementQuota(
  userId: string,
  feature: QuotaFeature,
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  if (PHASE1_FREE_MODE) {
    return { allowed: true, current: 0, limit: null };
  }

  try {
    await getOrInitializeUsage(userId, feature);

    // Reset if period has passed, then allow
    const record = await queryOne(
      `SELECT current_usage, limit_value, reset_date FROM feature_access WHERE user_id = $1 AND feature_name = $2`,
      [userId, feature],
    );
    if (record?.reset_date && new Date(record.reset_date) < new Date()) {
      // Atomic reset + first increment — avoids 3-step SELECT → resetUsage → UPDATE race
      const subscription = await getActiveSubscription(userId);
      const tierLevel = subscription?.tier?.tierLevel ?? 0;
      const quotaConfig = FEATURE_QUOTAS[feature];
      const limitValue = quotaConfig?.[tierLevel as keyof typeof quotaConfig] ?? null;
      const nextResetDate = new Date();
      nextResetDate.setDate(nextResetDate.getDate() + 30);
      const resetResult = await queryOne<{ current_usage: number; limit_value: number | null }>(
        `UPDATE feature_access
         SET current_usage = 1, limit_value = $1, reset_date = $2, updated_at = NOW()
         WHERE user_id = $3 AND feature_name = $4
         RETURNING current_usage, limit_value`,
        [limitValue, nextResetDate.toISOString(), userId, feature],
      );
      return { allowed: true, current: resetResult?.current_usage ?? 1, limit: resetResult?.limit_value ?? null };
    }

    // Atomic increment with limit guard
    const result = await queryOne<{ current_usage: number; limit_value: number | null }>(
      `UPDATE feature_access
       SET current_usage = current_usage + 1, updated_at = NOW()
       WHERE user_id = $1 AND feature_name = $2
         AND (limit_value IS NULL OR current_usage + 1 <= limit_value)
       RETURNING current_usage, limit_value`,
      [userId, feature],
    );

    if (!result) {
      const cur = await queryOne<{ current_usage: number; limit_value: number | null }>(
        `SELECT current_usage, limit_value FROM feature_access WHERE user_id = $1 AND feature_name = $2`,
        [userId, feature],
      );
      return { allowed: false, current: cur?.current_usage ?? 0, limit: cur?.limit_value ?? null };
    }

    return { allowed: true, current: result.current_usage, limit: result.limit_value };
  } catch (error) {
    logger.error('Failed to check and increment quota', error instanceof Error ? error : new Error(String(error)));
    return { allowed: true, current: 0, limit: null }; // fail open
  }
}

/**
 * Increment usage counter for a feature
 * Returns the new usage count
 */
export async function incrementUsage(userId: string, feature: QuotaFeature, amount: number = 1): Promise<number> {
  if (PHASE1_FREE_MODE) {
    return 0;
  }

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

    await queryOne(
      `UPDATE feature_access
       SET current_usage = 0, limit_value = $1, reset_date = $2, updated_at = NOW()
       WHERE user_id = $3 AND feature_name = $4`,
      [limitValue, nextResetDate.toISOString(), userId, feature]
    );
  } catch (error) {
    logger.error('Failed to reset usage', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all usage records for a user
 */
export async function getUserUsage(userId: string): Promise<UsageRecord[]> {
  if (PHASE1_FREE_MODE) {
    const now = new Date().toISOString();
    return (Object.keys(FEATURE_QUOTAS) as QuotaFeature[]).map((feature) => ({
      id: `phase1-${feature.toLowerCase()}`,
      userId,
      featureName: feature,
      limitValue: null,
      currentUsage: 0,
      resetDate: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

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
export function getQuotaMessage(_feature: QuotaFeature, quota: { current: number; limit: number | null; remaining: number | null }): string {
  if (quota.limit === null) {
    return 'Faz 1 kapsamında sınırsız';
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

    await Promise.all(
      allFeatures.map((feature) => {
        const quotaConfig = FEATURE_QUOTAS[feature];
        const limitValue = quotaConfig?.[tierLevel as keyof typeof quotaConfig] ?? null;
        return queryOne(
          `UPDATE feature_access
           SET limit_value = $1, updated_at = NOW()
           WHERE user_id = $2 AND feature_name = $3`,
          [limitValue, userId, feature]
        );
      })
    );

    logger.info('Updated user quotas after subscription change', { userId, tierLevel });
  } catch (error) {
    logger.error('Failed to update user quotas', error instanceof Error ? error : new Error(String(error)));
  }
}


