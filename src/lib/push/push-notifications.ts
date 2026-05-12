/**
 * Push Notifications Library
 * Web push subscriptions and delivery
 */
import { queryOne, queryMany, insert, update } from '../postgres';
import { logger } from '../logger';

export async function subscribeToPushNotifications(
  userId: string,
  endpoint: string,
  authKey: string,
  p256dhKey: string,
  metadata?: any
): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('push_subscriptions', {
      id,
      user_id: userId,
      endpoint,
      auth_key: authKey,
      p256dh_key: p256dhKey,
      device_type: metadata?.deviceType,
      device_name: metadata?.deviceName,
      browser: metadata?.browser,
      os: metadata?.os,
      is_active: true
    }, true);

    // Atomic upsert stats — avoids SELECT+INSERT/UPDATE race + fixes .length=1 bug (HARD RULE #47)
    await queryOne(
      `INSERT INTO push_subscription_stats (user_id, total_subscriptions, updated_at)
       SELECT $1, COUNT(*), NOW() FROM push_subscriptions WHERE user_id = $1 AND is_active = true
       ON CONFLICT (user_id) DO UPDATE SET
         total_subscriptions = EXCLUDED.total_subscriptions,
         updated_at = EXCLUDED.updated_at`,
      [userId]
    );

    logger.info('User subscribed to push notifications', { userId, deviceType: metadata?.deviceType });
    return id;
  } catch (error) {
    logger.error('Failed to subscribe to push', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(userId: string, endpoint: string): Promise<void> {
  try {
    await update('push_subscriptions', { user_id: userId, endpoint }, {
      is_active: false,
      updated_at: new Date()
    });

    // Atomic subquery update — avoids SELECT COUNT + UPDATE race (HARD RULE #47)
    await queryOne(
      `UPDATE push_subscription_stats
       SET total_subscriptions = (
         SELECT COUNT(*) FROM push_subscriptions WHERE user_id = $1 AND is_active = true
       ), updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    logger.info('User unsubscribed from push notifications', { userId });
  } catch (error) {
    logger.error('Failed to unsubscribe from push', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getPushSubscriptions(userId: string, activeOnly: boolean = true): Promise<any[]> {
  try {
    let query = 'SELECT * FROM push_subscriptions WHERE user_id = $1';
    const params: any[] = [userId];

    if (activeOnly) {
      query += ' AND is_active = $2';
      params.push(true);
    }

    query += ' ORDER BY created_at DESC';

    const subscriptions = await queryMany(query, params) as any[];
    return subscriptions;
  } catch (error) {
    logger.error('Failed to get push subscriptions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function verifyPushSubscription(subscriptionId: string): Promise<void> {
  try {
    await update('push_subscriptions', { id: subscriptionId }, {
      last_verified_at: new Date(),
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to verify subscription', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getPushSubscriptionStats(userId: string): Promise<any> {
  try {
    const stats = await queryOne(
      'SELECT * FROM push_subscription_stats WHERE user_id = $1',
      [userId]
    );

    if (!stats) {
      return {
        totalSubscriptions: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastPushAt: null
      };
    }

    return {
      totalSubscriptions: stats.total_subscriptions,
      successfulDeliveries: stats.successful_deliveries,
      failedDeliveries: stats.failed_deliveries,
      lastPushAt: stats.last_push_at
    };
  } catch (error) {
    logger.error('Failed to get push stats', error instanceof Error ? error : new Error(String(error)));
    return { totalSubscriptions: 0, successfulDeliveries: 0, failedDeliveries: 0, lastPushAt: null };
  }
}

export async function cleanupInactiveSubscriptions(daysInactive: number = 30): Promise<number> {
  try {
    const result = await queryOne(
      `UPDATE push_subscriptions
       SET is_active = false
       WHERE is_active = true
       AND last_verified_at < NOW() - ($1 * INTERVAL '1 day')
       RETURNING COUNT(*) as count`,
      [daysInactive]
    );

    const count = parseInt(result?.count || '0', 10);
    if (count > 0) {
      logger.info('Cleaned up inactive push subscriptions', { count, daysInactive });
    }
    return count;
  } catch (error) {
    logger.error('Failed to cleanup subscriptions', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}


