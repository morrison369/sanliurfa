/**
 * User Statistics
 * Aggregate user activity and engagement metrics
 */

import { queryOne, queryMany } from './postgres';
import { getCache, setCache } from './cache';
import { logger } from './logging';

export interface UserStats {
  userId: string;
  reviewsWritten: number;
  favoriteCount: number;
  followersCount: number;
  followingCount: number;
  points: number;
  level: number;
  averageRating?: number;
  totalLikes?: number;
  collectionsCreated: number;
  badgesEarned: number;
  contributionScore?: number;
  rankingPercentile?: number;
  joinDate: string;
  lastActiveAt?: string;
}

export interface RatingsTrend {
  date: string;
  count: number;
  averageRating: number;
}

export interface ActivityStats {
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  allTime: number;
}

/**
 * Get comprehensive user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const cacheKey = `stats:${userId}`;

  try {
    // Try cache first
    const cached = await getCache<UserStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user data
    const user = await queryOne(
      `SELECT
        id,
        points,
        level,
        created_at,
        last_login_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return null;
    }

    // Get reviews count
    const reviews = await queryOne(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = $1',
      [userId]
    );

    // Get favorites count
    const favorites = await queryOne(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
      [userId]
    );

    // Get followers count
    const followers = await queryOne(
      'SELECT COUNT(*) as count FROM followers WHERE following_id = $1',
      [userId]
    );

    // Get following count
    const following = await queryOne(
      'SELECT COUNT(*) as count FROM followers WHERE follower_id = $1',
      [userId]
    );

    // Get collections created
    const collections = await queryOne(
      'SELECT COUNT(*) as count FROM place_collections WHERE user_id = $1',
      [userId]
    );

    // Get average rating given (if available)
    const avgRating = await queryOne(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE user_id = $1',
      [userId]
    );

    const baseStats: UserStats = {
      userId: user.id,
      reviewsWritten: parseInt(reviews?.count || '0'),
      favoriteCount: parseInt(favorites?.count || '0'),
      followersCount: parseInt(followers?.count || '0'),
      followingCount: parseInt(following?.count || '0'),
      points: user.points || 0,
      level: user.level || 1,
      averageRating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating) : undefined,
      collectionsCreated: parseInt(collections?.count || '0'),
      badgesEarned: 0, // Would need badges table
      joinDate: user.created_at,
      lastActiveAt: user.last_login_at
    };

    const contributionScore = calculateContributionScore(baseStats);
    const stats: UserStats = {
      ...baseStats,
      contributionScore,
      rankingPercentile: await getUserRankingPercentile(userId, contributionScore),
    };

    // Cache for 5 minutes
    await setCache(cacheKey, stats, 300);

    return stats;
  } catch (error) {
    logger.error('Failed to get user stats', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get activity trends for current month vs last month
 */
