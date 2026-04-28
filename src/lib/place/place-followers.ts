/**
 * Place Following System
 * Manage user follows for places
 */

import { query, queryOne, queryMany } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';
import { logger } from '../logger';
import { resolveContentImage } from '../content-images';

/**
 * Follow a place
 */
export async function followPlace(userId: string, placeId: string): Promise<boolean> {
  try {
    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO place_followers (user_id, place_id) VALUES ($1, $2)
       ON CONFLICT (user_id, place_id) DO NOTHING
       RETURNING id`,
      [userId, placeId]
    );
    if (!inserted) return false;

    await query('UPDATE places SET follower_count = follower_count + 1 WHERE id = $1', [placeId]);

    await deleteCache(`place:followers:${placeId}`);
    await deleteCache(`user:following:places:${userId}`);

    logger.info('Place followed', { userId, placeId });
    return true;
  } catch (error) {
    logger.error('Failed to follow place', error instanceof Error ? error : new Error(String(error)) as any);
    return false;
  }
}

/**
 * Unfollow a place
 */
export async function unfollowPlace(userId: string, placeId: string): Promise<boolean> {
  try {
    // Delete follow record
    await query(
      `DELETE FROM place_followers WHERE user_id = $1 AND place_id = $2`,
      [userId, placeId]
    );

    await query('UPDATE places SET follower_count = GREATEST(0, follower_count - 1) WHERE id = $1', [placeId]);

    await deleteCache(`place:followers:${placeId}`);
    await deleteCache(`user:following:places:${userId}`);

    logger.info('Place unfollowed', { userId, placeId });
    return true;
  } catch (error) {
    logger.error('Failed to unfollow place', error instanceof Error ? error : new Error(String(error)) as any);
    return false;
  }
}

/**
 * Check if user is following a place
 */
export async function isFollowingPlace(userId: string, placeId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      `SELECT id FROM place_followers WHERE user_id = $1 AND place_id = $2`,
      [userId, placeId]
    );
    return Boolean(result);
  } catch (error) {
    logger.error('Failed to check place follow status', error instanceof Error ? error : new Error(String(error)) as any);
    return false;
  }
}

/**
 * Get places followed by a user
 */
export async function getUserFollowedPlaces(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = `user:following:places:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached as string);
    }

    const results = await queryMany(
      `SELECT p.id, p.slug, p.name, p.category, p.rating, COALESCE(p.thumbnail_url, p.images[1]) as image_url, p.thumbnail_url, pf.followed_at
       FROM place_followers pf
       JOIN places p ON pf.place_id = p.id
       WHERE pf.user_id = $1
       ORDER BY pf.followed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const places = results.map((r: any) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      rating: r.rating,
      image: resolveContentImage({
        category: 'places',
        slug: r.slug,
        explicit: r.image_url || r.thumbnail_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
      thumbnail: resolveContentImage({
        category: 'places',
        slug: r.slug,
        explicit: r.thumbnail_url || r.image_url,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
      followedAt: r.followed_at
    }));

    // Cache for 30 minutes
    await setCache(cacheKey, JSON.stringify(places), 1800);

    return places;
  } catch (error) {
    logger.error('Failed to get user followed places', error instanceof Error ? error : new Error(String(error)) as any);
    return [];
  }
}

/**
 * Get followers of a place
 */
export async function getPlaceFollowers(placeId: string, limit: number = 20): Promise<any[]> {
  try {
    const cacheKey = `place:followers:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached as string);
    }

    const results = await queryMany(
      `SELECT u.id, u.full_name, u.username, u.avatar_url, pf.followed_at
       FROM place_followers pf
       JOIN users u ON pf.user_id = u.id
       WHERE pf.place_id = $1
       ORDER BY pf.followed_at DESC
       LIMIT $2`,
      [placeId, limit]
    );

    const followers = results.map((r: any) => ({
      id: r.id,
      name: r.full_name,
      username: r.username,
      avatar: r.avatar_url,
      followedAt: r.followed_at
    }));

    // Cache for 30 minutes
    await setCache(cacheKey, JSON.stringify(followers), 1800);

    return followers;
  } catch (error) {
    logger.error('Failed to get place followers', error instanceof Error ? error : new Error(String(error)) as any);
    return [];
  }
}

/**
 * Get follower count for a place
 */
export async function getPlaceFollowerCount(placeId: string): Promise<number> {
  try {
    const result = await queryOne(
      `SELECT follower_count FROM places WHERE id = $1`,
      [placeId]
    );
    return result?.follower_count || 0;
  } catch (error) {
    logger.error('Failed to get place follower count', error instanceof Error ? error : new Error(String(error)) as any);
    return 0;
  }
}

/**
 * Get places with most followers (trending by follows)
 */
export async function getTrendingPlacesByFollowers(limit: number = 20): Promise<any[]> {
  try {
    const cacheKey = 'places:trending:followers';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached as string);
    }

    const results = await queryMany(
      `SELECT id, slug, name, category, rating, thumbnail_url, COALESCE(thumbnail_url, images[1]) as image_url, follower_count
       FROM places
       WHERE status = 'active'
       ORDER BY follower_count DESC
       LIMIT $1`,
      [limit]
    );

    const places = results.map((r: any) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      rating: r.rating,
      image: resolveContentImage({
        category: 'places',
        slug: r.slug,
        explicit: r.image_url || r.thumbnail_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
      thumbnail: resolveContentImage({
        category: 'places',
        slug: r.slug,
        explicit: r.thumbnail_url || r.image_url,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
      followers: r.follower_count
    }));

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(places), 3600);

    return places;
  } catch (error) {
    logger.error('Failed to get trending places', error instanceof Error ? error : new Error(String(error)) as any);
    return [];
  }
}
