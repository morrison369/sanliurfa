/**
 * Social Features Library
 * Hashtags, follows, activity feed, mentions, shares
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import { batchInsert, fireAndForget } from './performance-optimizations';
import crypto from 'crypto';

// ===== HASHTAG FUNCTIONS =====

export async function getOrCreateHashtag(tagName: string): Promise<any | null> {
  try {
    const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    let hashtag = await queryOne(
      'SELECT * FROM hashtags WHERE tag_slug = $1',
      [tagSlug]
    );

    if (!hashtag) {
      hashtag = await insert('hashtags', {
        tag_name: tagName,
        tag_slug: tagSlug,
        usage_count: 0
      });
    }

    return hashtag;
  } catch (error) {
    logger.error('Failed to get or create hashtag', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getTrendingHashtags(limit: number = 20, period: string = 'day'): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:trending:hashtags:${period}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const hashtags = await queryMany(
      'SELECT * FROM hashtags WHERE is_trending = true ORDER BY trending_rank ASC LIMIT $1',
      [limit]
    );

    await setCache(cacheKey, JSON.stringify(hashtags), 1800);
    return hashtags;
  } catch (error) {
    logger.error('Failed to get trending hashtags', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordHashtagUsage(hashtagId: string, userId: string, contentType: string, contentId: string): Promise<boolean> {
  try {
    await insert('hashtag_usage', {
      hashtag_id: hashtagId,
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      used_at: new Date()
    });

    // Update usage count
    const count = await queryOne(
      'SELECT COUNT(*) as count FROM hashtag_usage WHERE hashtag_id = $1',
      [hashtagId]
    );

    await update('hashtags', { id: hashtagId }, {
      usage_count: parseInt(count?.count || '0'),
      last_used_at: new Date()
    });

    await deleteCache(`sanliurfa:hashtag:${hashtagId}`);
    return true;
  } catch (error) {
    logger.error('Failed to record hashtag usage', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// ===== FOLLOW FUNCTIONS =====

export async function followUser(followerUserId: string, followingUserId: string): Promise<any | null> {
  try {
    const result = await insert('user_follows', {
      follower_user_id: followerUserId,
      following_user_id: followingUserId,
      is_approved: true,
      followed_at: new Date()
    });

    // Update social stats (optimized: fire-and-forget to avoid blocking)
    Promise.all([
      updateFollowStats(followingUserId),
      updateFollowStats(followerUserId)
    ]).catch(err => {
      logger.error('Failed to update follow stats', err instanceof Error ? err : new Error(String(err)));
    });

    await deleteCache(`sanliurfa:follows:${followerUserId}`);
    logger.info('User followed', { follower: followerUserId, following: followingUserId });
    return result;
  } catch (error) {
    logger.error('Failed to follow user', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function unfollowUser(followerUserId: string, followingUserId: string): Promise<boolean> {
  try {
    await queryOne(
      'DELETE FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
      [followerUserId, followingUserId]
    );

    await updateFollowStats(followingUserId);
    await updateFollowStats(followerUserId);

    await deleteCache(`sanliurfa:follows:${followerUserId}`);
    return true;
  } catch (error) {
    logger.error('Failed to unfollow user', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getFollowers(userId: string, limit: number = 50): Promise<any[]> {
  try {
    return await queryMany(
      `SELECT u.* FROM users u
       INNER JOIN user_follows uf ON u.id = uf.follower_user_id
       WHERE uf.following_user_id = $1
       ORDER BY uf.followed_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get followers', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getFollowing(userId: string, limit: number = 50): Promise<any[]> {
  try {
    return await queryMany(
      `SELECT u.* FROM users u
       INNER JOIN user_follows uf ON u.id = uf.following_user_id
       WHERE uf.follower_user_id = $1
       ORDER BY uf.followed_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get following', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function isFollowing(followerUserId: string, followingUserId: string): Promise<boolean> {
  try {
    const follow = await queryOne(
      'SELECT * FROM user_follows WHERE follower_user_id = $1 AND following_user_id = $2',
      [followerUserId, followingUserId]
    );

    return !!follow;
  } catch (error) {
    logger.error('Failed to check follow status', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function updateFollowStats(userId: string): Promise<void> {
  try {
    // Optimized: UPSERT query (INSERT...ON CONFLICT UPDATE) replaces SELECT+UPDATE/INSERT pattern
    // Single query instead of 4 queries (2 COUNTs + 1 SELECT + 1 UPDATE/INSERT)
    await queryOne(
      `INSERT INTO user_social_stats (user_id, follower_count, following_count)
       SELECT $1,
              (SELECT COUNT(*) FROM user_follows WHERE following_user_id = $1),
              (SELECT COUNT(*) FROM user_follows WHERE follower_user_id = $1)
       ON CONFLICT (user_id) DO UPDATE SET
         follower_count = EXCLUDED.follower_count,
         following_count = EXCLUDED.following_count`,
      [userId]
    );

    await deleteCache(`sanliurfa:stats:${userId}`);
  } catch (error) {
    logger.error('Failed to update follow stats', error instanceof Error ? error : new Error(String(error)));
  }
}

// ===== ACTIVITY FEED FUNCTIONS =====

export async function createActivity(userId: string, activityType: string, objectType: string, objectId: string, title: string, visibility: string = 'public'): Promise<any | null> {
  try {
    const result = await insert('user_activities', {
      user_id: userId,
      activity_type: activityType,
      object_type: objectType,
      object_id: objectId,
      object_title: title,
      visibility: visibility,
      created_at: new Date()
    });

    // Add to followers' feeds (optimized: batch insert instead of N+1)
    const followers = await getFollowers(userId);
    if (followers.length > 0) {
      const feedRecords = followers.map(follower => ({
        user_id: follower.id,
        activity_id: result.id,
        from_user_id: userId,
        feed_type: 'follow',
        seen: false
      }));
      await batchInsert('activity_feeds', feedRecords);
    }

    await deleteCache(`sanliurfa:feed:${userId}`);
    return result;
  } catch (error) {
    logger.error('Failed to create activity', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getUserFeed(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:feed:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const feed = await queryMany(
      `SELECT af.*, ua.activity_type, ua.object_type, ua.object_id, ua.object_title, u.full_name, u.avatar_url
       FROM activity_feeds af
       JOIN user_activities ua ON af.activity_id = ua.id
       JOIN users u ON af.from_user_id = u.id
       WHERE af.user_id = $1
       ORDER BY af.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    await setCache(cacheKey, JSON.stringify(feed), 600);
    return feed;
  } catch (error) {
    logger.error('Failed to get user feed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getTrendingPlaces(limit: number = 20, period: string = 'day'): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:trending:places:${period}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const places = await queryMany(
      `SELECT p.*, tp.trending_score, tp.view_count, tp.review_count
       FROM places p
       LEFT JOIN trending_places tp ON p.id = tp.place_id
       WHERE tp.period_type = $1
       ORDER BY tp.trending_score DESC
       LIMIT $2`,
      [period, limit]
    );

    await setCache(cacheKey, JSON.stringify(places), 1800);
    return places;
  } catch (error) {
    logger.error('Failed to get trending places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ===== MENTION FUNCTIONS =====

export async function mentionUser(mentionedUserId: string, byUserId: string, contentType: string, contentId: string, contextText: string): Promise<any | null> {
  try {
    const result = await insert('user_mentions', {
      mentioned_user_id: mentionedUserId,
      mentioned_by_user_id: byUserId,
      content_type: contentType,
      content_id: contentId,
      context_text: contextText,
      is_read: false
    });

    logger.info('User mentioned', { mentioned: mentionedUserId, by: byUserId });
    return result;
  } catch (error) {
    logger.error('Failed to mention user', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getUserMentions(userId: string, limit: number = 50): Promise<any[]> {
  try {
    return await queryMany(
      `SELECT * FROM user_mentions WHERE mentioned_user_id = $1 ORDER BY is_read ASC, created_at DESC LIMIT $2`,
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get user mentions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ===== SHARE FUNCTIONS =====

export async function shareContent(userId: string, contentType: string, contentId: string, shareMessage: string, platform: string = 'internal'): Promise<any | null> {
  try {
    const result = await insert('content_shares', {
      shared_by_user_id: userId,
      content_type: contentType,
      content_id: contentId,
      share_message: shareMessage,
      share_platform: platform,
      share_type: 'share',
      shared_at: new Date()
    });

    // Update share analytics
    const shareCount = await queryOne(
      'SELECT COUNT(*) as count FROM content_shares WHERE content_type = $1 AND content_id = $2',
      [contentType, contentId]
    );

    const existing = await queryOne(
      'SELECT * FROM share_analytics WHERE content_type = $1 AND content_id = $2',
      [contentType, contentId]
    );

    if (existing) {
      await update('share_analytics', { content_id: contentId }, {
        share_count: parseInt(shareCount?.count || '0'),
        last_shared_at: new Date()
      });
    } else {
      await insert('share_analytics', {
        content_type: contentType,
        content_id: contentId,
        share_count: 1,
        last_shared_at: new Date()
      });
    }

    logger.info('Content shared', { userId, contentType, contentId });
    return result;
  } catch (error) {
    logger.error('Failed to share content', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getShareStats(contentType: string, contentId: string): Promise<any | null> {
  try {
    return await queryOne(
      'SELECT * FROM share_analytics WHERE content_type = $1 AND content_id = $2',
      [contentType, contentId]
    );
  } catch (error) {
    logger.error('Failed to get share stats', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
