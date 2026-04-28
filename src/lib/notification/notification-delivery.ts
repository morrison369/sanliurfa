/**
 * Notification Delivery Library
 * Multi-channel notification delivery (in-app, push, email)
 */
import { query, queryOne, queryMany, insert, update } from '../postgres';
import { logger } from '../logger';
import { sendPushToUser } from '../push/push';

export async function sendNotification(
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  data?: any,
  options?: any
): Promise<string> {
  try {
    const id = crypto.randomUUID();

    // Insert notification history
    await insert('notification_history', {
      id,
      user_id: userId,
      notification_type: notificationType,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      action_url: options?.actionUrl,
      related_user_id: options?.relatedUserId,
      related_place_id: options?.relatedPlaceId
    });

    // Get user's notification preferences
    const prefs = await getNotificationTypePreferences(userId, notificationType);

    // Send via enabled channels
    if (prefs.inAppEnabled) {
      await recordDelivery(id, 'in_app', 'delivered');
    }

    if (prefs.pushEnabled) {
      // Async push delivery - don't wait for completion
      sendPushNotification(userId, id, title, message, data).catch(err => {
        logger.error('Push delivery failed', err instanceof Error ? err : new Error(String(err)));
      });
    }

    if (prefs.emailEnabled && options?.sendEmail) {
      // Queue for email (handled by email service)
      await recordDelivery(id, 'email', 'pending');
    }

    logger.info('Notification sent', { userId, notificationType });
    return id;
  } catch (error) {
    logger.error('Failed to send notification', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function sendPushNotification(userId: string, notificationId: string, title: string, message: string, data?: any): Promise<void> {
  try {
    const result = await sendPushToUser(userId, { title, body: message, data });

    if (result.sent === 0) {
      await recordDelivery(notificationId, 'push', 'failed', 'No active subscriptions');
    } else {
      await recordDelivery(notificationId, 'push', 'delivered');
    }
  } catch (error) {
    logger.error('Failed to send push notifications', error instanceof Error ? error : new Error(String(error)));
    await recordDelivery(notificationId, 'push', 'failed', error instanceof Error ? error.message : String(error));
  }
}

export async function recordDelivery(
  notificationId: string,
  channel: string,
  status: string,
  message?: string
): Promise<void> {
  try {
    await insert('notification_delivery_log', {
      notification_id: notificationId,
      delivery_channel: channel,
      status,
      status_message: message,
      attempt_count: 1,
      delivered_at: status === 'delivered' ? new Date() : null,
      failed_at: status === 'failed' ? new Date() : null
    });
  } catch (error) {
    logger.error('Failed to record delivery', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  try {
    const notif = await queryOne('SELECT id FROM notification_history WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    if (!notif) throw new Error('Notification not found or not owned by user');

    await update('notification_history', { id: notificationId }, {
      is_read: true,
      read_at: new Date(),
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to mark as read', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function archiveNotification(notificationId: string, userId: string): Promise<void> {
  try {
    const notif = await queryOne('SELECT id FROM notification_history WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    if (!notif) throw new Error('Notification not found');

    await update('notification_history', { id: notificationId }, {
      is_archived: true,
      archived_at: new Date(),
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to archive notification', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getNotifications(userId: string, limit: number = 20, archived: boolean = false): Promise<any[]> {
  try {
    const notifications = await queryMany(`
      SELECT * FROM notification_history
      WHERE user_id = $1 AND is_archived = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, archived, limit]);
    return notifications;
  } catch (error) {
    logger.error('Failed to get notifications', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM notification_history WHERE user_id = $1 AND is_read = false AND is_archived = false',
      [userId]
    );
    return parseInt(result?.count || '0');
  } catch (error) {
    logger.error('Failed to get unread count', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

export async function getNotificationTypePreferences(userId: string, notificationType: string): Promise<any> {
  try {
    let prefs = await queryOne(
      'SELECT * FROM notification_type_preferences WHERE user_id = $1 AND notification_type = $2',
      [userId, notificationType]
    );

    // Return defaults if not found
    if (!prefs) {
      return {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        frequency: 'immediate'
      };
    }

    return {
      inAppEnabled: prefs.in_app_enabled,
      pushEnabled: prefs.push_enabled,
      emailEnabled: prefs.email_enabled,
      frequency: prefs.frequency
    };
  } catch (error) {
    logger.error('Failed to get preferences', error instanceof Error ? error : new Error(String(error)));
    return { inAppEnabled: true, pushEnabled: true, emailEnabled: true, frequency: 'immediate' };
  }
}

export async function updateNotificationTypePreferences(
  userId: string,
  notificationType: string,
  preferences: any
): Promise<void> {
  try {
    await query(
      `INSERT INTO notification_type_preferences
        (user_id, notification_type, in_app_enabled, push_enabled, email_enabled, frequency, created_at, updated_at)
       VALUES
        ($1, $2, COALESCE($3, true), COALESCE($4, true), COALESCE($5, true), COALESCE($6, 'immediate'), NOW(), NOW())
       ON CONFLICT (user_id, notification_type) DO UPDATE SET
        in_app_enabled = COALESCE($3, notification_type_preferences.in_app_enabled),
        push_enabled = COALESCE($4, notification_type_preferences.push_enabled),
        email_enabled = COALESCE($5, notification_type_preferences.email_enabled),
        frequency = COALESCE($6, notification_type_preferences.frequency),
        updated_at = NOW()`,
      [
        userId,
        notificationType,
        preferences.inAppEnabled ?? null,
        preferences.pushEnabled ?? null,
        preferences.emailEnabled ?? null,
        preferences.frequency || null
      ]
    );

    logger.info('Notification preferences updated', { userId, notificationType });
  } catch (error) {
    logger.error('Failed to update preferences', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}


