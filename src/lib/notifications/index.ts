/**
 * Notification Module
 * Multi-channel notifications: Email, SMS, Push, In-App
 */

import { query } from '../postgres';
import { sendEmail } from '../email';
import { sendSMS } from '../sms';
import { sendNotification as sendPushNotification } from '../push';
import { safeErrorDetail } from '../api';

export interface NotificationPayload {
  type: 'email' | 'sms' | 'push' | 'in-app';
  recipient: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
}

export interface NotificationPreference {
  userId: string;
  channel: string;
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

// In-memory template cache
const templateCache = new Map<string, NotificationTemplate>();

/**
 * Send notification through specified channel
 */
export async function sendNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // Check user preferences
  if (payload.type !== 'in-app') {
    const prefs = await getNotificationPreference(payload.recipient, payload.type);
    if (prefs && !prefs.enabled) {
      return { success: false, error: 'User has disabled this channel' };
    }

    // Check quiet hours
    if (prefs?.quietHoursStart !== undefined) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= prefs.quietHoursStart && currentHour < (prefs.quietHoursEnd || 24)) {
        // Schedule for later
        await scheduleNotification({
          ...payload,
          scheduledAt: new Date(now.setHours(prefs.quietHoursEnd || 8)),
        });
        return { success: true, messageId: 'scheduled' };
      }
    }
  }

  try {
    switch (payload.type) {
      case 'email':
        return await sendEmailNotification(payload);
      case 'sms':
        return await sendSMSNotification(payload);
      case 'push':
        return await sendPushNotificationInternal(payload);
      case 'in-app':
        return await sendInAppNotification(payload);
      default:
        return { success: false, error: 'Unknown notification type' };
    }
  } catch (error: any) {
    // Log failed notification
    await logNotification({ ...payload, status: 'failed', error: error.message });
    return { success: false, error: safeErrorDetail(error, 'Bildirim gönderilemedi') };
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(payload: NotificationPayload) {
  const result = await sendEmail({
    to: payload.recipient,
    subject: payload.title,
    html: payload.message,
  });

  await logNotification({ ...payload, status: result.success ? 'sent' : 'failed' });
  return result;
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(payload: NotificationPayload) {
  const result = await sendSMS({
    to: payload.recipient,
    message: payload.message,
  });

  await logNotification({ ...payload, status: result.success ? 'sent' : 'failed' });
  return result;
}

/**
 * Send push notification
 */
async function sendPushNotificationInternal(payload: NotificationPayload) {
  // Get user push subscriptions
  const subs = await query(
    `SELECT subscription FROM push_subscriptions WHERE user_id = $1`,
    [payload.recipient]
  );

  if (subs.rows.length === 0) {
    return { success: false, error: 'No push subscriptions found' };
  }

  const results = await Promise.all(
    subs.rows.map(async (row: any) => {
      try {
        await sendPushNotification(row.subscription, {
          title: payload.title,
          body: payload.message,
          ...(payload.data ? { data: payload.data } : {}),
        });
        return true;
      } catch (e) {
        return false;
      }
    })
  );

  const success = results.some(r => r);
  await logNotification({ ...payload, status: success ? 'sent' : 'failed' });
  return { success, messageId: `push-${Date.now()}` };
}

/**
 * Send in-app notification
 */
async function sendInAppNotification(payload: NotificationPayload) {
  await query(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
     VALUES ($1, 'in-app', $2, $3, NOW())`,
    [payload.recipient, payload.title, payload.message]
  );

  await logNotification({ ...payload, status: 'sent' });
  return { success: true, messageId: `inapp-${Date.now()}` };
}

/**
 * Schedule notification for later
 */
export async function scheduleNotification(
  payload: NotificationPayload & { scheduledAt: Date }
): Promise<string> {
  const result = await query(
    `INSERT INTO scheduled_notifications 
     (recipient, type, title, message, data, priority, scheduled_at, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
     RETURNING id`,
    [payload.recipient, payload.type, payload.title, payload.message,
     JSON.stringify(payload.data), payload.priority || 'normal', payload.scheduledAt]
  );

  return result.rows[0].id;
}

/**
 * Process scheduled notifications
 */
export async function processScheduledNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const pending = await query(
    `SELECT * FROM scheduled_notifications 
     WHERE status = 'pending' AND scheduled_at <= NOW()
     LIMIT 50`
  );

  // Fire all sends in parallel, then batch-update results
  const sendResults = await Promise.allSettled(
    pending.rows.map(row => sendNotification({
      type: row.type,
      recipient: row.recipient,
      title: row.title,
      message: row.message,
      data: row.data,
      priority: row.priority,
    }))
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    sendResults.map(async (result, i) => {
      const row = pending.rows[i];
      const success = result.status === 'fulfilled' && result.value.success;
      const error = result.status === 'fulfilled'
        ? (result.value.error ?? null)
        : (result.reason instanceof Error ? result.reason.message : 'dispatch_error');
      if (success) sent++;
      else failed++;
      await query(
        `UPDATE scheduled_notifications SET status = $1, sent_at = NOW(), error = $2 WHERE id = $3`,
        [success ? 'sent' : 'failed', error, row.id]
      ).catch(() => null);
    }),
  );

  return { processed: pending.rows.length, sent, failed };
}

/**
 * Log notification
 */
async function logNotification(
  payload: NotificationPayload & { status: string; error?: string }
): Promise<void> {
  await query(
    `INSERT INTO notification_logs 
     (recipient, type, title, status, error, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [payload.recipient, payload.type, payload.title, payload.status, payload.error]
  );
}

/**
 * Get or create template
 */
export async function getTemplate(name: string, type: 'email' | 'sms' | 'push'): Promise<NotificationTemplate | null> {
  const cacheKey = `${type}:${name}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  const result = await query(
    `SELECT * FROM notification_templates WHERE name = $1 AND type = $2`,
    [name, type]
  );

  if (result.rows.length === 0) return null;

  const template = result.rows[0];
  templateCache.set(cacheKey, template);
  return template;
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>
): string {
  let content = template.content;
  
  template.variables.forEach(varName => {
    const value = variables[varName] || '';
    // Escape regex special chars in varName to prevent ReDoS via crafted template variables
    const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp(`\\{\\{${escapedVar}\\}\\}`, 'g'), value);
  });

  return content;
}

/**
 * Get notification preference
 */
export async function getNotificationPreference(
  userId: string,
  channel: string
): Promise<NotificationPreference | null> {
  const result = await query(
    `SELECT * FROM notification_preferences WHERE user_id = $1 AND channel = $2`,
    [userId, channel]
  );

  return result.rows[0] || null;
}

/**
 * Update notification preference
 */
export async function updateNotificationPreference(
  userId: string,
  channel: string,
  preference: Partial<NotificationPreference>
): Promise<void> {
  // HARD RULE #47: atomic upsert — ON CONFLICT eliminates SELECT+INSERT/UPDATE race window
  await query(
    `INSERT INTO notification_preferences (user_id, channel, enabled, frequency, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, channel) DO UPDATE SET
       enabled = COALESCE(EXCLUDED.enabled, notification_preferences.enabled),
       frequency = COALESCE(EXCLUDED.frequency, notification_preferences.frequency),
       updated_at = NOW()`,
    [userId, channel, preference.enabled ?? true, preference.frequency || 'immediate']
  );
}

/**
 * Get user's in-app notifications
 */
export async function getInAppNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<any[]> {
  const { unreadOnly = false, limit = 20 } = options;

  let sql = `SELECT * FROM notifications WHERE user_id = $1`;
  const params: any[] = [userId];

  if (unreadOnly) {
    sql += ` AND read_at IS NULL`;
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );

  // Broadcast to connected clients
  broadcastNotificationUpdate(userId, { type: 'read', notificationId });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read_at = NOW() 
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );

  broadcastNotificationUpdate(userId, { type: 'read-all' });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// WebSocket broadcast helper (placeholder)
const connectedClients = new Map<string, any>();

function broadcastNotificationUpdate(userId: string, data: any) {
  const client = connectedClients.get(userId);
  if (client) {
    client.send(JSON.stringify({ type: 'notification-update', data }));
  }
}

/**
 * Subscribe client for real-time notifications
 */
export function subscribeToNotifications(userId: string, client: any): () => void {
  connectedClients.set(userId, client);
  
  return () => {
    connectedClients.delete(userId);
  };
}

/**
 * Notification batch send (for campaigns)
 */
export async function sendBulkNotifications(
  recipients: string[],
  payload: Omit<NotificationPayload, 'recipient'>
): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (recipient) => {
        try {
          const result = await sendNotification({ ...payload, recipient });
          if (result.success) sent++;
          else failed++;
        } catch (e) {
          failed++;
        }
      })
    );
  }

  return { total: recipients.length, sent, failed };
}

