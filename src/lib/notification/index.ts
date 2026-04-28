import { randomBytes } from 'node:crypto';

/**
 * Notification System Module
 * Stub implementation for notification management
 */

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class NotificationSystem {
  private notifications: Map<string, Notification> = new Map();

  create(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: randomBytes(6).toString('hex'),
      createdAt: new Date()
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  getUnread(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.read);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }
}

export const notificationSystem = new NotificationSystem();
export default notificationSystem;
