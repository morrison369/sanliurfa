/**
 * Server-Sent Events (SSE) Notification System
 * Real-time notifications for users
 */

import type { APIContext } from 'astro';

interface Notification {
  id: string;
  userId: string;
  type: 'review' | 'follow' | 'message' | 'system' | 'place_approved';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// Store active connections (in production, use Redis)
const connections = new Map<string, ReadableStreamController<Uint8Array>[]>();

/**
 * Add SSE connection for a user
 */
export function addConnection(userId: string, controller: ReadableStreamController<Uint8Array>) {
  if (!connections.has(userId)) {
    connections.set(userId, []);
  }
  connections.get(userId)!.push(controller);
}

/**
 * Remove SSE connection
 */
export function removeConnection(userId: string, controller: ReadableStreamController<Uint8Array>) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const index = userConnections.indexOf(controller);
    if (index > -1) {
      userConnections.splice(index, 1);
    }
    if (userConnections.length === 0) {
      connections.delete(userId);
    }
  }
}

/**
 * Send notification to a specific user
 */
export function sendToUser(userId: string, notification: Notification): boolean {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.length === 0) {
    return false;
  }

  const data = `data: ${JSON.stringify(notification)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  userConnections.forEach(controller => {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Connection closed, will be cleaned up
    }
  });

  return true;
}

/**
 * Send notification to multiple users
 */
export function sendToUsers(userIds: string[], notification: Notification): void {
  userIds.forEach(userId => sendToUser(userId, notification));
}

/**
 * Broadcast to all connected users
 */
export function broadcast(notification: Omit<Notification, 'userId'>): void {
  connections.forEach((_, userId) => {
    sendToUser(userId, { ...notification, userId });
  });
}

/**
 * Create SSE stream for a user
 */
export function createSSEStream(userId: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      // Add connection
      addConnection(userId, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        removeConnection(userId, controller);
      };
    },
    cancel(controller) {
      removeConnection(userId, controller);
    },
  });
}

/**
 * Get online user count
 */
export function getOnlineCount(): number {
  return connections.size;
}

/**
 * Get online users list
 */
export function getOnlineUsers(): string[] {
  return Array.from(connections.keys());
}

// Database operations for notifications
import { query, queryOne } from '../postgres';

/**
 * Save notification to database
 */
export async function saveNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
  const result = await queryOne<Notification>(
    `INSERT INTO notifications (user_id, type, title, message, link, read)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [notification.userId, notification.type, notification.title, notification.message, notification.link, notification.read]
  );

  return result!;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  const { limit = 20, unreadOnly = false } = options;

  const result = await query<Notification>(
    `SELECT * FROM notifications
     WHERE user_id = $1 ${unreadOnly ? 'AND read = false' : ''}
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Mark all as read
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
    [userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false',
    [userId]
  );
  return result?.count || 0;
}

/**
 * Send and save notification
 */
export async function sendNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>
): Promise<Notification> {
  // Save to database
  const saved = await saveNotification({
    ...notification,
    userId,
    read: false,
  });

  // Send via SSE if user is online
  sendToUser(userId, saved);

  return saved;
}

// Notification helper functions
export const notify = {
  // New review on user's place submission
  async placeReview(userId: string, placeName: string, reviewerName: string): Promise<void> {
    await sendNotification(userId, {
      type: 'review',
      title: 'Yeni Değerlendirme',
      message: `${reviewerName}, ${placeName} hakkında yorum yaptı.`,
      link: `/profile`,
    });
  },

  // New follower
  async newFollower(userId: string, followerName: string): Promise<void> {
    await sendNotification(userId, {
      type: 'follow',
      title: 'Yeni Takipçi',
      message: `${followerName} sizi takip etmeye başladı.`,
      link: `/takipciler`,
    });
  },

  // New message
  async newMessage(userId: string, senderName: string): Promise<void> {
    await sendNotification(userId, {
      type: 'message',
      title: 'Yeni Mesaj',
      message: `${senderName} size bir mesaj gönderdi.`,
      link: `/messages`,
    });
  },

  // Place approved
  async placeApproved(userId: string, placeName: string, placeSlug: string): Promise<void> {
    await sendNotification(userId, {
      type: 'place_approved',
      title: 'Mekan Onaylandı',
      message: `${placeName} öneriniz onaylandı ve yayına alındı.`,
      link: `/places/${placeSlug}`,
    });
  },

  // System notification
  async system(userId: string, title: string, message: string, link?: string): Promise<void> {
    await sendNotification(userId, {
      type: 'system',
      title,
      message,
      link,
    });
  },
};
