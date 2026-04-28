/**
 * Advanced Notifications Center
 * Unified notification management
 */

import { query } from '../postgres';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
}

/**
 * Get user notifications
 */
export async function getNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  let sql = `SELECT * FROM notifications WHERE user_id = $1`;
  const params: any[] = [userId];

  if (options.unreadOnly) {
    sql += ` AND read = false`;
  }

  sql += ` ORDER BY created_at DESC`;

  if (options.limit) {
    sql += ` LIMIT $2`;
    params.push(options.limit);
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Mark as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}
