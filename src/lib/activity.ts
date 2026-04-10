/**
 * User Activity Tracking
 * Log and retrieve user actions for activity feed
 */

import { insert, queryRows } from './postgres';
import { getCache, setCache } from './cache';
import { logger } from './logging';

export interface ActivityItem {
  id: number;
  userId: string;
  actionType: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * Log user activity (fire-and-forget)
 */
export async function logActivity(
  userId: string,
  actionType: string,
  referenceType?: string,
  referenceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await insert('user_activity', {
      user_id: userId,
      action_type: actionType,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString()
    });

    // Clear user activity cache
    await clearUserActivityCache(userId);
  } catch (error) {
    logger.warn('Failed to log activity', error instanceof Error ? error : new Error(String(error)), {
      userId,
      actionType
    });
    // Don't throw - activity logging should not break main operations
  }
}

/**
 * Get user's activity feed
 */
export async function getUserActivity(userId: string, limit: number = 20): Promise<ActivityItem[]> {
  try {
    // Try cache first
    const cacheKey = `sanliurfa:activity:${userId}`;
    const cached = await getCache<ActivityItem[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Query from database
    const results = await queryRows<any>(
      `SELECT
        id,
        user_id,
        action_type,
        reference_type,
        reference_id,
        metadata,
        created_at
       FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const activity = results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      actionType: r.action_type,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      createdAt: r.created_at
    }));

    // Cache for 2 minutes
    await setCache(cacheKey, activity, 120);

    return activity;
  } catch (error) {
    logger.error('Get user activity failed', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return [];
  }
}

/**
 * Clear user activity cache
 */
async function clearUserActivityCache(userId: string): Promise<void> {
  try {
    const cacheKey = `sanliurfa:activity:${userId}`;
    await setCache(cacheKey, null, 0); // Immediate expiry
  } catch (error) {
    logger.warn('Failed to clear activity cache', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get activity description for frontend display
 */
export function getActivityDescription(item: ActivityItem): string {
  switch (item.actionType) {
    case 'review_created':
      return `"${item.metadata?.placeName || 'bir yere'}" yorum yaptı`;
    case 'favorite_added':
      return `"${item.metadata?.placeName || 'bir yeri'}" favorilerine ekledi`;
    case 'badge_earned':
      return `"${item.metadata?.badgeName || 'Rozet'}" rozeti kazandı`;
    case 'level_up':
      return `Level ${item.metadata?.newLevel || '?'} oldu`;
    case 'comment_posted':
      return 'Blog yazısına yorum yaptı';
    case 'points_earned':
      return `${item.metadata?.points || 0} puan kazandı`;
    default:
      return 'Bir eylem gerçekleştirdi';
  }
}

/**
 * Get activity icon for frontend display
 */
export function getActivityIcon(item: ActivityItem): string {
  switch (item.actionType) {
    case 'review_created':
      return '✍️';
    case 'favorite_added':
      return '❤️';
    case 'badge_earned':
      return '🏅';
    case 'level_up':
      return '⬆️';
    case 'comment_posted':
      return '💬';
    case 'points_earned':
      return '⭐';
    default:
      return '📌';
  }
}
