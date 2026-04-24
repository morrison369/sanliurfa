/**
 * Social Graph - Friendship System (PostgreSQL)
 * Follow/Unfollow, friend requests, social connections
 */

import { query, queryOne, transaction } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';

// Friendship status
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

// Friendship record
export interface Friendship {
  id: string;
  follower_user_id: string;
  following_user_id: string;
  followed_at: string;
  created_at: string;
  is_approved?: boolean;
}

// Follow request
export interface FollowRequest {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  requested_at: string;
  responded_at?: string;
}

// User with friendship info
export interface UserWithFriendship {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  friendship_status?: 'following' | 'follows_you' | 'mutual' | 'pending_sent' | 'pending_received' | 'blocked' | null;
}

// Social stats
export interface SocialStats {
  user_id: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  engagement_score: number;
}

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<Friendship> {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  // Check if already following
  const existing = await queryOne<Friendship>(
    'SELECT * FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
    [followerId, followingId]
  );

  if (existing) {
    throw new Error('Already following this user');
  }

  // Check if blocked
  const blocked = await queryOne(
    'SELECT * FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
    [followingId, followerId]
  );

  if (blocked) {
    throw new Error('Cannot follow this user');
  }

  // Check recipient's privacy settings
  const recipient = await queryOne<{ privacy_settings: { profile_public: boolean } }>(
    'SELECT privacy_settings FROM users WHERE id = $1',
    [followingId]
  );

  const isPublic = recipient?.privacy_settings?.profile_public !== false;

  return await transaction(async (client) => {
    let friendship: Friendship;

    if (isPublic) {
      // Direct follow for public profiles
      const result = await client.query<Friendship>(
        `INSERT INTO user_follows (follower_id, following_id, follower_user_id, following_user_id)
         VALUES ($1, $2, $1, $2)
         RETURNING *`,
        [followerId, followingId]
      );
      friendship = result.rows[0];

      // Update stats
      await client.query(
        `INSERT INTO user_social_stats (user_id, following_count)
         VALUES ($1, 1)
         ON CONFLICT (user_id) DO UPDATE SET following_count = user_social_stats.following_count + 1`,
        [followerId]
      );

      await client.query(
        `INSERT INTO user_social_stats (user_id, follower_count)
         VALUES ($1, 1)
         ON CONFLICT (user_id) DO UPDATE SET follower_count = user_social_stats.follower_count + 1`,
        [followingId]
      );
    } else {
      // Create follow request for private profiles
      await client.query(
        `INSERT INTO follow_requests (requester_user_id, recipient_user_id, status)
         VALUES ($1, $2, 'pending')
         ON CONFLICT (requester_user_id, recipient_user_id) DO NOTHING`,
        [followerId, followingId]
      );

      // Return pending friendship
      friendship = {
        id: 'pending',
        follower_user_id: followerId,
        following_user_id: followingId,
        is_approved: false,
        followed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }

    // Clear caches
    await deleteCache(`social:following:${followerId}`);
    await deleteCache(`social:followers:${followingId}`);

    return friendship;
  });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  return await transaction(async (client) => {
    const result = await client.query(
      'DELETE FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
      [followerId, followingId]
    );

    if (result.rowCount === 0) {
      return false;
    }

    // Update stats
    await client.query(
      `UPDATE user_social_stats SET following_count = GREATEST(0, following_count - 1)
       WHERE user_id = $1`,
      [followerId]
    );

    await client.query(
      `UPDATE user_social_stats SET follower_count = GREATEST(0, follower_count - 1)
       WHERE user_id = $1`,
      [followingId]
    );

    // Clear caches
    await deleteCache(`social:following:${followerId}`);
    await deleteCache(`social:followers:${followingId}`);

    return true;
  });
}

/**
 * Accept follow request
 */
export async function acceptFollowRequest(requestId: string, userId: string): Promise<Friendship> {
  return await transaction(async (client) => {
    // Get the request
    const requestResult = await client.query<FollowRequest>(
      'SELECT * FROM follow_requests WHERE id = $1 AND recipient_user_id = $2 AND status = \'pending\'',
      [requestId, userId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Follow request not found');
    }

    const request = requestResult.rows[0];

    // Update request status
    await client.query(
      'UPDATE follow_requests SET status = \'accepted\', responded_at = NOW() WHERE id = $1',
      [requestId]
    );

    // Create friendship
    const friendshipResult = await client.query<Friendship>(
      `INSERT INTO user_follows (follower_id, following_id, follower_user_id, following_user_id)
       VALUES ($1, $2, $1, $2)
       RETURNING *`,
      [request.requester_user_id, userId]
    );

    // Update stats
    await client.query(
      `INSERT INTO user_social_stats (user_id, following_count)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET following_count = user_social_stats.following_count + 1`,
      [request.requester_user_id]
    );

    await client.query(
      `INSERT INTO user_social_stats (user_id, follower_count)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET follower_count = user_social_stats.follower_count + 1`,
      [userId]
    );

    return friendshipResult.rows[0];
  });
}

/**
 * Decline follow request
 */
export async function declineFollowRequest(requestId: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE follow_requests SET status = \'declined\', responded_at = NOW() WHERE id = $1 AND recipient_user_id = $2',
    [requestId, userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Get followers
 */
export async function getFollowers(userId: string, limit = 50, offset = 0): Promise<UserWithFriendship[]> {
  const cacheKey = `social:followers:${userId}:${limit}:${offset}`;
  const cached = await getCache<UserWithFriendship[]>(cacheKey);
  if (cached) return cached;

  const result = await query<UserWithFriendship>(
    `SELECT 
      u.id, u.full_name, u.username, u.avatar_url, u.bio,
      COALESCE(s.follower_count, 0) as follower_count,
      COALESCE(s.following_count, 0) as following_count,
      'follows_you' as friendship_status
     FROM user_follows f
     JOIN users u ON u.id = f.follower_user_id
     LEFT JOIN user_social_stats s ON s.user_id = u.id
     WHERE f.following_user_id = $1
     ORDER BY f.followed_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  await setCache(cacheKey, result.rows, 300);
  return result.rows;
}

/**
 * Get following
 */
export async function getFollowing(userId: string, limit = 50, offset = 0): Promise<UserWithFriendship[]> {
  const cacheKey = `social:following:${userId}:${limit}:${offset}`;
  const cached = await getCache<UserWithFriendship[]>(cacheKey);
  if (cached) return cached;

  const result = await query<UserWithFriendship>(
    `SELECT 
      u.id, u.full_name, u.username, u.avatar_url, u.bio,
      COALESCE(s.follower_count, 0) as follower_count,
      COALESCE(s.following_count, 0) as following_count,
      'following' as friendship_status
     FROM user_follows f
     JOIN users u ON u.id = f.following_user_id
     LEFT JOIN user_social_stats s ON s.user_id = u.id
     WHERE f.follower_user_id = $1
     ORDER BY f.followed_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  await setCache(cacheKey, result.rows, 300);
  return result.rows;
}

/**
 * Get pending follow requests
 */
export async function getPendingRequests(userId: string): Promise<(FollowRequest & { requester: UserWithFriendship })[]> {
  const result = await query<FollowRequest & { requester: UserWithFriendship }>(
    `SELECT 
      fr.*,
      json_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'username', u.username,
        'avatar_url', u.avatar_url,
        'bio', u.bio,
        'follower_count', COALESCE(s.follower_count, 0),
        'following_count', COALESCE(s.following_count, 0)
      ) as requester
     FROM follow_requests fr
     JOIN users u ON u.id = fr.requester_user_id
     LEFT JOIN user_social_stats s ON s.user_id = u.id
     WHERE fr.recipient_user_id = $1 AND fr.status = 'pending'
     ORDER BY fr.requested_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    ...row,
    requester: row.requester,
  }));
}

/**
 * Get social stats
 */
export async function getSocialStats(userId: string): Promise<SocialStats> {
  const cacheKey = `social:stats:${userId}`;
  const cached = await getCache<SocialStats>(cacheKey);
  if (cached) return cached;

  const result = await queryOne<SocialStats>(
    `SELECT * FROM user_social_stats WHERE user_id = $1`,
    [userId]
  );

  const stats = result || {
    user_id: userId,
    follower_count: 0,
    following_count: 0,
    post_count: 0,
    engagement_score: 0,
  };

  await setCache(cacheKey, stats, 300);
  return stats;
}

/**
 * Check if user A follows user B
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const result = await queryOne(
    'SELECT 1 FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
    [followerId, followingId]
  );
  return !!result;
}

/**
 * Check friendship status between two users
 */
export async function getFriendshipStatus(userId1: string, userId2: string): Promise<'following' | 'follows_you' | 'mutual' | 'none'> {
  const [isFollowing1, isFollowing2] = await Promise.all([
    isFollowing(userId1, userId2),
    isFollowing(userId2, userId1),
  ]);

  if (isFollowing1 && isFollowing2) return 'mutual';
  if (isFollowing1) return 'following';
  if (isFollowing2) return 'follows_you';
  return 'none';
}

/**
 * Search users
 */
export async function searchUsers(
  query_str: string,
  currentUserId: string,
  limit = 20
): Promise<UserWithFriendship[]> {
  const result = await query<UserWithFriendship>(
    `SELECT 
      u.id, u.full_name, u.username, u.avatar_url, u.bio,
      COALESCE(s.follower_count, 0) as follower_count,
      COALESCE(s.following_count, 0) as following_count,
      CASE 
        WHEN f1.follower_user_id IS NOT NULL THEN 'following'
        WHEN f2.follower_user_id IS NOT NULL THEN 'follows_you'
        ELSE NULL
      END as friendship_status
     FROM users u
     LEFT JOIN user_social_stats s ON s.user_id = u.id
     LEFT JOIN user_follows f1 ON f1.follower_user_id = $2 AND f1.following_user_id = u.id
     LEFT JOIN user_follows f2 ON f2.follower_user_id = u.id AND f2.following_user_id = $2
     WHERE u.id != $2
       AND (u.username ILIKE $1 OR u.full_name ILIKE $1)
       AND u.privacy_settings->>'profile_public' != 'false'
     ORDER BY s.follower_count DESC NULLS LAST
     LIMIT $3`,
    [`%${query_str}%`, currentUserId, limit]
  );

  return result.rows;
}

/**
 * Get suggested users to follow
 */
export async function getSuggestedUsers(userId: string, limit = 10): Promise<UserWithFriendship[]> {
  // Get users that friends follow (friend-of-friend)
  const result = await query<UserWithFriendship>(
    `WITH user_following AS (
      SELECT following_user_id FROM user_follows WHERE follower_user_id = $1
    ),
    friend_suggestions AS (
      SELECT 
        f.following_user_id as suggested_id,
        COUNT(*) as mutual_count
      FROM user_follows f
      JOIN user_following uf ON uf.following_user_id = f.follower_user_id
      WHERE f.following_user_id != $1
        AND f.following_user_id NOT IN (SELECT following_user_id FROM user_following)
      GROUP BY f.following_user_id
      ORDER BY mutual_count DESC
      LIMIT $2
    )
    SELECT 
      u.id, u.full_name, u.username, u.avatar_url, u.bio,
      COALESCE(s.follower_count, 0) as follower_count,
      COALESCE(s.following_count, 0) as following_count,
      NULL as friendship_status
     FROM friend_suggestions fs
     JOIN users u ON u.id = fs.suggested_id
     LEFT JOIN user_social_stats s ON s.user_id = u.id
     ORDER BY fs.mutual_count DESC`,
    [userId, limit]
  );

  return result.rows;
}
