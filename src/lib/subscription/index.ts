/**
 * Subscription Management
 * Recurring billing and subscription handling
 */

import { randomBytes } from 'node:crypto';
import { query, queryOne } from '../postgres';

export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  paymentMethod?: string;
  autoRenew: boolean;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
}

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    maxPlaces: number;
    maxReviews: number;
    maxStorage: number; // MB
    maxTeamMembers: number;
    apiCalls: number;
  };
}

// Plan configurations
export const subscriptionPlans: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Ücretsiz',
    description: 'Temel özellikler',
    price: { monthly: 0, yearly: 0 },
    features: ['5 mekan ekleme', 'Temel analitik', 'E-posta desteği'],
    limits: { maxPlaces: 5, maxReviews: 100, maxStorage: 100, maxTeamMembers: 1, apiCalls: 1000 },
  },
  basic: {
    id: 'basic',
    name: 'Temel',
    description: 'Küçük işletmeler için',
    price: { monthly: 99, yearly: 990 },
    features: ['50 mekan ekleme', 'Gelişmiş analitik', 'Öncelikli destek', 'Reklam yönetimi'],
    limits: { maxPlaces: 50, maxReviews: 1000, maxStorage: 1000, maxTeamMembers: 3, apiCalls: 10000 },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Büyüyen işletmeler için',
    price: { monthly: 299, yearly: 2990 },
    features: ['Sınırsız mekan', 'Detaylı raporlar', '7/24 destek', 'API erişimi', 'Özelleştirme'],
    limits: { maxPlaces: 999999, maxReviews: 10000, maxStorage: 10000, maxTeamMembers: 10, apiCalls: 100000 },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Kurumsal',
    description: 'Özel çözümler',
    price: { monthly: 999, yearly: 9990 },
    features: ['Özel entegrasyonlar', 'Dedicated destek', 'SLA garantisi', 'Özel geliştirme'],
    limits: { maxPlaces: 999999, maxReviews: 999999, maxStorage: 100000, maxTeamMembers: 100, apiCalls: 1000000 },
  },
};

/**
 * Create new subscription
 */
export async function createSubscription(
  userId: string,
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
  paymentMethod?: string
): Promise<Subscription> {
  const planConfig = subscriptionPlans[plan];
  const now = new Date();
  
  // Calculate end date based on billing cycle
  const endDate = new Date(now);
  if (billingCycle === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const subscription: Subscription = {
    id: `sub_${Date.now()}_${randomBytes(6).toString('hex')}`,
    userId,
    plan,
    status: 'pending',
    price: planConfig.price[billingCycle],
    currency: 'TRY',
    billingCycle,
    startDate: now,
    endDate,
    nextBillingDate: endDate,
    paymentMethod,
    autoRenew: true,
  };

  await query(
    `INSERT INTO subscriptions (id, user_id, plan, status, price, currency, billing_cycle, 
                                start_date, end_date, next_billing_date, payment_method, auto_renew)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      subscription.id,
      subscription.userId,
      subscription.plan,
      subscription.status,
      subscription.price,
      subscription.currency,
      subscription.billingCycle,
      subscription.startDate,
      subscription.endDate,
      subscription.nextBillingDate,
      subscription.paymentMethod,
      subscription.autoRenew,
    ]
  );

  // Update user plan
  await query(
    `UPDATE users SET subscription_tier = $1, subscription_id = $2, updated_at = NOW() WHERE id = $3`,
    [plan, subscription.id, userId]
  );

  return subscription;
}

/**
 * Activate subscription after payment
 */
export async function activateSubscription(subscriptionId: string): Promise<void> {
  await query(
    `UPDATE subscriptions SET status = 'active', activated_at = NOW() WHERE id = $1`,
    [subscriptionId]
  );
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<void> {
  if (immediate) {
    await query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), auto_renew = false WHERE id = $1`,
      [subscriptionId]
    );
    
    // Downgrade user to free
    await query(
      `UPDATE users SET subscription_tier = 'free', subscription_id = NULL WHERE id = (SELECT user_id FROM subscriptions WHERE id = $1)`,
      [subscriptionId]
    );
  } else {
    // Cancel at end of period
    await query(
      `UPDATE subscriptions SET auto_renew = false, cancelled_at = NOW() WHERE id = $1`,
      [subscriptionId]
    );
  }
}

/**
 * Renew subscription
 */
