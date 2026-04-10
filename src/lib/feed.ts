/**
 * Personalized Feed System
 * Following-based, trending, and popular feeds
 */

import { queryRows } from './postgres';
import { getCache, setCache } from './cache';
import { logger } from './logging';

export interface FeedItem {
  id: string;
  type: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  place_id: string;
  place_name: string;
  content: string;
  rating?: number;
  helpful_count: number;
  created_at: string;
}

export async function getPersonalizedFeed(
  userId: string,
  feedType: string = 'following',
  limit: number = 50
): Promise<FeedItem[]> {
  const cacheKey = 'sanliurfa:feed:' + userId + ':' + feedType + ':' + limit;

  try {
    const cached = await getCache<FeedItem[]>(cacheKey);
    if (cached) return cached;

    let feed: FeedItem[] = [];

    if (feedType === 'following') {
      feed = await getFollowingFeed(userId, limit);
    } else if (feedType === 'trending') {
      feed = await getTrendingFeed(limit);
    } else if (feedType === 'popular') {
      feed = await getPopularFeed(limit);
    } else {
      feed = await getRecentFeed(limit);
    }

    await setCache(cacheKey, feed, 300);
    return feed;
  } catch (error) {
    logger.error('Failed to get personalized feed', error instanceof Error ? error : new Error(String(error)), { userId, feedType });
    return [];
  }
}

export async function getFollowingFeed(userId: string, limit: number = 50): Promise<FeedItem[]> {
  try {
    const results = await queryRows(
      `SELECT
        r.id,
        'review' as type,
        u.id as user_id,
        u.full_name as user_name,
        u.avatar as user_avatar,
        p.id as place_id,
        p.name as place_name,
        r.content,
        r.rating,
        COALESCE(r.helpful_count, 0) as helpful_count,
        r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN places p ON r.place_id = p.id
       WHERE u.id IN (SELECT following_id FROM followers WHERE follower_id = $1)
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      type: row.type,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      place_id: row.place_id,
      place_name: row.place_name,
      content: row.content,
      rating: row.rating,
      helpful_count: row.helpful_count,
      created_at: row.created_at
    }));
  } catch (error) {
    logger.error('Failed to get following feed', error instanceof Error ? error : new Error(String(error)), { userId });
    return [];
  }
}

export async function getTrendingFeed(limit: number = 50): Promise<FeedItem[]> {
  const cacheKey = 'sanliurfa:feed:trending:' + limit;

  try {
    const cached = await getCache<FeedItem[]>(cacheKey);
    if (cached) return cached;

    const results = await queryRows(
      `SELECT
        r.id,
        'review' as type,
        u.id as user_id,
        u.full_name as user_name,
        u.avatar as user_avatar,
        p.id as place_id,
        p.name as place_name,
        r.content,
        r.rating,
        COALESCE(r.helpful_count, 0) as helpful_count,
        r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN places p ON r.place_id = p.id
       WHERE r.created_at > NOW() - INTERVAL '7 days'
       ORDER BY (COALESCE(r.helpful_count, 0) + r.rating) DESC
       LIMIT $1`,
      [limit]
    );

    const feed = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      place_id: row.place_id,
      place_name: row.place_name,
      content: row.content,
      rating: row.rating,
      helpful_count: row.helpful_count,
      created_at: row.created_at
    }));

    await setCache(cacheKey, feed, 300);
    return feed;
  } catch (error) {
    logger.error('Failed to get trending feed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPopularFeed(limit: number = 50): Promise<FeedItem[]> {
  const cacheKey = 'sanliurfa:feed:popular:' + limit;

  try {
    const cached = await getCache<FeedItem[]>(cacheKey);
    if (cached) return cached;

    const results = await queryRows(
      `SELECT
        r.id,
        'review' as type,
        u.id as user_id,
        u.full_name as user_name,
        u.avatar as user_avatar,
        p.id as place_id,
        p.name as place_name,
        r.content,
        r.rating,
        COALESCE(r.helpful_count, 0) as helpful_count,
        r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN places p ON r.place_id = p.id
       ORDER BY COALESCE(r.helpful_count, 0) DESC
       LIMIT $1`,
      [limit]
    );

    const feed = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      place_id: row.place_id,
      place_name: row.place_name,
      content: row.content,
      rating: row.rating,
      helpful_count: row.helpful_count,
      created_at: row.created_at
    }));

    await setCache(cacheKey, feed, 300);
    return feed;
  } catch (error) {
    logger.error('Failed to get popular feed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getRecentFeed(limit: number = 50): Promise<FeedItem[]> {
  const cacheKey = 'sanliurfa:feed:recent:' + limit;

  try {
    const cached = await getCache<FeedItem[]>(cacheKey);
    if (cached) return cached;

    const results = await queryRows(
      `SELECT
        r.id,
        'review' as type,
        u.id as user_id,
        u.full_name as user_name,
        u.avatar as user_avatar,
        p.id as place_id,
        p.name as place_name,
        r.content,
        r.rating,
        COALESCE(r.helpful_count, 0) as helpful_count,
        r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN places p ON r.place_id = p.id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );

    const feed = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      place_id: row.place_id,
      place_name: row.place_name,
      content: row.content,
      rating: row.rating,
      helpful_count: row.helpful_count,
      created_at: row.created_at
    }));

    await setCache(cacheKey, feed, 300);
    return feed;
  } catch (error) {
    logger.error('Failed to get recent feed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
