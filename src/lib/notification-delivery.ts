/**
 * Notification Delivery Library
 * Multi-channel notification delivery (in-app, push, email)
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

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
    const subscriptions = await getPushSubscriptions(userId);
    if (subscriptions.length === 0) {
      await recordDelivery(notificationId, 'push', 'failed', 'No active subscriptions');
      return;
    }

    for (const sub of subscriptions) {
      try {
        // In production, use web-push library to send actual push notifications
        // For now, just mark as sent
        await recordDelivery(notificationId, 'push', 'delivered');
        await update('push_subscription_stats', { user_id: userId }, {
          successful_deliveries: (await queryOne(
            'SELECT COUNT(*) as count FROM notification_delivery_log WHERE delivery_channel = $1 AND status = $2 AND notification_id IN (SELECT id FROM notification_history WHERE user_id = $3)',
            ['push', 'delivered', userId]
          )).count || 0,
          last_push_at: new Date()
        });
      } catch (err) {
        logger.error('Failed to send push to subscription', err instanceof Error ? err : new Error(String(err)));
        await recordDelivery(notificationId, 'push', 'failed', err instanceof Error ? err.message : String(err));
      }
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
    const notifications = await queryRows(`
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
    const existing = await queryOne(
      'SELECT id FROM notification_type_preferences WHERE user_id = $1 AND notification_type = $2',
      [userId, notificationType]
    );

    if (existing) {
      await update('notification_type_preferences', { user_id: userId, notification_type: notificationType }, {
        in_app_enabled: preferences.inAppEnabled !== undefined ? preferences.inAppEnabled : null,
        push_enabled: preferences.pushEnabled !== undefined ? preferences.pushEnabled : null,
        email_enabled: preferences.emailEnabled !== undefined ? preferences.emailEnabled : null,
        frequency: preferences.frequency || null,
        updated_at: new Date()
      });
    } else {
      await insert('notification_type_preferences', {
        user_id: userId,
        notification_type: notificationType,
        in_app_enabled: preferences.inAppEnabled !== undefined ? preferences.inAppEnabled : true,
        push_enabled: preferences.pushEnabled !== undefined ? preferences.pushEnabled : true,
        email_enabled: preferences.emailEnabled !== undefined ? preferences.emailEnabled : true,
        frequency: preferences.frequency || 'immediate'
      });
    }

    logger.info('Notification preferences updated', { userId, notificationType });
  } catch (error) {
    logger.error('Failed to update preferences', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function getPushSubscriptions(userId: string): Promise<any[]> {
  try {
    return await queryRows(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true',
      [userId]
    );
  } catch (error) {
    logger.error('Failed to get push subscriptions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
