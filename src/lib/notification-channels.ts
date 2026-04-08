/**
 * Notification Channels Library
 * Push, Email, SMS multi-channel delivery
 */

import { queryOne, queryMany, insert, update, query } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export interface NotificationChannel {
  id: string;
  user_id: string;
  channel_type: 'push' | 'email' | 'sms';
  identifier: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  auth_key: string;
  p256dh_key: string;
  is_active: boolean;
  last_used_at?: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: string[];
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  digest_enabled: boolean;
  digest_frequency: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  muted_categories: string[];
}

// ===== CHANNELS =====

export async function getUserChannels(userId: string): Promise<NotificationChannel[]> {
  try {
    const cacheKey = `sanliurfa:channels:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const channels = await queryMany(
      'SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY is_primary DESC',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(channels), 3600);
    return channels as NotificationChannel[];
  } catch (error) {
    logger.error(
      'Failed to get user channels',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function addChannel(
  userId: string,
  type: 'push' | 'email' | 'sms',
  identifier: string,
  isPrimary: boolean = false
): Promise<NotificationChannel | null> {
  try {
    const channel = await insert('notification_channels', {
      user_id: userId,
      channel_type: type,
      identifier,
      is_primary: isPrimary,
      created_at: new Date()
    });

    await deleteCache(`sanliurfa:channels:${userId}`);
    logger.info('Channel added', { userId, type });

    return channel as NotificationChannel;
  } catch (error) {
    logger.error(
      'Failed to add channel',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function removeChannel(channelId: string, userId: string): Promise<boolean> {
  try {
    await query(
      'DELETE FROM notification_channels WHERE id = $1 AND user_id = $2',
      [channelId, userId]
    );

    await deleteCache(`sanliurfa:channels:${userId}`);
    return true;
  } catch (error) {
    logger.error(
      'Failed to remove channel',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== PUSH SUBSCRIPTIONS =====

export async function addPushSubscription(
  userId: string,
  endpoint: string,
  authKey: string,
  p256dhKey: string
): Promise<PushSubscription | null> {
  try {
    const subscription = await insert('push_subscriptions', {
      user_id: userId,
      endpoint,
      auth_key: authKey,
      p256dh_key: p256dhKey,
      is_active: true,
      created_at: new Date()
    });

    await deleteCache(`sanliurfa:push:${userId}`);
    logger.info('Push subscription added', { userId });

    return subscription as PushSubscription;
  } catch (error) {
    logger.error(
      'Failed to add push subscription',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  try {
    const cacheKey = `sanliurfa:push:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const subscriptions = await queryMany(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(subscriptions), 3600);
    return subscriptions as PushSubscription[];
  } catch (error) {
    logger.error(
      'Failed to get push subscriptions',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  try {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    return true;
  } catch (error) {
    logger.error(
      'Failed to remove push subscription',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== EMAIL TEMPLATES =====

export async function getEmailTemplate(key: string): Promise<EmailTemplate | null> {
  try {
    const cacheKey = `sanliurfa:email:template:${key}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const template = await queryOne(
      'SELECT * FROM email_templates WHERE key = $1 AND is_active = true',
      [key]
    );

    if (template) {
      await setCache(cacheKey, JSON.stringify(template), 86400);
    }

    return template as EmailTemplate | null;
  } catch (error) {
    logger.error(
      'Failed to get email template',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    return await queryMany('SELECT * FROM email_templates WHERE is_active = true', []);
  } catch (error) {
    logger.error(
      'Failed to get email templates',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function createEmailTemplate(
  key: string,
  name: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  variables?: string[]
): Promise<EmailTemplate | null> {
  try {
    const template = await insert('email_templates', {
      key,
      name,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      variables: variables || [],
      is_active: true,
      created_at: new Date()
    });

    await deleteCache(`sanliurfa:email:template:${key}`);
    logger.info('Email template created', { key });

    return template as EmailTemplate;
  } catch (error) {
    logger.error(
      'Failed to create email template',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

// ===== EMAIL QUEUE =====

export async function queueEmail(
  recipientEmail: string,
  templateKey: string,
  variables?: any,
  priority: number = 5,
  scheduledFor?: Date,
  userId?: string
): Promise<boolean> {
  try {
    await insert('email_queue', {
      user_id: userId,
      recipient_email: recipientEmail,
      template_key: templateKey,
      variables: variables || {},
      status: 'pending',
      priority,
      scheduled_for: scheduledFor,
      created_at: new Date()
    });

    logger.info('Email queued', { recipient: recipientEmail, template: templateKey });
    return true;
  } catch (error) {
    logger.error(
      'Failed to queue email',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function getPendingEmails(limit: number = 100): Promise<any[]> {
  try {
    return await queryMany(
      `SELECT * FROM email_queue
       WHERE status = 'pending'
       AND (scheduled_for IS NULL OR scheduled_for <= NOW())
       ORDER BY priority DESC, created_at ASC
       LIMIT $1`,
      [limit]
    );
  } catch (error) {
    logger.error(
      'Failed to get pending emails',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function markEmailSent(emailId: string): Promise<boolean> {
  try {
    await update('email_queue', { id: emailId }, {
      status: 'sent',
      sent_at: new Date()
    });
    return true;
  } catch (error) {
    logger.error(
      'Failed to mark email sent',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function markEmailFailed(emailId: string, reason?: string): Promise<boolean> {
  try {
    const email = await queryOne('SELECT retry_count FROM email_queue WHERE id = $1', [emailId]);

    if (email && email.retry_count < 5) {
      await update('email_queue', { id: emailId }, {
        status: 'pending',
        retry_count: email.retry_count + 1,
        failed_reason: reason
      });
    } else {
      await update('email_queue', { id: emailId }, {
        status: 'failed',
        failed_reason: reason
      });
    }

    return true;
  } catch (error) {
    logger.error(
      'Failed to mark email failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== NOTIFICATION PREFERENCES =====

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const cacheKey = `sanliurfa:prefs:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const prefs = await queryOne(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefs) {
      await setCache(cacheKey, JSON.stringify(prefs), 3600);
    }

    return prefs as NotificationPreferences | null;
  } catch (error) {
    logger.error(
      'Failed to get notification preferences',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      await update('notification_preferences', { user_id: userId }, preferences);
    } else {
      await insert('notification_preferences', {
        user_id: userId,
        ...preferences,
        created_at: new Date()
      });
    }

    await deleteCache(`sanliurfa:prefs:${userId}`);
    logger.info('Notification preferences updated', { userId });

    return true;
  } catch (error) {
    logger.error(
      'Failed to update notification preferences',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== DELIVERY TRACKING =====

export async function logDelivery(
  notificationId: string,
  userId: string,
  channelType: string,
  status: string = 'pending',
  metadata?: any
): Promise<boolean> {
  try {
    await insert('notification_deliveries', {
      notification_id: notificationId,
      user_id: userId,
      channel_type: channelType,
      status,
      metadata: metadata || {},
      created_at: new Date()
    });

    return true;
  } catch (error) {
    logger.error(
      'Failed to log delivery',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function markDelivered(notificationId: string, userId: string, channelType: string): Promise<boolean> {
  try {
    await query(
      `UPDATE notification_deliveries
       SET status = 'delivered', delivered_at = NOW()
       WHERE notification_id = $1 AND user_id = $2 AND channel_type = $3`,
      [notificationId, userId, channelType]
    );

    return true;
  } catch (error) {
    logger.error(
      'Failed to mark delivered',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function getUserDeliveryStats(userId: string): Promise<any> {
  try {
    const stats = await queryOne(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(DISTINCT channel_type) as channel_count
       FROM notification_deliveries
       WHERE user_id = $1`,
      [userId]
    );

    return stats;
  } catch (error) {
    logger.error(
      'Failed to get delivery stats',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}
