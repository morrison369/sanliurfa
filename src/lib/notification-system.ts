/**
 * Phase 117: Enhanced Notification System
 * Rich notifications with scheduling, preferences, and aggregation
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type NotificationChannel = 'in-app' | 'push' | 'email' | 'sms';
export type NotificationPriority = 'urgent' | 'normal' | 'low';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  read: boolean;
  actions?: Array<{ label: string; actionId: string }>;
  metadata?: Record<string, any>;
  createdAt: number;
  readAt?: number;
}

export interface ScheduledNotification extends Notification {
  scheduledAt: number;
  sentAt?: number;
}

export interface NotificationPreference {
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  enabledTypes?: string[];
  quietHours?: { start: string; end: string };
  doNotDisturb: boolean;
  aggregateNotifications: boolean;
  aggregationWindow: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  variables: string[];
  createdAt: number;
}

// ==================== NOTIFICATION MANAGER ====================

export class NotificationManager {
  private notifications = new Map<string, Notification>();
  private userNotifications = new Map<string, Notification[]>();
  private notificationCount = 0;
  private templates = new Map<string, NotificationTemplate>();

  /**
   * Send notification
   */
  sendNotification(config: Omit<Notification, 'id' | 'createdAt' | 'read' | 'readAt'>): Notification {
    const id = 'notif-' + Date.now() + '-' + this.notificationCount++;

    const notification: Notification = {
      ...config,
      id,
      createdAt: Date.now(),
      read: false
    };

    this.notifications.set(id, notification);

    const userNotifs = this.userNotifications.get(config.userId) || [];
    userNotifs.push(notification);
    this.userNotifications.set(config.userId, userNotifs);

    logger.info('Notification sent', {
      notificationId: id,
      userId: config.userId,
      title: config.title,
      priority: config.priority
    });

    return notification;
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const notifs = this.userNotifications.get(userId) || [];

    if (unreadOnly) {
      return notifs.filter(n => !n.read);
    }

    return notifs;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notif = this.notifications.get(notificationId);
    if (notif) {
      notif.read = true;
      notif.readAt = Date.now();
      logger.debug('Notification marked as read', { notificationId });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): void {
    const notifs = this.userNotifications.get(userId) || [];

    for (const notif of notifs) {
      if (!notif.read) {
        notif.read = true;
        notif.readAt = Date.now();
      }
    }

    logger.debug('All notifications marked as read', { userId, count: notifs.length });
  }

  /**
   * Get notification
   */
  getNotification(notificationId: string): Notification | null {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    const notif = this.notifications.get(notificationId);
    if (notif) {
      const userNotifs = this.userNotifications.get(notif.userId) || [];
      const idx = userNotifs.findIndex(n => n.id === notificationId);
      if (idx >= 0) {
        userNotifs.splice(idx, 1);
      }
      this.notifications.delete(notificationId);
      logger.debug('Notification deleted', { notificationId });
    }
  }

  /**
   * Create template
   */
  createTemplate(name: string, title: string, message: string, priority: NotificationPriority = 'normal'): NotificationTemplate {
    const id = 'template-' + Date.now();
    const variables = this.extractVariables(message);

    const template: NotificationTemplate = {
      id,
      name,
      title,
      message,
      priority,
      variables,
      createdAt: Date.now()
    };

    this.templates.set(id, template);

    logger.debug('Notification template created', { templateId: id, name });

    return template;
  }

  /**
   * Send from template
   */
  sendFromTemplate(userId: string, templateId: string, variables: Record<string, string>, channels: NotificationChannel[]): Notification {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const title = this.interpolate(template.title, variables);
    const message = this.interpolate(template.message, variables);

    return this.sendNotification({
      userId,
      title,
      message,
      priority: template.priority,
      channels
    });
  }

  /**
   * Extract variables from message
   */
  private extractVariables(message: string): string[] {
    const regex = /\{(\w+)\}/g;
    const matches = message.match(regex) || [];
    return matches.map(m => m.slice(1, -1));
  }

  /**
   * Interpolate variables
   */
  private interpolate(text: string, variables: Record<string, string>): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return result;
  }
}

// ==================== SCHEDULED NOTIFICATIONS ====================

export class ScheduledNotifications {
  private scheduled = new Map<string, ScheduledNotification>();
  private scheduleCount = 0;

  /**
   * Schedule notification
   */
  scheduleNotification(notification: Omit<ScheduledNotification, 'id' | 'createdAt' | 'read'>, sendAt: number): ScheduledNotification {
    const id = 'scheduled-' + Date.now() + '-' + this.scheduleCount++;

    const scheduled: ScheduledNotification = {
      ...notification,
      id,
      createdAt: Date.now(),
      read: false,
      scheduledAt: sendAt
    };

    this.scheduled.set(id, scheduled);

    logger.debug('Notification scheduled', {
      notificationId: id,
      userId: notification.userId,
      scheduledAt: new Date(sendAt).toISOString()
    });

    return scheduled;
  }

  /**
   * Get due notifications
   */
  getDueNotifications(): ScheduledNotification[] {
    const now = Date.now();
    const due: ScheduledNotification[] = [];

    for (const notif of this.scheduled.values()) {
      if (notif.scheduledAt <= now && !notif.sentAt) {
        due.push(notif);
      }
    }

    return due;
  }

