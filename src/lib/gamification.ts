/**
 * Gamification System
 * Points, levels, badges, and leaderboard management
 */

import { query, queryOne, queryMany, update } from './postgres';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';
import { checkCommonAchievements } from './achievements';

// Constants
const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000];
const BADGE_CACHE_KEY = 'sanliurfa:badges:user:';
const LEADERBOARD_CACHE_KEY = 'sanliurfa:leaderboard:';

// ==================== POINTS SYSTEM ====================

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  referenceId?: string
): Promise<void> {
  try {
    // Record transaction
    await query(
      `INSERT INTO points_transactions (user_id, amount, type, description, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, amount, type, description || null, referenceId || null]
    );

    // Update user points
    await update('users', userId, {
      points: queryOne(
        `SELECT (COALESCE(points, 0) + $1) as new_points FROM users WHERE id = $2`,
        [amount, userId]
      )
    });

    // Clear leaderboard cache
    await deleteCachePattern(`${LEADERBOARD_CACHE_KEY}*`);

    logger.info('Points awarded', { userId, amount, type });
  } catch (error) {
    logger.error('Failed to award points', error instanceof Error ? error : new Error(String(error)), { userId, amount, type });
  }
}

/**
 * Get user's points history
 */
export async function getPointsHistory(userId: string, limit: number = 20): Promise<any[]> {
  try {
    return await queryMany(
      `SELECT id, amount, type, description, reference_id, created_at
       FROM points_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get points history', error instanceof Error ? error : new Error(String(error)), { userId });
    return [];
  }
}

// ==================== LEVEL SYSTEM ====================

/**
 * Calculate user level based on points
 * Each level requires 2x the points of previous level
 */
export function calculateUserLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get level progress (current level, next level threshold, percentage)
 */
export function getLevelProgress(points: number): {
  currentLevel: number;
  nextLevel: number;
  currentThreshold: number;
  nextThreshold: number;
  progressPercent: number;
} {
  const currentLevel = calculateUserLevel(points);
  const nextLevel = currentLevel + 1;
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[nextLevel - 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 50000;

  const pointsInLevel = points - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, (pointsInLevel / pointsNeeded) * 100);

  return {
    currentLevel,
    nextLevel,
    currentThreshold,
    nextThreshold,
    progressPercent
  };
}

/**
 * Update user level if points changed
 */
export async function updateUserLevelIfNeeded(userId: string): Promise<void> {
  try {
    const user = await queryOne('SELECT points, level FROM users WHERE id = $1', [userId]);
    if (!user) return;

    const newLevel = calculateUserLevel(user.points || 0);
    if (newLevel !== user.level) {
      await update('users', userId, { level: newLevel });
      logger.info('User level updated', { userId, oldLevel: user.level, newLevel });

      // Award achievement badge if reached new milestone levels
      if ([10, 20, 50].includes(newLevel)) {
        await awardPoints(userId, newLevel * 100, 'level_milestone', `Reached level ${newLevel}`);
      }
    }
  } catch (error) {
    logger.error('Failed to update user level', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

// ==================== BADGE SYSTEM ====================

/**
 * Get all badge definitions
 */
export async function getBadgeDefinitions(): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:badge-definitions';
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const badges = await queryMany('SELECT * FROM badge_definitions ORDER BY category, id');
    await setCache(cacheKey, badges, 3600); // Cache 1 hour
    return badges;
  } catch (error) {
    logger.error('Failed to get badge definitions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<any[]> {
  try {
    const cacheKey = `${BADGE_CACHE_KEY}${userId}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const badges = await queryMany(
      `SELECT ub.*, bd.name, bd.description, bd.icon, bd.category
       FROM user_badges ub
       JOIN badge_definitions bd ON ub.badge_type = bd.badge_type
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId]
    );

    await setCache(cacheKey, badges, 1800); // Cache 30 min
    return badges;
  } catch (error) {
    logger.error('Failed to get user badges', error instanceof Error ? error : new Error(String(error)), { userId });
    return [];
  }
}

/**
 * Grant badge to user if not already earned
 */
export async function grantBadgeToUser(userId: string, badgeType: string): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_type = $2',
      [userId, badgeType]
    );

    if (existing) {
      return false; // Already earned
    }

    // Get badge definition
    const badgeDef = await queryOne(
      'SELECT points_reward FROM badge_definitions WHERE badge_type = $1',
      [badgeType]
    );

    // Insert badge
    await query(
      `INSERT INTO user_badges (user_id, badge_type, earned_at)
       VALUES ($1, $2, NOW())`,
      [userId, badgeType]
    );

    // Award points
    if (badgeDef?.points_reward) {
      await awardPoints(userId, badgeDef.points_reward, 'badge', `Earned badge: ${badgeType}`);
    }

    // Clear cache
    await deleteCache(`${BADGE_CACHE_KEY}${userId}`);

    logger.info('Badge granted', { userId, badgeType });
    return true;
  } catch (error) {
    logger.error('Failed to grant badge', error instanceof Error ? error : new Error(String(error)), { userId, badgeType });
    return false;
  }
}

/**
 * Check and auto-grant badges based on user criteria
 */
