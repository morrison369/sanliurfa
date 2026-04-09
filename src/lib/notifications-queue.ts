/**
 * In-App Notification System
 * - Real-time notifications via WebSocket
 * - Notification queue management
 * - Per-user notification tracking
 */

import { pool } from './postgres';
import { logger } from './logging';
import { prefixKey, getCache, setCache, deleteCache } from './cache';
import { fireAndForget } from './performance-optimizations';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action' | 'comment';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Create in-app notification
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  options?: {
    icon?: string;
    actionUrl?: string;
    actionLabel?: string;
    expiresInHours?: number;
  }
): Promise<string | null> {
  try {
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 3600000)
      : new Date(Date.now() + 7 * 24 * 3600000); // 7 days default

    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, icon, action_url, action_label, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, title, message, type, options?.icon || null, options?.actionUrl || null, options?.actionLabel || null, expiresAt]
    );

    const notificationId = result.rows[0]?.id;

    if (notificationId) {
      // Clear user notifications cache
      await deleteCache(prefixKey(`notifications:unread:${userId}`));
      // Broadcast via WebSocket (optimized: fire-and-forget to avoid blocking)
      fireAndForget(
        broadcastNotification(userId, {
          id: notificationId,
          userId,
          title,
          message,
          type,
          icon: options?.icon,
          actionUrl: options?.actionUrl,
          actionLabel: options?.actionLabel,
          read: false,
          createdAt: new Date()
        }),
        'broadcastNotification'
      );
    }

    return notificationId || null;
  } catch (error) {
    logger.error('Notification creation failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's unread notifications
 */
export async function getUnreadNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  try {
    const cacheKey = prefixKey(`notifications:unread:${userId}`);
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await pool.query(
      `SELECT id, user_id as userId, title, message, type, icon, action_url as actionUrl, action_label as actionLabel, read, created_at as createdAt, expires_at as expiresAt
       FROM notifications
       WHERE user_id = $1 AND read = false AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const notifications = result.rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, notifications, 300);

    return notifications;
  } catch (error) {
    logger.error('Failed to get unread notifications', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get all user notifications (paginated)
 */
export async function getUserNotifications(userId: string, page: number = 1, pageSize: number = 20): Promise<{ notifications: Notification[]; total: number }> {
  try {
    const offset = (page - 1) * pageSize;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    const notificationsResult = await pool.query(
      `SELECT id, user_id as userId, title, message, type, icon, action_url as actionUrl, action_label as actionLabel, read, created_at as createdAt, expires_at as expiresAt
       FROM notifications
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const notifications = notificationsResult.rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined
    }));

    return {
      notifications,
      total: parseInt(countResult.rows[0]?.total || '0')
    };
  } catch (error) {
    logger.error('Failed to get user notifications', error instanceof Error ? error : new Error(String(error)));
    return { notifications: [], total: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(prefixKey(`notifications:unread:${userId}`));
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to mark notification as read', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [userId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(prefixKey(`notifications:unread:${userId}`));
    }

    return result.rowCount || 0;
  } catch (error) {
    logger.error('Failed to mark all as read', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(prefixKey(`notifications:unread:${userId}`));
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to delete notification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Broadcast notification to user via WebSocket (realtime module handles delivery)
 */
async function broadcastNotification(userId: string, notification: any): Promise<void> {
  try {
    // This is called by realtime module via event system
    // For now, just log that it was queued
    logger.info('Notification queued for broadcast', { userId, notificationId: notification.id });
  } catch (error) {
    logger.error('Failed to broadcast notification', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get notification stats for user
 */
export async function getNotificationStats(userId: string): Promise<{ unread: number; total: number }> {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN read = false THEN 1 END) as unread
       FROM notifications
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    return {
      total: parseInt(result.rows[0]?.total || '0'),
      unread: parseInt(result.rows[0]?.unread || '0')
    };
  } catch (error) {
    logger.error('Failed to get notification stats', error instanceof Error ? error : new Error(String(error)));
    return { unread: 0, total: 0 };
  }
}

/**
 * Clean up expired notifications (should be called periodically)
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );

    if ((result.rowCount || 0) > 0) {
      logger.info('Cleaned up expired notifications', { count: result.rowCount });
    }

    return result.rowCount || 0;
  } catch (error) {
    logger.error('Failed to cleanup expired notifications', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}
