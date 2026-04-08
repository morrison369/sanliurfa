/**
 * Subscription Management Library
 * Handle subscription tiers, billing, and feature access
 */

import { query, queryOne, queryMany, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  tierLevel: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  subscriptionType: string;
  status: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  billingCycle: string;
  nextBillingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureAccess {
  userId: string;
  featureName: string;
  accessLevel: string;
  limitValue?: number;
  currentUsage: number;
}

/**
 * Get all subscription tiers
 */
export async function getSubscriptionTiers(): Promise<SubscriptionTier[]> {
  try {
    const cacheKey = 'sanliurfa:subscription:tiers';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryMany(
      `SELECT id, name, display_name, description, monthly_price, annual_price, tier_level, is_active
       FROM subscription_tiers
       WHERE is_active = true
       ORDER BY tier_level ASC`,
      []
    );

    const tiers: SubscriptionTier[] = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      displayName: r.display_name,
      description: r.description,
      monthlyPrice: r.monthly_price,
      annualPrice: r.annual_price,
      tierLevel: r.tier_level,
      isActive: r.is_active
    }));

    await setCache(cacheKey, JSON.stringify(tiers), 86400);

    return tiers;
  } catch (error) {
    logger.error('Failed to get subscription tiers', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get user's active subscription
 */
export async function getActiveSubscription(userId: string): Promise<(Subscription & { tier: SubscriptionTier }) | null> {
  try {
    const cacheKey = `sanliurfa:subscription:user:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryOne(
      `SELECT s.*, st.name, st.display_name, st.description, st.monthly_price, st.annual_price, st.tier_level
       FROM subscriptions s
       LEFT JOIN subscription_tiers st ON s.tier_id = st.id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!result) {
      return null;
    }

    const subscription = {
      id: result.id,
      userId: result.user_id,
      tierId: result.tier_id,
      subscriptionType: result.subscription_type,
      status: result.status,
      startDate: result.start_date,
      endDate: result.end_date,
      autoRenew: result.auto_renew,
      billingCycle: result.billing_cycle,
      nextBillingDate: result.next_billing_date,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      tier: {
        id: result.tier_id,
        name: result.name,
        displayName: result.display_name,
        description: result.description,
        monthlyPrice: result.monthly_price,
        annualPrice: result.annual_price,
        tierLevel: result.tier_level,
        isActive: true
      }
    };

    await setCache(cacheKey, JSON.stringify(subscription), 3600);

    return subscription;
  } catch (error) {
    logger.error('Failed to get active subscription', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get tier features
 */
export async function getTierFeatures(tierId: string): Promise<any[]> {
  try {
    const results = await queryMany(
      `SELECT feature_name, feature_limit, description
       FROM tier_features
       WHERE tier_id = $1
       ORDER BY feature_name ASC`,
      [tierId]
    );

    return results.map((r: any) => ({
      featureName: r.feature_name,
      featureLimit: r.feature_limit,
      description: r.description
    }));
  } catch (error) {
    logger.error('Failed to get tier features', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Check if user has access to a feature
 */
export async function checkFeatureAccess(userId: string, featureName: string): Promise<boolean> {
  try {
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
      // Free tier default access
      return featureName === 'basic_search' || featureName === 'view_reviews';
    }

    const features = await getTierFeatures(subscription.tier.id);
    return features.some(f => f.featureName === featureName);
  } catch (error) {
    logger.error('Failed to check feature access', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get user's feature access
 */
export async function getUserFeatureAccess(userId: string): Promise<FeatureAccess[]> {
  try {
    const results = await queryMany(
      `SELECT user_id, feature_name, access_level, limit_value, current_usage
       FROM feature_access
       WHERE user_id = $1`,
      [userId]
    );

    return results.map((r: any) => ({
      userId: r.user_id,
      featureName: r.feature_name,
      accessLevel: r.access_level,
      limitValue: r.limit_value,
      currentUsage: r.current_usage
    }));
  } catch (error) {
    logger.error('Failed to get user feature access', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Upgrade subscription to a new tier
 */
export async function upgradeSubscription(
  userId: string,
  newTierId: string,
  billingCycle: string = 'monthly'
): Promise<Subscription | null> {
  try {
    // Cancel existing active subscription
    const existing = await getActiveSubscription(userId);
    if (existing) {
      await query(
        'UPDATE subscriptions SET status = $1 WHERE id = $2',
        ['cancelled', existing.id]
      );
    }

    // Create new subscription
    const result = await insert('subscriptions', {
      user_id: userId,
      tier_id: newTierId,
      subscription_type: 'premium',
      status: 'active',
      start_date: new Date().toISOString(),
      auto_renew: true,
      billing_cycle: billingCycle,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:subscription:user:${userId}`);

    logger.info('Subscription upgraded', { userId, newTierId });

    return {
      id: result.id,
      userId: result.user_id,
      tierId: result.tier_id,
      subscriptionType: result.subscription_type,
      status: result.status,
      startDate: result.start_date,
      endDate: result.end_date,
      autoRenew: result.auto_renew,
      billingCycle: result.billing_cycle,
      nextBillingDate: result.next_billing_date,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to upgrade subscription', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const subscription = await queryOne(
      'SELECT user_id FROM subscriptions WHERE id = $1',
      [subscriptionId]
    );

    if (!subscription) {
      return false;
    }

    await query(
      'UPDATE subscriptions SET status = $1 WHERE id = $2',
      ['cancelled', subscriptionId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:subscription:user:${subscription.user_id}`);

    logger.info('Subscription cancelled', { subscriptionId });

    return true;
  } catch (error) {
    logger.error('Failed to cancel subscription', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Record billing history
 */
export async function recordBilling(
  subscriptionId: string,
  userId: string,
  amount: number,
  paymentStatus: string = 'completed'
): Promise<boolean> {
  try {
    await insert('billing_history', {
      subscription_id: subscriptionId,
      user_id: userId,
      amount,
      currency: 'TRY',
      payment_status: paymentStatus,
      payment_date: paymentStatus === 'completed' ? new Date().toISOString() : null,
      billing_period_start: new Date().toISOString(),
      billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    logger.info('Billing recorded', { subscriptionId, amount });

    return true;
  } catch (error) {
    logger.error('Failed to record billing', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get user's billing history
 */
export async function getBillingHistory(userId: string, limit: number = 12): Promise<any[]> {
  try {
    const results = await queryMany(
      `SELECT id, amount, currency, payment_status, invoice_number, payment_date, created_at
       FROM billing_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      paymentStatus: r.payment_status,
      invoiceNumber: r.invoice_number,
      paymentDate: r.payment_date,
      createdAt: r.created_at
    }));
  } catch (error) {
    logger.error('Failed to get billing history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Check feature usage limit
 */
export async function checkFeatureUsage(userId: string, featureName: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const access = await queryOne(
      'SELECT limit_value, current_usage FROM feature_access WHERE user_id = $1 AND feature_name = $2',
      [userId, featureName]
    );

    if (!access || !access.limit_value) {
      return { allowed: true, remaining: -1 };
    }

    const remaining = access.limit_value - access.current_usage;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining)
    };
  } catch (error) {
    logger.error('Failed to check feature usage', error instanceof Error ? error : new Error(String(error)));
    return { allowed: false, remaining: 0 };
  }
}

/**
 * Increment feature usage
 */
export async function incrementFeatureUsage(userId: string, featureName: string): Promise<boolean> {
  try {
    await query(
      `UPDATE feature_access
       SET current_usage = current_usage + 1
       WHERE user_id = $1 AND feature_name = $2`,
      [userId, featureName]
    );

    return true;
  } catch (error) {
    logger.error('Failed to increment feature usage', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
