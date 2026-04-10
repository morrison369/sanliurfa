/**
 * Achievements & Badges System
 * Track user achievements and unlock badges
 */

import { query, queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { awardPoints } from './loyalty-system';
import { createNotification } from './notifications-queue';
import { logger } from './logging';

export interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: string;
  points_reward: number;
  rarity: string;
  hidden: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  viewed: boolean;
}

/**
 * Get all achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const cacheKey = 'sanliurfa:achievements:all';

  try {
    const cached = await getCache<Achievement[]>(cacheKey);
    if (cached) return cached;

    const achievements = await queryRows<Achievement>('SELECT * FROM achievements ORDER BY category, rarity DESC');
    await setCache(cacheKey, achievements, 3600);
    return achievements;
  } catch (error) {
    logger.error('Failed to get achievements', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get achievement by key
 */
export async function getAchievementByKey(achievementKey: string): Promise<Achievement | null> {
  try {
    const achievement = await queryOne(
      'SELECT * FROM achievements WHERE achievement_key = $1',
      [achievementKey]
    );
    return achievement;
  } catch (error) {
    logger.error('Failed to get achievement', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check and unlock achievement for user
 */
export async function unlockAchievementIfEarned(
  userId: string,
  achievementKey: string
): Promise<{ unlocked: boolean; achievement?: Achievement }> {
  try {
    const achievement = await getAchievementByKey(achievementKey);
    if (!achievement) {
      return { unlocked: false };
    }

    // Check if already unlocked
    const existing = await queryOne(
      'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievement.id]
    );

    if (existing) {
      return { unlocked: false, achievement };
    }

    // Unlock achievement
    const userAchievement = await insert('user_achievements', {
      user_id: userId,
      achievement_id: achievement.id,
      unlocked_at: new Date()
    });

    // Award points
    if (achievement.points_reward > 0) {
      await awardPoints(userId, achievement.points_reward, `Achievement unlocked: ${achievement.name}`);
    }

    // Clear cache
    await deleteCache(`sanliurfa:achievements:user:${userId}`);

    // Send notification
    await createNotification(
      userId,
      `🏆 ${achievement.name}`,
      achievement.description || 'Achievement unlocked!',
      'success'
    );

    logger.info('Achievement unlocked', { userId, achievementKey, points: achievement.points_reward });

    return { unlocked: true, achievement };
  } catch (error) {
    logger.error('Failed to unlock achievement', error instanceof Error ? error : new Error(String(error)));
    return { unlocked: false };
  }
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<(UserAchievement & Achievement)[]> {
  const cacheKey = `sanliurfa:achievements:user:${userId}`;

  try {
    const cached = await getCache<(UserAchievement & Achievement)[]>(cacheKey);
    if (cached) return cached;

    const achievements = await queryRows<UserAchievement & Achievement>(
      `SELECT ua.*, a.achievement_key, a.name, a.description, a.icon_url, a.category, a.points_reward, a.rarity
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    // Extended TTL: 1800s (30 min) instead of 600s - achievements change infrequently
    await setCache(cacheKey, achievements, 1800);
    return achievements;
  } catch (error) {
    logger.error('Failed to get user achievements', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get user's unviewed achievements
 */
export async function getUnviewedAchievements(userId: string): Promise<(UserAchievement & Achievement)[]> {
  try {
    const achievements = await queryRows<UserAchievement & Achievement>(
      `SELECT ua.*, a.achievement_key, a.name, a.description, a.icon_url, a.category, a.points_reward, a.rarity
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND ua.viewed = false
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );
    return achievements;
  } catch (error) {
    logger.error('Failed to get unviewed achievements', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Mark achievement as viewed
 */
export async function markAchievementViewed(userAchievementId: string, userId: string): Promise<void> {
  try {
    await query(
      'UPDATE user_achievements SET viewed = true WHERE id = $1 AND user_id = $2',
      [userAchievementId, userId]
    );

    // Clear cache
    await deleteCache(`sanliurfa:achievements:user:${userId}`);
  } catch (error) {
    logger.error('Failed to mark achievement viewed', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get achievement statistics
 */
export async function getAchievementStats(userId: string): Promise<{
  total_unlocked: number;
  total_available: number;
  unlock_percentage: number;
  by_category: Record<string, { unlocked: number; total: number }>;
}> {
  try {
    const userAchievements = await queryOne(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1',
      [userId]
    );

    const totalAchievements = await queryOne(
      'SELECT COUNT(*) as count FROM achievements WHERE hidden = false'
    );

    const byCategory = await queryRows<any>(`
      SELECT
        a.category,
        COUNT(ua.id) as unlocked_count,
        COUNT(DISTINCT a.id) as total_count
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.hidden = false
      GROUP BY a.category
    `, [userId]);

    const total = parseInt(totalAchievements?.count || '0');
    const unlocked = parseInt(userAchievements?.count || '0');

    return {
      total_unlocked: unlocked,
      total_available: total,
      unlock_percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      by_category: byCategory.reduce((acc: any, row: any) => {
        acc[row.category] = {
          unlocked: parseInt(row.unlocked_count || '0'),
          total: parseInt(row.total_count || '0')
        };
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('Failed to get achievement stats', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Predefined achievement checks
 */
export const ACHIEVEMENT_CHECKS = {
  FIRST_REVIEW: 'first_review',
  FIVE_REVIEWS: 'five_reviews',
  TEN_REVIEWS: 'ten_reviews',
  FIFTY_REVIEWS: 'fifty_reviews',
  FIRST_FAVORITE: 'first_favorite',
  HUNDRED_FAVORITES: 'hundred_favorites',
  FIRST_COMMENT: 'first_comment',
  HELPFUL_COMMENTS: 'helpful_comments',
  VERIFIED_REVIEWER: 'verified_reviewer',
  PLACE_OWNER: 'place_owner',
  ACTIVE_FOLLOWER: 'active_follower',
  TRENDING_CREATOR: 'trending_creator',
  LOYAL_VISITOR: 'loyal_visitor',
  EARLY_ADOPTER: 'early_adopter',
  SOCIAL_BUTTERFLY: 'social_butterfly'
};

/**
 * Check common achievements
 * Optimized: Single query to get all counts instead of separate queries (N+1 fix)
 */
export async function checkCommonAchievements(userId: string): Promise<void> {
  try {
    // Get all user stats in single query (N+1 optimization)
    const stats = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as review_count,
        (SELECT COUNT(*) FROM user_favorites WHERE user_id = $1) as favorite_count`,
      [userId]
    );

    const reviewCount = parseInt(stats?.review_count || '0');
    const favoriteCount = parseInt(stats?.favorite_count || '0');

    // Check review milestones
    if (reviewCount === 1) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.FIRST_REVIEW);
    } else if (reviewCount === 5) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.FIVE_REVIEWS);
    } else if (reviewCount === 10) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.TEN_REVIEWS);
    } else if (reviewCount === 50) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.FIFTY_REVIEWS);
    }

    // Check favorite milestones
    if (favoriteCount === 1) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.FIRST_FAVORITE);
    } else if (favoriteCount >= 100) {
      await unlockAchievementIfEarned(userId, ACHIEVEMENT_CHECKS.HUNDRED_FAVORITES);
    }
  } catch (error) {
    logger.error('Failed to check common achievements', error instanceof Error ? error : new Error(String(error)));
  }
}
