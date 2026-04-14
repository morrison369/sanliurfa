/**
 * Web Push Notifications
 * Browser push notification support
 */

import { query } from '../postgres';

// Web Push requires these imports in Node environment
let webPush: any;
try {
  webPush = require('web-push');
} catch {
  // web-push not available in browser
}

export interface PushSubscription {
  id?: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: Record<string, any>;
  url?: string;
}

// VAPID keys should be set from environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@sanliurfa.com';

if (webPush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function saveSubscription(subscription: PushSubscription): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET 
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent`,
    [subscription.userId, subscription.endpoint, subscription.p256dh, subscription.auth, subscription.userAgent]
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function unsubscribeUser(userId: string, endpoint?: string): Promise<void> {
  if (endpoint) {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
  } else {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
  }
}

export async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
  const result = await query(
    'SELECT * FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

export async function sendNotification(
  subscription: PushSubscription,
  notification: PushNotification
): Promise<boolean> {
  if (!webPush) {
    console.warn('web-push not available');
    return false;
  }

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(notification)
    );

    // Log successful send
    await query(
      `INSERT INTO push_notification_logs (user_id, subscription_id, title, sent_at, status)
       VALUES ($1, $2, $3, NOW(), 'sent')`,
      [subscription.userId, subscription.id, notification.title]
    );

    return true;
  } catch (error: any) {
    console.error('Push notification failed:', error);

    // Handle expired subscription
    if (error.statusCode === 410) {
      await removeSubscription(subscription.endpoint);
    }

    // Log failure
    await query(
      `INSERT INTO push_notification_logs (user_id, subscription_id, title, sent_at, status, error)
       VALUES ($1, $2, $3, NOW(), 'failed', $4)`,
      [subscription.userId, subscription.id, notification.title, error.message]
    );

    return false;
  }
}

export async function sendToUser(
  userId: string,
  notification: PushNotification
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getUserSubscriptions(userId);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const success = await sendNotification(sub, notification);
    if (success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendToMultipleUsers(
  userIds: string[],
  notification: PushNotification
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await sendToUser(userId, notification);
    sent += result.sent;
    failed += result.failed;
  }

  return { sent, failed };
}

export async function broadcastNotification(
  notification: PushNotification,
  filter?: { tier?: string[]; segments?: string[] }
): Promise<{ sent: number; failed: number }> {
  let sql = 'SELECT DISTINCT user_id FROM push_subscriptions';
  const params: any[] = [];

  if (filter) {
    // Add filter conditions if needed
    // This would join with users table for tier/segment filtering
  }

  const result = await query(sql, params);
  const userIds = result.rows.map(r => r.user_id);

  return sendToMultipleUsers(userIds, notification);
}

// Notification templates
export const notificationTemplates = {
  newReview: (placeName: string, reviewerName: string): PushNotification => ({
    title: 'Yeni Değerlendirme',
    body: `${placeName} için ${reviewerName} yeni bir yorum yaptı`,
    icon: '/icons/review.png',
    tag: 'new-review',
  }),

  replyToComment: (replierName: string): PushNotification => ({
    title: 'Yeni Yanıt',
    body: `${replierName} yorumunuza yanıt verdi`,
    icon: '/icons/comment.png',
    tag: 'comment-reply',
  }),

  placeApproved: (placeName: string): PushNotification => ({
    title: 'Mekan Onaylandı',
    body: `${placeName} mekanınız yayına alındı`,
    icon: '/icons/approved.png',
    tag: 'place-approved',
  }),

  newFollower: (followerName: string): PushNotification => ({
    title: 'Yeni Takipçi',
    body: `${followerName} sizi takip etmeye başladı`,
    icon: '/icons/follower.png',
    tag: 'new-follower',
  }),

  collectionUpdate: (collectionName: string, updaterName: string): PushNotification => ({
    title: 'Koleksiyon Güncellendi',
    body: `${updaterName} ${collectionName} koleksiyonuna ekleme yaptı`,
    icon: '/icons/collection.png',
    tag: 'collection-update',
  }),

  weeklyDigest: (summary: string): PushNotification => ({
    title: 'Haftalık Özet',
    body: summary,
    icon: '/icons/digest.png',
    tag: 'weekly-digest',
    requireInteraction: false,
  }),

  promotional: (title: string, message: string, url: string): PushNotification => ({
    title,
    body: message,
    icon: '/icons/logo.png',
    url,
    requireInteraction: true,
  }),
};

// User preferences
export async function getUserPushPreferences(userId: string): Promise<{
  enabled: boolean;
  types: Record<string, boolean>;
}> {
  const result = await query(
    'SELECT push_enabled, push_preferences FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return { enabled: false, types: {} };
  }

  return {
    enabled: result.rows[0].push_enabled || false,
    types: result.rows[0].push_preferences || {},
  };
}

export async function updatePushPreferences(
  userId: string,
  preferences: { enabled?: boolean; types?: Record<string, boolean> }
): Promise<void> {
  await query(
    `UPDATE users SET 
      push_enabled = COALESCE($2, push_enabled),
      push_preferences = COALESCE($3, push_preferences)
     WHERE id = $1`,
    [userId, preferences.enabled, preferences.types ? JSON.stringify(preferences.types) : null]
  );
}

// Get VAPID public key for client
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// Schedule notification
export async function scheduleNotification(
  userId: string,
  notification: PushNotification,
  scheduledAt: Date
): Promise<string> {
  const result = await query(
    `INSERT INTO scheduled_notifications (user_id, notification, scheduled_at, status)
     VALUES ($1, $2, $3, 'pending') RETURNING id`,
    [userId, JSON.stringify(notification), scheduledAt]
  );

  return result.rows[0].id;
}

// Process scheduled notifications (call this from a cron job)
export async function processScheduledNotifications(): Promise<number> {
  const result = await query(
    `SELECT * FROM scheduled_notifications 
     WHERE status = 'pending' AND scheduled_at <= NOW()
     LIMIT 100`
  );

  let processed = 0;

  for (const row of result.rows) {
    try {
      const notification: PushNotification = JSON.parse(row.notification);
      await sendToUser(row.user_id, notification);
      
      await query(
        `UPDATE scheduled_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [row.id]
      );
      processed++;
    } catch (error) {
      await query(
        `UPDATE scheduled_notifications SET status = 'failed', error = $2 WHERE id = $1`,
        [row.id, String(error)]
      );
    }
  }

  return processed;
}
