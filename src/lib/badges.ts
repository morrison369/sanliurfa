/**
 * Badges Library
 * Badge system for user achievements
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

export async function getAllBadges(): Promise<any[]> {
  try {
    const badges = await queryRows(`
      SELECT * FROM badges
      WHERE is_active = true
      ORDER BY badge_category, display_order ASC
    `);
    return badges;
  } catch (error) {
    logger.error('Failed to get badges', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserBadges(userId: string): Promise<any[]> {
  try {
    const badges = await queryRows(`
      SELECT
        b.*,
        ub.earned_at,
        ub.unlock_reason,
        ub.is_featured
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.is_featured DESC, ub.earned_at DESC
    `, [userId]);
    return badges;
  } catch (error) {
    logger.error('Failed to get user badges', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function awardBadgeToUser(userId: string, badgeKey: string, reason?: string): Promise<boolean> {
  try {
    const badge = await queryOne('SELECT id FROM badges WHERE badge_key = $1', [badgeKey]);
    if (!badge) {
      logger.warn('Badge not found', { badgeKey });
      return false;
    }

    const existing = await queryOne(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badge.id]
    );

    if (existing) {
      return false;
    }

    await insert('user_badges', {
      user_id: userId,
      badge_id: badge.id,
      unlock_reason: reason
    });

    logger.info('Badge awarded to user', { userId, badgeKey, reason });
    return true;
  } catch (error) {
    logger.error('Failed to award badge', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function featureBadge(userId: string, badgeId: string): Promise<void> {
  try {
    const badge = await queryOne(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (!badge) throw new Error('Badge not found for this user');

    await update('user_badges', { user_id: userId, is_featured: true }, {
      is_featured: false
    });

    await update('user_badges', { user_id: userId, badge_id: badgeId }, {
      is_featured: true
    });

    logger.info('Badge featured', { userId, badgeId });
  } catch (error) {
    logger.error('Failed to feature badge', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getUserBadgeCount(userId: string): Promise<number> {
  try {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM user_badges WHERE user_id = $1',
      [userId]
    );
    return parseInt(result?.count || '0');
  } catch (error) {
    logger.error('Failed to get badge count', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

export async function getBadgeProgress(userId: string): Promise<any[]> {
  try {
    const progress = await queryRows(`
      SELECT
        a.achievement_key,
        a.achievement_name,
        ap.current_progress,
        ap.required_progress,
        ROUND((ap.current_progress::float / ap.required_progress) * 100) as progress_percent
      FROM achievement_progress ap
      JOIN achievements a ON ap.achievement_id = a.id
      WHERE ap.user_id = $1
      ORDER BY ap.progress_percent DESC
    `, [userId]);
    return progress;
  } catch (error) {
    logger.error('Failed to get badge progress', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
