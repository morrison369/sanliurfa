/**
 * Account Deletion System
 * Implements safe account deletion with grace period and anonymization
 */

import { query, queryOne } from './postgres';
import { deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

/**
 * Request account deletion
 * Creates a deletion request with 7-day grace period
 * User can cancel during this period
 */
export async function requestAccountDeletion(userId: string, reason?: string): Promise<{
  deletionRequestId: string;
  deletesAt: Date;
  gracePeriodDays: number;
}> {
  const GRACE_PERIOD_DAYS = 7;
  const deletesAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  try {
    // Create deletion request
    const result = await queryOne(
      `INSERT INTO account_deletions (user_id, reason, status, scheduled_for, created_at)
       VALUES ($1, $2, 'pending', $3, NOW())
       RETURNING id, scheduled_for`,
      [userId, reason || null, deletesAt]
    );

    logger.info('Account deletion requested', {
      userId,
      deletesAt,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      reason: reason ? 'provided' : 'not provided'
    });

    return {
      deletionRequestId: result.id,
      deletesAt: new Date(result.scheduled_for),
      gracePeriodDays: GRACE_PERIOD_DAYS
    };
  } catch (error) {
    logger.error(
      'Failed to request account deletion',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Cancel account deletion during grace period
 */
export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE account_deletions
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE user_id = $1 AND status = 'pending' AND scheduled_for > NOW()`,
      [userId]
    );

    if (result.rowCount === 0) {
      return false;
    }

    // Clear user caches
    await deleteCache(`sanliurfa:user:profile:${userId}`);
    await deleteCachePattern(`sanliurfa:user:*:${userId}`);

    logger.info('Account deletion cancelled', { userId });
    return true;
  } catch (error) {
    logger.error(
      'Failed to cancel account deletion',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Get deletion request status
 */
export async function getDeletionStatus(userId: string): Promise<{
  hasPendingDeletion: boolean;
  deletesAt?: Date;
  gracePeriodDaysRemaining?: number;
} | null> {
  try {
    const result = await queryOne(
      `SELECT scheduled_for FROM account_deletions
       WHERE user_id = $1 AND status = 'pending' AND scheduled_for > NOW()`,
      [userId]
    );

    if (!result) {
      return {
        hasPendingDeletion: false
      };
    }

    const deletesAt = new Date(result.scheduled_for);
    const now = new Date();
    const gracePeriodDaysRemaining = Math.ceil((deletesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      hasPendingDeletion: true,
      deletesAt,
      gracePeriodDaysRemaining: Math.max(0, gracePeriodDaysRemaining)
    };
  } catch (error) {
    logger.error(
      'Failed to get deletion status',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Anonymize and delete user account
 * Called after grace period expires
 * Anonymizes all user data instead of hard delete (GDPR compliance)
 */
export async function executeAccountDeletion(userId: string): Promise<void> {
  try {
    // Start transaction-like behavior
    const ANONYMIZED_NAME = 'Silinen Kullanıcı';
    const ANONYMIZED_EMAIL = `deleted_${userId.substring(0, 8)}@deleted.local`;

    // Anonymize user personal data
    await query(
      `UPDATE users
       SET
         full_name = $1,
         email = $2,
         username = NULL,
         avatar_url = NULL,
         bio = NULL,
         email_verified = false,
         two_factor_enabled = false,
         two_factor_secret = NULL,
         notification_preferences = '{"email": false, "push": false, "in_app": false, "digest": "weekly"}'::jsonb,
         privacy_settings = '{"profile_public": false, "show_email": false, "allow_messages": false}'::jsonb,
         password_hash = NULL,
         last_login_at = NULL,
         points = 0,
         level = 0,
         deleted_at = NOW()
       WHERE id = $1`,
      [userId, ANONYMIZED_NAME, ANONYMIZED_EMAIL]
    );

    // Anonymize reviews
    await query(
      `UPDATE reviews
       SET user_id = NULL, reviewer_name = 'Silinen Kullanıcı'
       WHERE user_id = $1`,
      [userId]
    );

    // Anonymize comments
    await query(
      `UPDATE comments
       SET user_id = NULL, author_name = 'Silinen Kullanıcı'
       WHERE user_id = $1`,
      [userId]
    );

    // Delete direct messages
    await query(
      `DELETE FROM direct_messages
       WHERE sender_id = $1`,
      [userId]
    );

    // Delete conversations
    await query(
      `DELETE FROM conversations
       WHERE participant_a = $1 OR participant_b = $1`,
      [userId]
    );

    // Delete favorites
    await query(
      `DELETE FROM favorites
       WHERE user_id = $1`,
      [userId]
    );

    // Delete notifications
    await query(
      `DELETE FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    // Delete followers/following relationships
    await query(
      `DELETE FROM followers
       WHERE follower_id = $1 OR following_id = $1`,
      [userId]
    );

    // Delete blocks/mutes
    await query(
      `DELETE FROM user_blocks
       WHERE blocker_id = $1 OR blocked_id = $1`,
      [userId]
    );

    await query(
      `DELETE FROM user_mutes
       WHERE muter_id = $1 OR muted_id = $1`,
      [userId]
    );

    // Update deletion request status
    await query(
      `UPDATE account_deletions
       SET status = 'completed', completed_at = NOW()
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    // Clear all user caches
    await deleteCache(`sanliurfa:user:profile:${userId}`);
    await deleteCachePattern(`sanliurfa:user:*:${userId}`);
    await deleteCachePattern(`sanliurfa:*:${userId}`);

    logger.info('Account successfully deleted and anonymized', { userId });
  } catch (error) {
    logger.error(
      'Failed to execute account deletion',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Process all expired deletion requests
 * Should be called by a background job/cron daily
 */
export async function processExpiredDeletionRequests(): Promise<number> {
  try {
    const expiredRequests = await queryOne(
      `SELECT COUNT(*) as count FROM account_deletions
       WHERE status = 'pending' AND scheduled_for <= NOW()`,
      []
    );

    const count = parseInt(expiredRequests?.count || '0');

    if (count > 0) {
      // Get all expired deletion requests
      const requests = await queryOne(
        `SELECT user_id FROM account_deletions
         WHERE status = 'pending' AND scheduled_for <= NOW()`,
        []
      );

      // Execute deletion for each
      if (Array.isArray(requests)) {
        for (const req of requests) {
          await executeAccountDeletion(req.user_id);
        }
      } else if (requests?.user_id) {
        await executeAccountDeletion(requests.user_id);
      }
    }

    logger.info('Processed expired deletion requests', { count });
    return count;
  } catch (error) {
    logger.error(
      'Failed to process expired deletion requests',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
