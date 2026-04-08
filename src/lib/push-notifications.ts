/**
 * Push Notifications Library
 * Web push subscriptions and delivery
 */
import { queryOne, queryMany, insert, update, delete as deleteQuery } from './postgres';
import { logger } from './logging';

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

    // Update or create stats
    const stats = await queryOne('SELECT id FROM push_subscription_stats WHERE user_id = $1', [userId]);
    if (stats) {
      await update('push_subscription_stats', { user_id: userId }, {
        total_subscriptions: (await queryMany('SELECT COUNT(*) FROM push_subscriptions WHERE user_id = $1 AND is_active = true', [userId])).length,
        updated_at: new Date()
      });
    } else {
      await insert('push_subscription_stats', {
        user_id: userId,
        total_subscriptions: 1
      });
    }

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

    const activeCount = await queryOne(
      'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    await update('push_subscription_stats', { user_id: userId }, {
      total_subscriptions: parseInt(activeCount?.count || '0'),
      updated_at: new Date()
    });

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

    const subscriptions = await queryMany(query, params);
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
       AND last_verified_at < NOW() - INTERVAL '${daysInactive} days'
       RETURNING COUNT(*) as count`
    );

    const count = parseInt(result?.count || '0');
    if (count > 0) {
      logger.info('Cleaned up inactive push subscriptions', { count, daysInactive });
    }
    return count;
  } catch (error) {
    logger.error('Failed to cleanup subscriptions', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}