export async function renewSubscription(subscriptionId: string): Promise<void> {
  // HARD RULE #47: atomic UPDATE — idempotency guard (renewed_at < 23h) prevents double-billing on concurrent calls
  const result = await queryOne<{ price: number }>(
    `UPDATE subscriptions
     SET end_date = end_date + (CASE WHEN billing_cycle = 'monthly' THEN INTERVAL '1 month' ELSE INTERVAL '1 year' END),
         next_billing_date = end_date + (CASE WHEN billing_cycle = 'monthly' THEN INTERVAL '1 month' ELSE INTERVAL '1 year' END),
         renewed_at = NOW()
     WHERE id = $1
       AND auto_renew = true
       AND (renewed_at IS NULL OR renewed_at < NOW() - INTERVAL '23 hours')
     RETURNING price`,
    [subscriptionId]
  );

  if (!result) return;
  await createInvoice(subscriptionId, result.price);
}

/**
 * Change subscription plan
 */
export async function changePlan(
  subscriptionId: string,
  newPlan: SubscriptionPlan
): Promise<void> {
  const newPlanConfig = subscriptionPlans[newPlan];
  
  await query(
    `UPDATE subscriptions SET plan = $1, price = $2, updated_at = NOW() WHERE id = $3`,
    [newPlan, newPlanConfig.price.monthly, subscriptionId]
  );

  await query(
    `UPDATE users SET subscription_tier = $1 WHERE id = (SELECT user_id FROM subscriptions WHERE id = $2)`,
    [newPlan, subscriptionId]
  );
}

/**
 * Get user subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const result = await query(
    `SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'pending') ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    price: row.price,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    nextBillingDate: new Date(row.next_billing_date),
    paymentMethod: row.payment_method,
    autoRenew: row.auto_renew,
    cancelledAt: row.cancelled_at,
    metadata: row.metadata,
  };
}

/**
 * Check if user has feature access
 */
export async function hasFeatureAccess(
  userId: string,
  feature: keyof PlanConfig['limits']
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const sub = await getUserSubscription(userId);
  const plan = sub ? subscriptionPlans[sub.plan] : subscriptionPlans.free;
  const limit = plan.limits[feature];

  // Get current usage
  let current = 0;
  switch (feature) {
    case 'maxPlaces':
      const placesResult = await query('SELECT COUNT(*) FROM places WHERE created_by = $1', [userId]);
      current = parseInt(placesResult.rows[0].count);
      break;
    case 'maxReviews':
      const reviewsResult = await query('SELECT COUNT(*) FROM reviews WHERE user_id = $1', [userId]);
      current = parseInt(reviewsResult.rows[0].count);
      break;
    case 'maxTeamMembers':
      const teamResult = await query('SELECT COUNT(*) FROM tenant_members WHERE user_id = $1', [userId]);
      current = parseInt(teamResult.rows[0].count);
      break;
  }

  return { allowed: current < limit, current, limit };
}

/**
 * Get subscription usage
 */
export async function getSubscriptionUsage(userId: string): Promise<Record<string, { current: number; limit: number; percentage: number }>> {
  const sub = await getUserSubscription(userId);
  const plan = sub ? subscriptionPlans[sub.plan] : subscriptionPlans.free;

  const usage: Record<string, { current: number; limit: number; percentage: number }> = {};

  for (const [feature, limit] of Object.entries(plan.limits)) {
    const { current } = await hasFeatureAccess(userId, feature as any);
    usage[feature] = {
      current,
      limit,
      percentage: Math.round((current / limit) * 100),
    };
  }

  return usage;
}

/**
 * Process expiring subscriptions
 * Call this daily via cron
 */
export async function processExpiringSubscriptions(): Promise<{
  renewed: number;
  expired: number;
  notified: number;
}> {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Get subscriptions expiring in 3 days
  const expiringResult = await query(
    `SELECT * FROM subscriptions 
    WHERE status = 'active' AND auto_renew = true 
    AND next_billing_date <= $1 AND next_billing_date > NOW()`,
    [threeDaysFromNow]
  );

  let renewed = 0;
  let expired = 0;
  let notified = 0;

  for (const sub of expiringResult.rows) {
    try {
      // Attempt to renew
      await renewSubscription(sub.id);
      renewed++;
    } catch {
      // Notify user of failed renewal
      notified++;
    }
  }

  // Expire subscriptions past end date
  const expiredResult = await query(
    `UPDATE subscriptions SET status = 'expired' 
    WHERE status = 'active' AND end_date < NOW() AND auto_renew = false
    RETURNING id`
  );
  expired = expiredResult.rows.length;

  return { renewed, expired, notified };
}

/**
 * Create invoice for subscription
 */
async function createInvoice(subscriptionId: string, amount: number): Promise<string> {
  const invoiceId = `inv_${Date.now()}`;
  
  await query(
    `INSERT INTO invoices (id, subscription_id, amount, currency, status, created_at)
     VALUES ($1, $2, $3, 'TRY', 'pending', NOW())`,
    [invoiceId, subscriptionId, amount]
  );

  return invoiceId;
}