  /**
   * Mark as sent
   */
  markAsSent(scheduledId: string): void {
    const notif = this.scheduled.get(scheduledId);
    if (notif) {
      notif.sentAt = Date.now();
      logger.debug('Scheduled notification sent', { scheduledId });
    }
  }

  /**
   * Cancel scheduled notification
   */
  cancelScheduled(scheduledId: string): void {
    this.scheduled.delete(scheduledId);
    logger.debug('Scheduled notification cancelled', { scheduledId });
  }

  /**
   * Get user scheduled notifications
   */
  getUserScheduled(userId: string): ScheduledNotification[] {
    const notifs: ScheduledNotification[] = [];

    for (const notif of this.scheduled.values()) {
      if (notif.userId === userId) {
        notifs.push(notif);
      }
    }

    return notifs;
  }
}

// ==================== NOTIFICATION PREFERENCES ====================

export class NotificationPreferences {
  private preferences = new Map<string, NotificationPreference>();

  /**
   * Set user preferences
   */
  setUserPreferences(userId: string, prefs: Partial<NotificationPreference>): NotificationPreference {
    const existing = this.preferences.get(userId);

    const preference: NotificationPreference = {
      userId,
      channels: prefs.channels || {
        'in-app': true,
        push: true,
        email: true,
        sms: false
      },
      enabledTypes: prefs.enabledTypes,
      quietHours: prefs.quietHours,
      doNotDisturb: prefs.doNotDisturb || false,
      aggregateNotifications: prefs.aggregateNotifications ?? true,
      aggregationWindow: prefs.aggregationWindow || 5 * 60 * 1000
    };

    this.preferences.set(userId, preference);

    logger.debug('Notification preferences set', { userId });

    return preference;
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): NotificationPreference | null {
    return this.preferences.get(userId) || null;
  }

  /**
   * Check if channel enabled
   */
  isChannelEnabled(userId: string, channel: NotificationChannel): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs) return true; // Default to enabled

    return prefs.channels[channel] && !prefs.doNotDisturb;
  }

  /**
   * Check if in quiet hours
   */
  isInQuietHours(userId: string): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs || !prefs.quietHours) return false;

    const now = new Date();
    const [startHour, startMin] = prefs.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHours.end.split(':').map(Number);

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Enable DND
   */
  setDoNotDisturb(userId: string, enabled: boolean, durationMs?: number): void {
    const prefs = this.preferences.get(userId) || {
      userId,
      channels: { 'in-app': true, push: true, email: true, sms: false },
      doNotDisturb: enabled,
      aggregateNotifications: true,
      aggregationWindow: 5 * 60 * 1000
    };

    prefs.doNotDisturb = enabled;

    this.preferences.set(userId, prefs);

    logger.debug('Do Not Disturb toggled', { userId, enabled, durationMs });
  }
}

// ==================== NOTIFICATION AGGREGATOR ====================

export class NotificationAggregator {
  /**
   * Aggregate notifications
   */
  aggregateNotifications(notifications: Notification[], options: {
    timeWindow: number;
    maxGroupSize?: number;
    groupByType?: boolean;
  }): Notification[][] {
    const now = Date.now();
    const groups: Notification[][] = [];
    let currentGroup: Notification[] = [];

    const filtered = notifications.filter(n => now - n.createdAt <= options.timeWindow);

    if (options.groupByType) {
      const typeMap = new Map<string, Notification[]>();

      for (const notif of filtered) {
        const type = notif.metadata?.type || 'default';
        const typeNotifs = typeMap.get(type) || [];
        typeNotifs.push(notif);
        typeMap.set(type, typeNotifs);
      }

      for (const notifs of typeMap.values()) {
        groups.push(notifs);
      }
    } else {
      const maxSize = options.maxGroupSize || 5;

      for (const notif of filtered) {
        currentGroup.push(notif);

        if (currentGroup.length >= maxSize) {
          groups.push(currentGroup);
          currentGroup = [];
        }
      }

      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
    }

    logger.debug('Notifications aggregated', {
      totalNotifications: filtered.length,
      groupCount: groups.length
    });

    return groups;
  }

  /**
   * Get aggregation summary
   */
  getAggregationSummary(notifications: Notification[]): {
    total: number;
    byPriority: Record<NotificationPriority, number>;
    unread: number;
  } {
    const summary = {
      total: notifications.length,
      byPriority: { urgent: 0, normal: 0, low: 0 },
      unread: 0
    };

    for (const notif of notifications) {
      summary.byPriority[notif.priority]++;
      if (!notif.read) summary.unread++;
    }

    return summary;
  }

  /**
   * Deduplicate notifications
   */
  deduplicateNotifications(notifications: Notification[]): Notification[] {
    const seen = new Set<string>();
    const deduplicated: Notification[] = [];

    for (const notif of notifications) {
      const key = `${notif.title}-${notif.message}`;

      if (!seen.has(key)) {
        deduplicated.push(notif);
        seen.add(key);
      }
    }

    return deduplicated;
  }
}

// ==================== EXPORTS ====================

export const notificationManager = new NotificationManager();
export const scheduledNotifications = new ScheduledNotifications();
export const notificationPreferences = new NotificationPreferences();
export const notificationAggregator = new NotificationAggregator();
