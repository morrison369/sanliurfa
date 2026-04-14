/**
 * Real-time notification system
 * WebSocket, SSE, and push notification support
 */

import { generateId } from '../utils';

// Notification types
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'message'
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'system';

// Notification data
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

// WebSocket client map
const wsClients: Map<string, WebSocket> = new Map();

// SSE client map
const sseClients: Map<string, ReadableStreamDefaultController> = new Map();

// In-memory notification store (use Redis in production)
const notificationStore: Map<string, Notification[]> = new Map();

/**
 * Add notification to store
 */
export function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const fullNotification: Notification = {
    ...notification,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  const userId = notification.userId || 'global';
  const userNotifications = notificationStore.get(userId) || [];
  userNotifications.unshift(fullNotification);
  
  // Keep only last 100 notifications per user
  if (userNotifications.length > 100) {
    userNotifications.splice(100);
  }
  
  notificationStore.set(userId, userNotifications);

  // Broadcast to connected clients
  broadcastToUser(userId, fullNotification);

  return fullNotification;
}

/**
 * Get notifications for user
 */
export function getNotifications(userId: string, options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Notification[] {
  let notifications = notificationStore.get(userId) || [];

  if (options?.unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  if (options?.limit) {
    notifications = notifications.slice(0, options.limit);
  }

  return notifications;
}

/**
 * Mark notification as read
 */
export function markAsRead(userId: string, notificationId: string): boolean {
  const notifications = notificationStore.get(userId);
  if (!notifications) return false;

  const notification = notifications.find(n => n.id === notificationId);
  if (!notification) return false;

  notification.read = true;
  return true;
}

/**
 * Mark all as read
 */
export function markAllAsRead(userId: string): number {
  const notifications = notificationStore.get(userId);
  if (!notifications) return 0;

  let count = 0;
  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  }

  return count;
}

/**
 * Delete notification
 */
export function deleteNotification(userId: string, notificationId: string): boolean {
  const notifications = notificationStore.get(userId);
  if (!notifications) return false;

  const index = notifications.findIndex(n => n.id === notificationId);
  if (index === -1) return false;

  notifications.splice(index, 1);
  return true;
}

/**
 * Get unread count
 */
export function getUnreadCount(userId: string): number {
  const notifications = notificationStore.get(userId) || [];
  return notifications.filter(n => !n.read).length;
}

/**
 * Register WebSocket client
 */
export function registerWebSocket(userId: string, ws: WebSocket): void {
  wsClients.set(userId, ws);

  ws.onclose = () => {
    wsClients.delete(userId);
  };

  ws.onerror = () => {
    wsClients.delete(userId);
  };

  // Send initial unread count
  const unreadCount = getUnreadCount(userId);
  ws.send(JSON.stringify({ type: 'unread_count', count: unreadCount }));
}

/**
 * Register SSE client
 */
export function registerSSE(userId: string, controller: ReadableStreamDefaultController): void {
  sseClients.set(userId, controller);

  // Send initial data
  const notifications = getNotifications(userId, { limit: 10 });
  const data = `data: ${JSON.stringify({ type: 'initial', notifications })}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

/**
 * Broadcast notification to user
 */
export function broadcastToUser(userId: string, notification: Notification): void {
  const payload = JSON.stringify({ type: 'notification', notification });

  // WebSocket
  const ws = wsClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(payload);
  }

  // SSE
  const sse = sseClients.get(userId);
  if (sse) {
    const data = `data: ${payload}\n\n`;
    sse.enqueue(new TextEncoder().encode(data));
  }
}

/**
 * Broadcast to all users
 */
export function broadcastToAll(notification: Omit<Notification, 'id' | 'createdAt'>): void {
  const fullNotification = addNotification(notification);

  // WebSocket broadcast
  for (const [userId, ws] of wsClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'notification', notification: fullNotification }));
    }
  }

  // SSE broadcast
  for (const [userId, sse] of sseClients) {
    const data = `data: ${JSON.stringify({ type: 'notification', notification: fullNotification })}\n\n`;
    sse.enqueue(new TextEncoder().encode(data));
  }
}

/**
 * Create notification helpers
 */
export const notifications = {
  info(userId: string, title: string, message: string, data?: Record<string, any>) {
    return addNotification({ type: 'info', title, message, userId, data, read: false });
  },

  success(userId: string, title: string, message: string, data?: Record<string, any>) {
    return addNotification({ type: 'success', title, message, userId, data, read: false });
  },

  warning(userId: string, title: string, message: string, data?: Record<string, any>) {
    return addNotification({ type: 'warning', title, message, userId, data, read: false });
  },

  error(userId: string, title: string, message: string, data?: Record<string, any>) {
    return addNotification({ type: 'error', title, message, userId, data, read: false });
  },

  message(userId: string, fromUser: string, message: string, data?: Record<string, any>) {
    return addNotification({
      type: 'message',
      title: `Yeni mesaj: ${fromUser}`,
      message,
      userId,
      data,
      read: false,
    });
  },

  like(userId: string, fromUser: string, contentType: string, data?: Record<string, any>) {
    return addNotification({
      type: 'like',
      title: 'Yeni beğeni',
      message: `${fromUser} ${contentType} içeriğinizi beğendi`,
      userId,
      data,
      read: false,
    });
  },

  comment(userId: string, fromUser: string, contentType: string, data?: Record<string, any>) {
    return addNotification({
      type: 'comment',
      title: 'Yeni yorum',
      message: `${fromUser} ${contentType} içeriğinize yorum yaptı`,
      userId,
      data,
      read: false,
    });
  },

  follow(userId: string, fromUser: string, data?: Record<string, any>) {
    return addNotification({
      type: 'follow',
      title: 'Yeni takipçi',
      message: `${fromUser} sizi takip etmeye başladı`,
      userId,
      data,
      read: false,
    });
  },

  mention(userId: string, fromUser: string, contentType: string, data?: Record<string, any>) {
    return addNotification({
      type: 'mention',
      title: 'Bahsedildiniz',
      message: `${fromUser} sizi ${contentType} içeriğinde bahsetti`,
      userId,
      data,
      read: false,
    });
  },

  system(userId: string, title: string, message: string, data?: Record<string, any>) {
    return addNotification({ type: 'system', title, message, userId, data, read: false });
  },
};

/**
 * Clean up old notifications
 */
export function cleanupOldNotifications(maxAgeDays: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  let deletedCount = 0;

  for (const [userId, notifications] of notificationStore) {
    const initialLength = notifications.length;
    const filtered = notifications.filter(n => new Date(n.createdAt) > cutoffDate);
    deletedCount += initialLength - filtered.length;
    notificationStore.set(userId, filtered);
  }

  return deletedCount;
}

/**
 * Get notification stats
 */
export function getStats(): {
  totalUsers: number;
  totalNotifications: number;
  wsConnections: number;
  sseConnections: number;
} {
  let totalNotifications = 0;
  for (const notifications of notificationStore.values()) {
    totalNotifications += notifications.length;
  }

  return {
    totalUsers: notificationStore.size,
    totalNotifications,
    wsConnections: wsClients.size,
    sseConnections: sseClients.size,
  };
}
