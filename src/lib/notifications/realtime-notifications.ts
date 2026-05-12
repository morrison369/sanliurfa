/**
 * Real-time notification system
 * Persistent storage via PostgreSQL, SSE broadcast via in-process Map
 */

import { query, queryOne } from '../postgres';

export type NotificationType =
  | 'info' | 'success' | 'warning' | 'error'
  | 'message' | 'like' | 'comment' | 'follow' | 'mention' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

// SSE client map (in-process, per-request lifetime is fine for SSE)
const sseClients: Map<string, ReadableStreamDefaultController> = new Map();

/**
 * Add notification — persists to DB and broadcasts to connected SSE clients
 */
export async function addNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification> {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, read, expires_at)
     VALUES ($1, $2, $3, $4, false, $5)
     RETURNING id, user_id, type, title, message, read, created_at, expires_at`,
    [
      notification.userId || null,
      notification.type,
      notification.title,
      notification.message,
      notification.expiresAt || null,
    ]
  );
  const row = result.rows[0];
  const full: Notification = {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };

  // Broadcast to connected SSE client
  if (notification.userId) {
    broadcastToUser(notification.userId, full);
  }

  return full;
}

/**
 * Get notifications for user from DB
 */
export async function getNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  const limit = options?.limit || 50;
  const result = await query(
    `SELECT id, user_id, type, title, message, read, created_at, expires_at
     FROM notifications
     WHERE user_id = $1 AND deleted_at IS NULL
       ${options?.unreadOnly ? 'AND read = false' : ''}
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map(rowToNotification);
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<boolean> {
  const result = await query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await query(
    `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/**
 * Soft-delete a notification
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  const result = await query(
    `UPDATE notifications SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const row = await queryOne(
    `SELECT COUNT(*) as c FROM notifications
     WHERE user_id = $1 AND read = false AND deleted_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  return parseInt(row?.c || '0', 10);
}

/**
 * Register SSE client for real-time delivery
 */
export function registerSSE(userId: string, controller: ReadableStreamDefaultController): void {
  sseClients.set(userId, controller);
}

/**
 * Unregister SSE client
 */
export function unregisterSSE(userId: string): void {
  sseClients.delete(userId);
}

function broadcastToUser(userId: string, notification: Notification): void {
  const controller = sseClients.get(userId);
  if (controller) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      sseClients.delete(userId);
    }
  }
}

function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type as NotificationType,
    title: r.title,
    message: r.message,
    read: r.read,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  };
}
