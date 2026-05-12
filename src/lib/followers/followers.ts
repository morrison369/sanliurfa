/**
 * Followers & Following System
 * Manage user relationships and social connections
 */

import { query, queryOne, queryMany } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';
import { createNotification } from '../notification/notifications-queue';
import { logger } from '../logger';

export interface FollowUser {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  points: number;
  level: number;
  created_at: string;
}

export interface FollowerStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_follower: boolean;
  mutual_friends_count?: number;
}

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    // Prevent self-following (handled by constraint, but validate here too)
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const result = await query(
      `INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return false; // Already following (concurrent or duplicate)
    }

    // Cache invalidate (paralel) + notification follower lookup (independent)
    const [, , follower] = await Promise.all([
      clearFollowerCache(followerId),
      clearFollowerCache(followingId),
      queryOne('SELECT full_name FROM users WHERE id = $1', [followerId]),
    ]);
    await createNotification(
      followingId,
      'new_follower',
      `${follower?.full_name || 'Bir kullanıcı'} seni takip etmeye başladı`,
      'action',
      {
        icon: '👤',
        actionUrl: `/kullanici/${followerId}`,
        actionLabel: 'Profili Gör'
      }
    );

    logger.info('User followed', { followerId, followingId });
    return true;
  } catch (error) {
    logger.error('Failed to follow user', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followingId
    });
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    if ((result.rowCount || 0) > 0) {
      // Clear cache (paralel)
      await Promise.all([
        clearFollowerCache(followerId),
        clearFollowerCache(followingId),
      ]);
    }

    logger.info('User unfollowed', { followerId, followingId });
    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to unfollow user', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followingId
    });
    throw error;
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(userId: string, limit: number = 50): Promise<FollowUser[]> {
  const cacheKey = `followers:${userId}`;

  try {
    const cached = await getCache<FollowUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await queryMany(
      `SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.bio,
        u.points,
        u.level,
        u.created_at
      FROM users u
      INNER JOIN followers f ON u.id = f.follower_id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    const followers = result.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      bio: row.bio,
      points: row.points,
      level: row.level,
      created_at: row.created_at
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, followers, 300);

    return followers;
  } catch (error) {
    logger.error('Failed to get followers', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string, limit: number = 50): Promise<FollowUser[]> {
  const cacheKey = `following:${userId}`;

  try {
    const cached = await getCache<FollowUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await queryMany(
      `SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.bio,
        u.points,
        u.level,
        u.created_at
      FROM users u
      INNER JOIN followers f ON u.id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    const following = result.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      bio: row.bio,
      points: row.points,
      level: row.level,
      created_at: row.created_at
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, following, 300);

    return following;
  } catch (error) {
    logger.error('Failed to get following', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get mutual friends (users who follow each other)
 */
export async function getMutualFriends(userId: string, limit: number = 50): Promise<FollowUser[]> {
  const cacheKey = `mutual-friends:${userId}`;

  try {
    const cached = await getCache<FollowUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await queryMany(
      `SELECT DISTINCT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.bio,
        u.points,
        u.level,
        u.created_at
      FROM users u
      WHERE EXISTS (
        -- User follows me
        SELECT 1 FROM followers WHERE follower_id = u.id AND following_id = $1
      )
      AND EXISTS (
        -- I follow user
        SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = u.id
      )
      ORDER BY u.created_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    const friends = result.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      bio: row.bio,
      points: row.points,
      level: row.level,
      created_at: row.created_at
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, friends, 300);

    return friends;
  } catch (error) {
    logger.error('Failed to get mutual friends', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get follower stats for a user
 */
export async function getFollowerStats(userId: string, currentUserId?: string): Promise<FollowerStats> {
  try {
    const result = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM followers WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = $1) as following_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = $2 AND following_id = $1) as is_following,
        (SELECT COUNT(*) FROM followers WHERE follower_id = $1 AND following_id = $2) as is_follower
      FROM users WHERE id = $1`,
      [userId, currentUserId || null]
    );

    return {
      followers_count: parseInt(result?.followers_count || '0', 10),
      following_count: parseInt(result?.following_count || '0', 10),
      is_following: currentUserId ? (parseInt(result?.is_following || '0', 10) > 0) : false,
      is_follower: currentUserId ? (parseInt(result?.is_follower || '0', 10) > 0) : false
    };
  } catch (error) {
    logger.error('Failed to get follower stats', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Check if user A is following user B
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    return !!result;
  } catch (error) {
    logger.error('Failed to check if following', error instanceof Error ? error : new Error(String(error)), {
      followerId,
      followingId
    });
    throw error;
  }
}

/**
 * Clear follower cache for a user
 *
 * NOT: Bu modül ile `lib/following/following.ts` paralel cache pattern'leri kullanır:
 * - Liste: `followers:${userId}` (bu modül) ve `followers:${userId}:${limit}:${offset}` (following modülü)
 * - Sayım: `follower_count:${userId}` + `following_count:${userId}` (yalnızca following modülünden okunur/yazılır)
 * - Mutuals: `mutual-friends:${userId}` (yalnızca bu modülden)
 *
 * Bir taraftan follow/unfollow yapıldığında karşı modülün cache key'leri stale kalmasın diye
 * burası HER İKİ ailenin de cache key'lerini invalidate eder.
 */
async function clearFollowerCache(userId: string): Promise<void> {
  await Promise.all([
    deleteCache(`followers:${userId}`),
    deleteCache(`following:${userId}`),
    deleteCache(`mutual-friends:${userId}`),
    deleteCache(`follower_count:${userId}`),
    deleteCache(`following_count:${userId}`),
  ]);
}