export async function checkAndGrantBadges(userId: string): Promise<void> {
  try {
    const user = await queryOne(
      `SELECT u.id, u.points,
              COUNT(DISTINCT r.id) as review_count,
              COUNT(DISTINCT p.id) as photo_count,
              COUNT(DISTINCT rv.id) as helpful_votes
       FROM users u
       LEFT JOIN reviews r ON u.id = r.user_id
       LEFT JOIN place_photos p ON u.id = p.user_id
       LEFT JOIN review_votes rv ON u.id = rv.user_id AND rv.helpful = true
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (!user) return;

    const badges = await getBadgeDefinitions();

    for (const badge of badges) {
      const criteria = badge.criteria ? JSON.parse(typeof badge.criteria === 'string' ? badge.criteria : JSON.stringify(badge.criteria)) : null;
      if (!criteria) continue;

      let shouldGrant = false;

      switch (criteria.type) {
        case 'review_count':
          shouldGrant = user.review_count >= criteria.threshold;
          break;
        case 'photo_count':
          shouldGrant = user.photo_count >= criteria.threshold;
          break;
        case 'helpful_votes':
          shouldGrant = user.helpful_votes >= criteria.threshold;
          break;
        case 'user_rank':
          // For user rank, would need total user count query
          shouldGrant = false;
          break;
      }

      if (shouldGrant) {
        await grantBadgeToUser(userId, badge.badge_type);
      }
    }
  } catch (error) {
    logger.error('Failed to check and grant badges', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

// ==================== LEADERBOARD ====================

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  limit: number = 100,
  period: 'weekly' | 'monthly' | 'all' = 'all'
): Promise<any[]> {
  try {
    const cacheKey = `${LEADERBOARD_CACHE_KEY}${period}:${limit}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    let dateFilter = '';
    if (period === 'weekly') {
      dateFilter = `AND pt.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'monthly') {
      dateFilter = `AND pt.created_at >= NOW() - INTERVAL '30 days'`;
    }

    const leaderboard = await queryMany(
      `SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.level,
        COALESCE(SUM(pt.amount), 0) as period_points,
        u.points as total_points,
        COUNT(DISTINCT ub.badge_type) as badge_count,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pt.amount), 0) DESC) as rank
       FROM users u
       LEFT JOIN points_transactions pt ON u.id = pt.user_id ${dateFilter}
       LEFT JOIN user_badges ub ON u.id = ub.user_id
       GROUP BY u.id, u.full_name, u.username, u.avatar_url, u.level, u.points
       ORDER BY period_points DESC, rank ASC
       LIMIT $1`,
      [limit]
    );

    await setCache(cacheKey, leaderboard, 300); // Cache 5 minutes
    return leaderboard;
  } catch (error) {
    logger.error('Failed to get leaderboard', error instanceof Error ? error : new Error(String(error)), { period, limit });
    return [];
  }
}

/**
 * Get user's rank on leaderboard
 */
export async function getUserRank(userId: string, period: 'weekly' | 'monthly' | 'all' = 'all'): Promise<number | null> {
  try {
    let dateFilter = '';
    if (period === 'weekly') {
      dateFilter = `AND pt.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'monthly') {
      dateFilter = `AND pt.created_at >= NOW() - INTERVAL '30 days'`;
    }

    const result = await queryOne(
      `SELECT ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pt.amount), 0) DESC) as rank
       FROM users u
       LEFT JOIN points_transactions pt ON u.id = pt.user_id ${dateFilter}
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    return result?.rank || null;
  } catch (error) {
    logger.error('Failed to get user rank', error instanceof Error ? error : new Error(String(error)), { userId });
    return null;
  }
}

// ==================== GAMIFICATION HOOKS ====================

/**
 * Call when review is created
 */
export async function onReviewCreated(userId: string): Promise<void> {
  await awardPoints(userId, 50, 'review', 'Created a review');
  await updateUserLevelIfNeeded(userId);
  await checkAndGrantBadges(userId);
  await checkCommonAchievements(userId);
}

/**
 * Call when place photo is uploaded
 */
export async function onPhotoUploaded(userId: string): Promise<void> {
  await awardPoints(userId, 30, 'photo', 'Uploaded a photo');
  await updateUserLevelIfNeeded(userId);
  await checkCommonAchievements(userId);
}

/**
 * Call when review gets a helpful vote
 */
export async function onReviewHelpfulVote(targetUserId: string): Promise<void> {
  await awardPoints(targetUserId, 10, 'helpful_vote', 'Review marked as helpful');
  await updateUserLevelIfNeeded(targetUserId);
  await checkAndGrantBadges(targetUserId);
}

/**
 * Call when user logs in daily
 */
export async function onDailyLogin(userId: string): Promise<void> {
  // Award daily login points only once per day
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `sanliurfa:daily-login:${userId}:${today}`;
  const hasLoggedIn = await getCache(cacheKey);

  if (!hasLoggedIn) {
    await awardPoints(userId, 5, 'daily_login', 'Daily login bonus');
    await setCache(cacheKey, '1', 86400); // Cache for 24 hours
    await updateUserLevelIfNeeded(userId);
    await checkCommonAchievements(userId);
  }
}