export async function getActivityTrends(userId: string): Promise<ActivityStats | null> {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get reviews for each period
    const thisMonth = await queryOne(
      `SELECT COUNT(*) as count FROM reviews
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, currentMonthStart]
    );

    const lastMonth = await queryOne(
      `SELECT COUNT(*) as count FROM reviews
       WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [userId, lastMonthStart, lastMonthEnd]
    );

    const thisYear = await queryOne(
      `SELECT COUNT(*) as count FROM reviews
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, yearStart]
    );

    const allTime = await queryOne(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = $1',
      [userId]
    );

    return {
      thisMonth: parseInt(thisMonth?.count || '0'),
      lastMonth: parseInt(lastMonth?.count || '0'),
      thisYear: parseInt(thisYear?.count || '0'),
      allTime: parseInt(allTime?.count || '0')
    };
  } catch (error) {
    logger.error('Failed to get activity trends', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get top rated places by user
 */
export async function getUserTopRatedPlaces(userId: string, limit: number = 5) {
  try {
    const results = await queryMany(
      `SELECT
        p.id,
        p.name,
        p.image,
        r.rating,
        r.created_at
       FROM reviews r
       JOIN places p ON r.place_id = p.id
       WHERE r.user_id = $1
       ORDER BY r.rating DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.rows;
  } catch (error) {
    logger.error('Failed to get top rated places', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get user's contribution score (gamification)
 */
export async function getUserContributionScore(userId: string): Promise<number> {
  try {
    const stats = await getUserStats(userId);
    if (!stats) return 0;

    return calculateContributionScore(stats);
  } catch (error) {
    logger.error(
      'Failed to get contribution score',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    return 0;
  }
}

/**
 * Get ranking percentile for user
 */
export async function getUserRankingPercentile(userId: string, knownScore?: number): Promise<number> {
  try {
    const userScore = knownScore ?? await getUserContributionScore(userId);

    const result = await queryOne(
      `WITH user_scores AS (
        SELECT
          u.id,
          (
            COALESCE(review_counts.count, 0) * 10 +
            COALESCE(follower_counts.count, 0) * 5 +
            COALESCE(collection_counts.count, 0) * 20 +
            COALESCE(favorite_counts.count, 0) * 2 +
            FLOOR(COALESCE(u.points, 0) / 10) +
            COALESCE(u.level, 1) * 50
          ) AS contribution_score
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*)::int AS count FROM reviews GROUP BY user_id
        ) review_counts ON review_counts.user_id = u.id
        LEFT JOIN (
          SELECT following_id AS user_id, COUNT(*)::int AS count FROM followers GROUP BY following_id
        ) follower_counts ON follower_counts.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*)::int AS count FROM place_collections GROUP BY user_id
        ) collection_counts ON collection_counts.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*)::int AS count FROM favorites GROUP BY user_id
        ) favorite_counts ON favorite_counts.user_id = u.id
      )
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE contribution_score < $1)::int AS users_below
      FROM user_scores`,
      [userScore]
    );

    const totalUsers = Number(result?.total_users || 0);
    const usersBelow = Number(result?.users_below || 0);
    const percentile = totalUsers > 0 ? Math.max(1, Math.round(((totalUsers - usersBelow) / totalUsers) * 100)) : 0;

    return percentile;
  } catch (error) {
    logger.error('Failed to get user ranking', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return 0;
  }
}

function calculateContributionScore(stats: Pick<UserStats, 'reviewsWritten' | 'followersCount' | 'collectionsCreated' | 'favoriteCount' | 'points' | 'level'>): number {
  return (
    stats.reviewsWritten * 10 +
    stats.followersCount * 5 +
    stats.collectionsCreated * 20 +
    stats.favoriteCount * 2 +
    Math.floor(stats.points / 10) +
    stats.level * 50
  );
}

/**
 * Get user's badges/achievements
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const badges: Badge[] = [];

  try {
    const stats = await getUserStats(userId);
    if (!stats) return badges;

    // Assign badges based on achievements
    if (stats.reviewsWritten >= 1) {
      badges.push({
        id: 'first_review',
        name: 'İlk Yorum',
        description: 'İlk yorumunu yaptın',
        icon: '✍️',
        earnedAt: stats.joinDate
      });
    }

    if (stats.reviewsWritten >= 10) {
      badges.push({
        id: 'review_streak_10',
        name: 'Yorum Ustası',
        description: '10 yorum yaptın',
        icon: '📝',
        earnedAt: new Date().toISOString()
      });
    }

    if (stats.reviewsWritten >= 50) {
      badges.push({
        id: 'review_master',
        name: 'Yorum Kütüphanecisi',
        description: '50 yorum yaptın',
        icon: '📚',
        earnedAt: new Date().toISOString()
      });
    }

    if (stats.followersCount >= 10) {
      badges.push({
        id: 'popular',
        name: 'Popüler Kullanıcı',
        description: '10 takipçin var',
        icon: '⭐',
        earnedAt: new Date().toISOString()
      });
    }

    if (stats.collectionsCreated >= 1) {
      badges.push({
        id: 'curator',
        name: 'Kuratör',
        description: 'İlk koleksiyonunu oluşturdun',
        icon: '🎨',
        earnedAt: new Date().toISOString()
      });
    }

    if (stats.level >= 5) {
      badges.push({
        id: 'level_5',
        name: 'Level 5 Uzmanı',
        description: 'Level 5e ulaştın',
        icon: '⬆️',
        earnedAt: new Date().toISOString()
      });
    }

    return badges;
  } catch (error) {
    logger.error('Failed to get user badges', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return badges;
  }
}
