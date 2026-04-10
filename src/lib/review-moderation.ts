/**
 * Review Moderation System
 * Flag handling, moderation queue, spam detection
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { createNotification } from './notifications-queue';
import { logger } from './logging';

export interface ReviewFlag {
  id: string;
  review_id: string;
  reported_by_user_id: string;
  flag_reason: string;
  description?: string;
  status: string;
  created_at: string;
}

/**
 * Flag a review
 */
export async function flagReview(
  reviewId: string,
  reportedByUserId: string,
  reason: string,
  description?: string
): Promise<ReviewFlag> {
  try {
    const flag = await insert('review_flags', {
      review_id: reviewId,
      reported_by_user_id: reportedByUserId,
      flag_reason: reason,
      description,
      status: 'pending'
    });

    // Clear review cache
    await deleteCache(`sanliurfa:review:${reviewId}:flags`);

    logger.info('Review flagged', { reviewId, reason, reportedBy: reportedByUserId });
    return flag;
  } catch (error) {
    logger.error('Failed to flag review', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get moderation queue
 */
export async function getModerationQueue(
  status: string = 'pending',
  limit: number = 50,
  offset: number = 0
): Promise<{ flags: ReviewFlag[]; total: number }> {
  const cacheKey = `sanliurfa:moderation:queue:${status}:${limit}:${offset}`;

  try {
    const cached = await getCache<{ flags: ReviewFlag[]; total: number }>(cacheKey);
    if (cached) return cached;

    const flags = await queryRows(
      `SELECT * FROM review_flags
       WHERE status = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM review_flags WHERE status = $1',
      [status]
    );

    const data = {
      flags,
      total: parseInt(countResult?.total || '0')
    };

    await setCache(cacheKey, data, 300);
    return data;
  } catch (error) {
    logger.error('Failed to get moderation queue', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Resolve a flagged review
 */
export async function resolveFlag(
  flagId: string,
  adminId: string,
  action: 'approve' | 'hide' | 'delete',
  resolution: string
): Promise<void> {
  try {
    const flag = await queryOne('SELECT review_id FROM review_flags WHERE id = $1', [flagId]);
    if (!flag) throw new Error('Flag not found');

    // Update flag
    await update(
      'review_flags',
      { id: flagId },
      {
        status: 'resolved',
        resolved_by_admin_id: adminId,
        resolution,
        resolved_at: new Date()
      }
    );

    // Take moderation action
    if (action === 'hide') {
      await query('UPDATE reviews SET is_hidden = true WHERE id = $1', [flag.review_id]);
    } else if (action === 'delete') {
      await query('DELETE FROM reviews WHERE id = $1', [flag.review_id]);
    }

    // Log moderation action
    await insert('review_moderation_actions', {
      review_id: flag.review_id,
      flag_id: flagId,
      action_type: action,
      action_reason: resolution,
      taken_by_admin_id: adminId,
      visibility_status: action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : 'visible'
    });

    // Clear caches
    await deleteCache(`sanliurfa:moderation:queue:pending:*`);
    await deleteCache(`sanliurfa:review:${flag.review_id}:*`);

    logger.info('Flag resolved', { flagId, action, adminId });
  } catch (error) {
    logger.error('Failed to resolve flag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check review for spam patterns
 */
export async function checkReviewSpamPatterns(userId: string): Promise<number> {
  try {
    const recentReviews = await queryOne(
      `SELECT COUNT(*) as count FROM reviews
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const recentFlags = await queryOne(
      `SELECT COUNT(*) as count FROM review_flags
       WHERE reported_by_user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    let spamScore = 0;

    // Multiple reviews in short time
    if ((recentReviews?.count || 0) > 5) {
      spamScore += 30;
    }

    // Many reports by user
    if ((recentFlags?.count || 0) > 3) {
      spamScore += 20;
    }

    // Check existing spam pattern
    const pattern = await queryOne(
      'SELECT spam_score FROM review_spam_patterns WHERE user_id = $1',
      [userId]
    );

    if (pattern && pattern.spam_score > 50) {
      spamScore += 25;
    }

    // Update or create spam pattern
    if (spamScore > 0) {
      await query(
        `INSERT INTO review_spam_patterns (user_id, spam_score, pattern_type)
         VALUES ($1, $2, 'activity_pattern')
         ON CONFLICT (user_id) DO UPDATE
         SET spam_score = $2, updated_at = NOW()`,
        [userId, Math.min(spamScore, 100)]
      );
    }

    return spamScore;
  } catch (error) {
    logger.error('Failed to check spam patterns', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Get flagged reviews for a place
 */
export async function getPlaceFlaggedReviews(placeId: string): Promise<any[]> {
  try {
    const reviews = await queryRows(
      `SELECT
        r.*,
        COUNT(rf.id) as flag_count,
        GROUP_CONCAT(DISTINCT rf.flag_reason) as reasons
       FROM reviews r
       LEFT JOIN review_flags rf ON r.id = rf.review_id AND rf.status = 'pending'
       WHERE r.place_id = $1 AND rf.id IS NOT NULL
       GROUP BY r.id
       ORDER BY flag_count DESC`,
      [placeId]
    );

    return reviews;
  } catch (error) {
    logger.error('Failed to get flagged reviews', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get user's flag history
 */
export async function getUserFlagHistory(userId: string, limit: number = 20): Promise<ReviewFlag[]> {
  try {
    const flags = await queryRows(
      `SELECT * FROM review_flags
       WHERE reported_by_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return flags;
  } catch (error) {
    logger.error('Failed to get flag history', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Verify purchase status of reviewer
 */
export async function verifyReviewerPurchase(reviewId: string): Promise<boolean> {
  try {
    // Check if reviewer has visited the place
    const visit = await queryOne(
      `SELECT pv.id FROM place_visits pv
       JOIN reviews r ON pv.user_id = r.user_id AND pv.place_id = r.place_id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (visit) {
      // Update verification
      await update(
        'review_verification',
        { review_id: reviewId },
        {
          verification_status: 'verified',
          verified_purchase: true,
          verified_at: new Date()
        }
      );

      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to verify purchase', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
