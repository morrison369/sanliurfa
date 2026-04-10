/**
 * Activity Feed System
 * Personalized feed showing activities from followed users and collections
 */

import { queryRows, queryOne } from './postgres';
import { getCache, setCache } from './cache';
import { logger } from './logging';

export interface FeedItem {
  id: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  actionType: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * Get personalized activity feed for a user
 * Shows activities from:
 * 1. Followed users
 * 2. Followed collections
 */
export async function getActivityFeed(userId: string, limit: number = 50, offset: number = 0): Promise<FeedItem[]> {
  const cacheKey = `sanliurfa:feed:${userId}`;

  try {
    // Try cache first
    const cached = await getCache<FeedItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get activities from followed users
    const results = await queryRows(
      `
      SELECT DISTINCT
        ua.id,
        ua.user_id,
        u.full_name as user_name,
        u.avatar_url as user_avatar,
        ua.action_type,
        ua.reference_type,
        ua.reference_id,
        ua.metadata,
        ua.created_at
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id IN (
        SELECT following_id FROM followers WHERE follower_id = $1
      )
      OR ua.user_id = $1
      ORDER BY ua.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    const feed: FeedItem[] = results.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      actionType: row.action_type,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at
    }));

    // Cache for 2 minutes
    await setCache(cacheKey, feed, 120);

    return feed;
  } catch (error) {
    logger.error(
      'Failed to get activity feed',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Get user's personal activity (just their own activities)
 */
export async function getPersonalActivity(userId: string, limit: number = 30): Promise<FeedItem[]> {
  try {
    const results = await queryRows(
      `
      SELECT
        ua.id,
        ua.user_id,
        u.full_name as user_name,
        u.avatar_url as user_avatar,
        ua.action_type,
        ua.reference_type,
        ua.reference_id,
        ua.metadata,
        ua.created_at
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id = $1
      ORDER BY ua.created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      actionType: row.action_type,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at
    }));
  } catch (error) {
    logger.error(
      'Failed to get personal activity',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Get activities from a specific user
 */
export async function getUserActivities(targetUserId: string, limit: number = 20): Promise<FeedItem[]> {
  try {
    const results = await queryRows(
      `
      SELECT
        ua.id,
        ua.user_id,
        u.full_name as user_name,
        u.avatar_url as user_avatar,
        ua.action_type,
        ua.reference_type,
        ua.reference_id,
        ua.metadata,
        ua.created_at
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id = $1
      ORDER BY ua.created_at DESC
      LIMIT $2
      `,
      [targetUserId, limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      actionType: row.action_type,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at
    }));
  } catch (error) {
    logger.error(
      'Failed to get user activities',
      error instanceof Error ? error : new Error(String(error)),
      { targetUserId }
    );
    throw error;
  }
}

/**
 * Get trending activities (most liked/commented activities)
 */
export async function getTrendingActivities(limit: number = 10): Promise<FeedItem[]> {
  try {
    const results = await queryRows(
      `
      SELECT
        ua.id,
        ua.user_id,
        u.full_name as user_name,
        u.avatar_url as user_avatar,
        ua.action_type,
        ua.reference_type,
        ua.reference_id,
        ua.metadata,
        ua.created_at,
        COUNT(*) as interaction_count
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.created_at > NOW() - INTERVAL '7 days'
      GROUP BY ua.id, u.full_name, u.avatar_url
      ORDER BY interaction_count DESC, ua.created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      actionType: row.action_type,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at
    }));
  } catch (error) {
    logger.error(
      'Failed to get trending activities',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Clear feed cache for a user
 */
export async function clearFeedCache(userId: string): Promise<void> {
  try {
    const cacheKey = `sanliurfa:feed:${userId}`;
    await setCache(cacheKey, null, 0); // Immediate expiry
  } catch (error) {
    logger.warn(
      'Failed to clear feed cache',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
  }
}
