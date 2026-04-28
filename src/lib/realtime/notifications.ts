/**
 * Real-time Notifications System
 * SSE (Server-Sent Events) based notifications
 */

import { query } from '../postgres';
import { getCache, setCache } from '../cache';
import { logger } from '../logging';

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: Date;
}

// SSE clients map: userId -> response streams
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Add SSE client
 */
export function addClient(userId: string, controller: ReadableStreamDefaultController): void {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(controller);
}

/**
 * Remove SSE client
 */
export function removeClient(userId: string, controller: ReadableStreamDefaultController): void {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(controller);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

/**
 * Create SSE stream
 */
export function createSSEStream(userId: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      addClient(userId, controller);

      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      // Send unread notifications
      sendUnreadNotifications(userId, controller);

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          removeClient(userId, controller);
        }
      }, 30000);

      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        removeClient(userId, controller);
      };
    },
    cancel() {
      // Cleanup handled in start
    },
  });
}

/**
 * Send unread notifications to client
 */
async function sendUnreadNotifications(
  userId: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  try {
    const notifications = await getUnreadNotifications(userId);
    
    for (const notification of notifications.slice(0, 10)) {
      const data = `data: ${JSON.stringify({
        type: 'notification',
        notification,
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    }
  } catch (error) {
    logger.error('Error sending unread notifications:', error);
  }
}

/**
 * Broadcast notification to user
 */
export async function broadcastNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'created_at'>
): Promise<void> {
  // Save to database
  const saved = await createNotification(notification);

  // Send to connected clients
  const userClients = clients.get(userId);
  if (userClients) {
    const data = `data: ${JSON.stringify({
      type: 'notification',
      notification: saved,
    })}\n\n`;
    
    const encoded = new TextEncoder().encode(data);
    
    for (const controller of userClients) {
      try {
        controller.enqueue(encoded);
      } catch {
        // Client disconnected
        removeClient(userId, controller);
      }
    }
  }

  // Update unread count cache
  await updateUnreadCount(userId);
}

/**
 * Create notification in database
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at'>
): Promise<Notification> {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data),
      notification.read,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data,
    read: row.read,
    created_at: new Date(row.created_at),
  };
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data,
    read: row.read,
    created_at: new Date(row.created_at),
  }));
}

/**
 * Get all notifications
 */
export async function getNotifications(
  userId: string,
  options: { read?: boolean; limit?: number; offset?: number } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const { read, limit = 20, offset = 0 } = options;

  let sql = 'SELECT * FROM notifications WHERE user_id = $1';
  const params: any[] = [userId];

  if (read !== undefined) {
    sql += ' AND read = $2';
    params.push(read);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM (${sql}) as count_query`,
    params
  );

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  return {
    notifications: result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      created_at: new Date(row.created_at),
    })),
    total: parseInt(countResult.rows[0].total),
  };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );

  if (result.rowCount > 0) {
    await updateUnreadCount(userId);
    return true;
  }
  return false;
}

/**
 * Mark all as read
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await query(
    'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
    [userId]
  );
  await updateUnreadCount(userId);
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );

  if (result.rowCount > 0) {
    await updateUnreadCount(userId);
    return true;
  }
  return false;
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  // Check cache first
  const cached = await getCache<number>(`notifications:unread:${userId}`);
  if (cached !== null) return cached;

  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
    [userId]
  );

  const count = parseInt(result.rows[0].count);
  await setCache(`notifications:unread:${userId}`, count, 60);
  return count;
}

/**
 * Update unread count cache
 */
async function updateUnreadCount(userId: string): Promise<void> {
  const count = await getUnreadCount(userId);
  await setCache(`notifications:unread:${userId}`, count, 60);

  // Broadcast count update
  const userClients = clients.get(userId);
  if (userClients) {
    const data = `data: ${JSON.stringify({
      type: 'unread_count',
      count,
    })}\n\n`;
    
    const encoded = new TextEncoder().encode(data);
    
    for (const controller of userClients) {
      try {
        controller.enqueue(encoded);
      } catch {
        removeClient(userId, controller);
      }
    }
  }
}

/**
 * Send notification types
 */
export const NotificationTypes = {
  PLACE_REVIEW: 'place_review',
  REVIEW_REPLY: 'review_reply',
  FOLLOW: 'follow',
  MESSAGE: 'message',
  SYSTEM: 'system',
  PROMOTION: 'promotion',
} as const;

/**
 * Helper: Send place review notification
 */
export async function notifyPlaceReview(
  placeOwnerId: string,
  placeName: string,
  reviewerName: string,
  rating: number
): Promise<void> {
  await broadcastNotification(placeOwnerId, {
    user_id: placeOwnerId,
    type: 'info',
    title: 'Yeni Değerlendirme',
    message: `${reviewerName} ${placeName} için ${rating} yıldız verdi`,
    data: { placeName, reviewerName, rating },
    read: false,
  });
}

/**
 * Helper: Send follow notification
 */
export async function notifyFollow(
  userId: string,
  followerName: string
): Promise<void> {
  await broadcastNotification(userId, {
    user_id: userId,
    type: 'success',
    title: 'Yeni Takipçi',
    message: `${followerName} sizi takip etmeye başladı`,
    data: { followerName },
    read: false,
  });
}

/**
 * Helper: Send message notification
 */
export async function notifyMessage(
  userId: string,
  senderName: string,
  preview: string
): Promise<void> {
  await broadcastNotification(userId, {
    user_id: userId,
    type: 'info',
    title: 'Yeni Mesaj',
    message: `${senderName}: ${preview.slice(0, 50)}...`,
    data: { senderName },
    read: false,
  });
}
