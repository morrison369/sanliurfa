/**
 * Web Push Notifications
 * - VAPID key management
 * - Push subscription handling
 * - Notification sending
 */

import webpush from 'web-push';
import { pool } from '../postgres';
import { logger } from '../logger';
import { getCache, setCache, deleteCache } from '../cache';

// VAPID keys from environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sanliurfa.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeUser(
  userId: string,
  subscription: PushSubscriptionData,
  userAgent?: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE
       SET user_id = $1, last_used_at = NOW()
       WHERE push_subscriptions.user_id = $1`,
      [userId, subscription.endpoint, subscription.p256dh, subscription.auth, userAgent || null, ipAddress || null]
    );

    // Clear user subscriptions cache
    await deleteCache(`push:subscriptions:${userId}`);

    logger.info('Push subscription added', { userId, endpoint: subscription.endpoint });
    return true;
  } catch (error) {
    logger.error('Push subscription failed', error instanceof Error ? error : new Error(String(error)) as any, {
      userId
    });
    return false;
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeUser(
  endpoint: string,
  userId?: string
): Promise<boolean> {
  try {
    let query = `DELETE FROM push_subscriptions WHERE endpoint = $1`;
    let params: any[] = [endpoint];

    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    await pool.query(query, params);

    if (userId) {
      await deleteCache(`push:subscriptions:${userId}`);
    }

    logger.info('Push subscription removed', { endpoint, ...(userId ? { userId } : {}) });
    return true;
  } catch (error) {
    logger.error('Push unsubscription failed', error instanceof Error ? error : new Error(String(error)) as any);
    return false;
  }
}

/**
 * Get user's push subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  try {
    const cacheKey = `push:subscriptions:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached as any;
    }

    const result = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions
       WHERE user_id = $1 AND active = true AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    const subscriptions = result.rows.map((row: any) => ({
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth
    }));

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(subscriptions), 3600);

    return subscriptions;
  } catch (error) {
    logger.error('Failed to get user subscriptions', error instanceof Error ? error : new Error(String(error)) as any);
    return [];
  }
}

/**
 * Send push notification to user
 */
export async function sendPushToUser(
  userId: string,
  notification: {
    title: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
  }
): Promise<{ sent: number; failed: number }> {
  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      logger.warn('No active subscriptions for user', Object.assign(new Error('No active subscriptions for user'), { userId }));
      return { sent: 0, failed: 0 };
    }

    // Record notification
    const notifResult = await pool.query(
      `INSERT INTO push_notifications (title, body, icon, badge, tag, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        notification.title,
        notification.body || null,
        notification.icon || null,
        notification.badge || null,
        notification.tag || null,
        notification.data ? JSON.stringify(notification.data) : null
      ]
    );

    const notificationId = notifResult.rows[0]?.id;
    const payloadJson = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      tag: notification.tag,
      data: notification.data,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
    });

    // Send all subscriptions in parallel
    const sendResults = await Promise.all(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson
        )
        .then(() => ({ endpoint: sub.endpoint, ok: true as const }))
        .catch((err: unknown) => ({
          endpoint: sub.endpoint,
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        }))
      )
    );

    const sentEndpoints: string[] = [];
    const failedEntries: Array<{ endpoint: string; error: string }> = [];
    const expiredEndpoints: string[] = [];

    for (const r of sendResults) {
      if (r.ok) {
        sentEndpoints.push(r.endpoint);
      } else {
        failedEntries.push({ endpoint: r.endpoint, error: r.error });
        logger.warn('Push notification failed for subscription', { userId, endpoint: r.endpoint, error: r.error });
        if (r.error.includes('410')) expiredEndpoints.push(r.endpoint);
      }
    }

    const sentCount = sentEndpoints.length;
    const failedCount = failedEntries.length;

    // Batch log deliveries + update counts + unsubscribe expired — all in parallel
    await Promise.all([
      sentEndpoints.length > 0
        ? pool.query(
            `INSERT INTO push_deliveries (notification_id, subscription_id, status)
             SELECT $1, id, 'sent' FROM push_subscriptions WHERE endpoint = ANY($2)`,
            [notificationId, sentEndpoints]
          ).catch(() => null)
        : Promise.resolve(),
      failedEntries.length > 0
        ? pool.query(
            `INSERT INTO push_deliveries (notification_id, subscription_id, status, error_message)
             SELECT $1, ps.id, 'failed', f.error_message
             FROM UNNEST($2::text[], $3::text[]) AS f(endpoint, error_message)
             JOIN push_subscriptions ps ON ps.endpoint = f.endpoint`,
            [notificationId, failedEntries.map(e => e.endpoint), failedEntries.map(e => e.error)]
          ).catch(() => null)
        : Promise.resolve(),
      pool.query(
        `UPDATE push_notifications SET sent_count = $1, failed_count = $2 WHERE id = $3`,
        [sentCount, failedCount, notificationId]
      ).catch(() => null),
      expiredEndpoints.length > 0
        ? Promise.all(expiredEndpoints.map(ep => unsubscribeUser(ep, userId))).catch(() => null)
        : Promise.resolve(),
    ]);

    logger.info('Push notifications sent', { userId, sentCount, failedCount });
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    logger.error('Send push notifications failed', error instanceof Error ? error : new Error(String(error)));
    return { sent: 0, failed: 0 };
  }
}

/**
 * Broadcast push notification to all active users (admin only)
 */
export async function broadcastPushNotification(
  notification: {
    title: string;
    body?: string;
    icon?: string;
    data?: Record<string, any>;
  }
): Promise<{ sent: number; failed: number }> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT user_id FROM push_subscriptions WHERE active = true`
    );

    let totalSent = 0;
    let totalFailed = 0;

    const settled = await Promise.allSettled(
      result.rows.map((row: any) => sendPushToUser(row.user_id, notification))
    );
    settled.forEach((r) => {
      if (r.status === 'fulfilled') {
        totalSent += r.value.sent;
        totalFailed += r.value.failed;
      } else {
        totalFailed++;
      }
    });

    logger.info('Broadcast push completed', { totalSent, totalFailed });
    return { sent: totalSent, failed: totalFailed };
  } catch (error) {
    logger.error('Broadcast push failed', error instanceof Error ? error : new Error(String(error)) as any);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Clean up expired subscriptions
 */
export async function cleanupExpiredSubscriptions(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM push_subscriptions WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );

    if ((result.rowCount || 0) > 0) {
      logger.info('Cleaned up expired subscriptions', { count: result.rowCount });
    }

    return result.rowCount || 0;
  } catch (error) {
    logger.error('Cleanup subscriptions failed', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

// Export VAPID public key for client
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}


