/**
 * Points & Rewards System
 * Manage user points and reward achievements
 */

import { queryOne, queryRows, insert, query } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface PointsTransaction {
  id: string;
  userId: string;
  pointsEarned: number;
  action: string;
  actionId?: string;
  description?: string;
  createdAt: string;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  lastUpdated: string;
}

export interface RewardLevel {
  id: string;
  name: string;
  pointsRequired: number;
  badgeEmoji?: string;
  description?: string;
  benefits?: string;
}

// Point values for different actions
const POINT_VALUES = {
  review: 10,
  review_helpful: 5,
  comment: 5,
  favorite: 2,
  follow: 3,
  place_visit: 1
};

/**
 * Award points to a user for an action
 */
export async function awardPoints(
  userId: string,
  action: string,
  points?: number,
  actionId?: string,
  description?: string
): Promise<PointsTransaction | null> {
  try {
    const pointsToAward = points || POINT_VALUES[action as keyof typeof POINT_VALUES] || 0;

    if (pointsToAward === 0) {
      logger.warn('No points defined for action', { action });
      return null;
    }

    // Insert transaction
    const transaction = await insert('user_points_transactions', {
      user_id: userId,
      points_earned: pointsToAward,
      action,
      action_id: actionId,
      description
    });

    // Update user total points
    await updateUserPointsTotal(userId);

    // Invalidate cache
    await deleteCache(`sanliurfa:user:points:${userId}`);

    logger.info('Points awarded', { userId, action, points: pointsToAward });

    return {
      id: transaction.id,
      userId,
      pointsEarned: pointsToAward,
      action,
      actionId,
      description,
      createdAt: transaction.created_at
    };
  } catch (error) {
    logger.error('Failed to award points', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Update user's total points balance
 */
async function updateUserPointsTotal(userId: string): Promise<void> {
  try {
    // Calculate total points from transactions
    const result = await queryOne(
      `SELECT COALESCE(SUM(points_earned), 0) as total
       FROM user_points_transactions
       WHERE user_id = $1`,
      [userId]
    );

    const totalPoints = result?.total || 0;

    // Insert or update user points
    await query(
      `INSERT INTO user_points (user_id, total_points, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         total_points = $2,
         last_updated = NOW()`,
      [userId, totalPoints]
    );

    // Check if user achieved new reward level
    await checkAndAwardRewards(userId, totalPoints);
  } catch (error) {
    logger.error('Failed to update points total', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get user's current points
 */
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  try {
    const cacheKey = `sanliurfa:user:points:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryOne(
      `SELECT user_id, total_points, last_updated
       FROM user_points
       WHERE user_id = $1`,
      [userId]
    );

    if (!result) {
      return null;
    }

    const userPoints: UserPoints = {
      userId: result.user_id,
      totalPoints: result.total_points || 0,
      lastUpdated: result.last_updated
    };

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(userPoints), 3600);

    return userPoints;
  } catch (error) {
    logger.error('Failed to get user points', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's points history
 */
export async function getPointsHistory(userId: string, limit: number = 50): Promise<PointsTransaction[]> {
  try {
    const results = await queryRows(
      `SELECT id, user_id, points_earned, action, action_id, description, created_at
       FROM user_points_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      pointsEarned: r.points_earned,
      action: r.action,
      actionId: r.action_id,
      description: r.description,
      createdAt: r.created_at
    }));
  } catch (error) {
    logger.error('Failed to get points history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get all reward levels
 */
export async function getRewardLevels(): Promise<RewardLevel[]> {
  try {
    const cacheKey = 'sanliurfa:rewards:levels';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT id, name, points_required, badge_emoji, description, benefits
       FROM reward_levels
       ORDER BY points_required ASC`,
      []
    );

    const levels: RewardLevel[] = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      pointsRequired: r.points_required,
      badgeEmoji: r.badge_emoji,
      description: r.description,
      benefits: r.benefits
    }));

    // Cache for 24 hours
    await setCache(cacheKey, JSON.stringify(levels), 86400);

    return levels;
  } catch (error) {
    logger.error('Failed to get reward levels', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get user's achieved rewards
 */
export async function getUserRewards(userId: string): Promise<RewardLevel[]> {
  try {
    const cacheKey = `sanliurfa:user:rewards:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT rl.id, rl.name, rl.points_required, rl.badge_emoji, rl.description, rl.benefits
       FROM user_reward_achievements ura
       JOIN reward_levels rl ON ura.reward_level_id = rl.id
       WHERE ura.user_id = $1
       ORDER BY rl.points_required DESC`,
      [userId]
    );

    const rewards: RewardLevel[] = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      pointsRequired: r.points_required,
      badgeEmoji: r.badge_emoji,
      description: r.description,
      benefits: r.benefits
    }));

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(rewards), 3600);

    return rewards;
  } catch (error) {
    logger.error('Failed to get user rewards', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Check and award rewards based on points
 */
async function checkAndAwardRewards(userId: string, totalPoints: number): Promise<void> {
  try {
    // Get all reward levels
    const levels = await queryRows(
      `SELECT id, points_required FROM reward_levels ORDER BY points_required ASC`,
      []
    );

    // Check each level
    for (const level of levels) {
      if (totalPoints >= level.points_required) {
        // Check if already achieved
        const exists = await queryOne(
          `SELECT id FROM user_reward_achievements
           WHERE user_id = $1 AND reward_level_id = $2`,
          [userId, level.id]
        );

        if (!exists) {
          // Award new level
          await insert('user_reward_achievements', {
            user_id: userId,
            reward_level_id: level.id
          });

          logger.info('Reward level achieved', { userId, levelId: level.id });

          // Invalidate cache
          await deleteCache(`sanliurfa:user:rewards:${userId}`);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to check rewards', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get leaderboard by points
 */
export async function getPointsLeaderboard(limit: number = 20): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:leaderboard:points';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT u.id, u.full_name, u.username, u.avatar_url, up.total_points
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       ORDER BY up.total_points DESC
       LIMIT $1`,
      [limit]
    );

    const leaderboard = results.map((r: any) => ({
      userId: r.id,
      name: r.full_name,
      username: r.username,
      avatar: r.avatar_url,
      points: r.total_points
    }));

    // Cache for 30 minutes
    await setCache(cacheKey, JSON.stringify(leaderboard), 1800);

    return leaderboard;
  } catch (error) {
    logger.error('Failed to get points leaderboard', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
