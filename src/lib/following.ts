/**
 * User Follow System
 * User-to-user following relationships with caching
 */

import { query, queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface FollowUser {
  id: string;
  full_name: string;
  username?: string;
  avatar?: string;
  points: number;
  level: number;
  followers_count: number;
  following_count: number;
}

/**
 * Follow a user
 * Returns existing follow if already following
 */
export async function followUser(followerId: string, followedId: string): Promise<void> {
  try {
    // Prevent self-following (DB constraint handles this but we check first)
    if (followerId === followedId) {
      throw new Error('Cannot follow yourself');
    }

    // Try to create follow relationship
    await insert('followers', {
      follower_id: followerId,
      following_id: followedId,
      created_at: new Date().toISOString()
    });

    // Clear caches
    await deleteCache(`sanliurfa:followers:${followedId}`);
    await deleteCache(`sanliurfa:following:${followerId}`);
    await deleteCache(`sanliurfa:follower_count:${followedId}`);
    await deleteCache(`sanliurfa:following_count:${followerId}`);
  } catch (error) {
    // If unique constraint violation, user already follows (not an error)
    if (error instanceof Error && error.message.includes('duplicate')) {
      return;
    }
    logger.error('Failed to follow user', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followedId
    });
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followedId: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followedId]
    );

    if ((result.rowCount || 0) > 0) {
      // Clear caches
      await deleteCache(`sanliurfa:followers:${followedId}`);
      await deleteCache(`sanliurfa:following:${followerId}`);
      await deleteCache(`sanliurfa:follower_count:${followedId}`);
      await deleteCache(`sanliurfa:following_count:${followerId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to unfollow user', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followedId
    });
    throw error;
  }
}

/**
 * Check if user follows another user
 */
export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM followers WHERE follower_id = $1 AND following_id = $2 LIMIT 1',
      [followerId, followedId]
    );
    return !!result;
  } catch (error) {
    logger.error('Failed to check follow status', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followedId
    });
    return false;
  }
}

/**
 * Get list of followers for a user
 */
export async function getFollowers(userId: string, limit: number = 50, offset: number = 0): Promise<FollowUser[]> {
  const cacheKey = `sanliurfa:followers:${userId}:${limit}:${offset}`;

  try {
    // Try cache first
    const cached = await getCache<FollowUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await queryRows(
      `SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar,
        u.points,
        u.level,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
       FROM followers uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const followers: FollowUser[] = results.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar: row.avatar,
      points: row.points || 0,
      level: row.level || 0,
      followers_count: parseInt(row.followers_count || '0'),
      following_count: parseInt(row.following_count || '0')
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, followers, 300);

    return followers;
  } catch (error) {
    logger.error('Failed to get followers', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
}

/**
 * Get list of users that a user is following
 */
export async function getFollowing(userId: string, limit: number = 50, offset: number = 0): Promise<FollowUser[]> {
  const cacheKey = `sanliurfa:following:${userId}:${limit}:${offset}`;

  try {
    // Try cache first
    const cached = await getCache<FollowUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await queryRows(
      `SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar,
        u.points,
        u.level,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
       FROM followers uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const following: FollowUser[] = results.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar: row.avatar,
      points: row.points || 0,
      level: row.level || 0,
      followers_count: parseInt(row.followers_count || '0'),
      following_count: parseInt(row.following_count || '0')
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, following, 300);

    return following;
  } catch (error) {
    logger.error('Failed to get following', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(userId: string): Promise<number> {
  const cacheKey = `sanliurfa:follower_count:${userId}`;

  try {
    // Try cache first
    const cached = await getCache<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const result = await queryOne(
      'SELECT COUNT(*) as count FROM followers WHERE following_id = $1',
      [userId]
    );

    const count = parseInt(result?.count || '0');

    // Cache for 10 minutes
    await setCache(cacheKey, count, 600);

    return count;
  } catch (error) {
    logger.error('Failed to get follower count', error instanceof Error ? error : new Error(String(error)), { userId });
    return 0;
  }
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId: string): Promise<number> {
  const cacheKey = `sanliurfa:following_count:${userId}`;

  try {
    // Try cache first
    const cached = await getCache<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const result = await queryOne(
      'SELECT COUNT(*) as count FROM followers WHERE follower_id = $1',
      [userId]
    );

    const count = parseInt(result?.count || '0');

    // Cache for 10 minutes
    await setCache(cacheKey, count, 600);

    return count;
  } catch (error) {
    logger.error('Failed to get following count', error instanceof Error ? error : new Error(String(error)), { userId });
    return 0;
  }
}
