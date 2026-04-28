/**
 * Email Preferences Management
 * Handles user notification preferences
 */

import { queryOne } from '../postgres';
import { logger } from '../logger';

export type NotificationChannel = 'email' | 'in_app' | 'push';
export type NotificationType = 'review_response' | 'new_review' | 'weekly_summary' | 'promotional' | 'account_changes';

export interface EmailPreferences {
  userId: string;
  reviewResponse: boolean;
  newReview: boolean;
  weeklySummary: boolean;
  promotional: boolean;
  accountChanges: boolean;
  preferredChannel: NotificationChannel;
}

/**
 * Get user email preferences
 */
export async function getUserPreferences(userId: string): Promise<EmailPreferences | null> {
  try {
    const prefs = await queryOne(
      `SELECT
        user_id,
        review_response,
        new_review,
        weekly_summary,
        promotional,
        account_changes,
        preferred_channel
       FROM email_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (!prefs) {
      return null;
    }

    return {
      userId: prefs.user_id,
      reviewResponse: prefs.review_response,
      newReview: prefs.new_review,
      weeklySummary: prefs.weekly_summary,
      promotional: prefs.promotional,
      accountChanges: prefs.account_changes,
      preferredChannel: prefs.preferred_channel
    };
  } catch (error) {
    logger.error('Get email preferences failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Update user email preferences
 */
export async function updateUserPreferences(userId: string, preferences: Partial<EmailPreferences>): Promise<boolean> {
  try {
    const updates: Record<string, any> = {};

    if (preferences.reviewResponse !== undefined) {
      updates.review_response = preferences.reviewResponse;
    }
    if (preferences.newReview !== undefined) {
      updates.new_review = preferences.newReview;
    }
    if (preferences.weeklySummary !== undefined) {
      updates.weekly_summary = preferences.weeklySummary;
    }
    if (preferences.promotional !== undefined) {
      updates.promotional = preferences.promotional;
    }
    if (preferences.accountChanges !== undefined) {
      updates.account_changes = preferences.accountChanges;
    }
    if (preferences.preferredChannel !== undefined) {
      updates.preferred_channel = preferences.preferredChannel;
    }

    if (Object.keys(updates).length === 0) {
      return true;
    }

    const result = await queryOne(
      `INSERT INTO email_preferences
        (user_id, review_response, new_review, weekly_summary, promotional, account_changes, preferred_channel, created_at, updated_at)
       VALUES
        ($1, COALESCE($2, true), COALESCE($3, true), COALESCE($4, true), COALESCE($5, false), COALESCE($6, true), COALESCE($7, 'email'), NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
        review_response = COALESCE($2, email_preferences.review_response),
        new_review = COALESCE($3, email_preferences.new_review),
        weekly_summary = COALESCE($4, email_preferences.weekly_summary),
        promotional = COALESCE($5, email_preferences.promotional),
        account_changes = COALESCE($6, email_preferences.account_changes),
        preferred_channel = COALESCE($7, email_preferences.preferred_channel),
        updated_at = NOW()
       RETURNING user_id`,
      [
        userId,
        updates.review_response ?? null,
        updates.new_review ?? null,
        updates.weekly_summary ?? null,
        updates.promotional ?? null,
        updates.account_changes ?? null,
        updates.preferred_channel ?? null
      ]
    );

    logger.info('Email preferences updated', { userId, updates });
    return Boolean(result);
  } catch (error) {
    logger.error('Update email preferences failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Create default email preferences for new user
 */
export async function createDefaultPreferences(userId: string): Promise<EmailPreferences | null> {
  try {
    const defaultPrefs = {
      user_id: userId,
      review_response: true,
      new_review: true,
      weekly_summary: true,
      promotional: false,
      account_changes: true,
      preferred_channel: 'email' as NotificationChannel,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const query = `
      INSERT INTO email_preferences
      (user_id, review_response, new_review, weekly_summary, promotional, account_changes, preferred_channel, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        user_id = EXCLUDED.user_id
      RETURNING user_id, review_response, new_review, weekly_summary, promotional, account_changes, preferred_channel
    `;

    const result = await queryOne(
      query,
      [
        userId,
        defaultPrefs.review_response,
        defaultPrefs.new_review,
        defaultPrefs.weekly_summary,
        defaultPrefs.promotional,
        defaultPrefs.account_changes,
        defaultPrefs.preferred_channel,
        defaultPrefs.created_at,
        defaultPrefs.updated_at
      ]
    );

    if (!result) {
      return null;
    }

    logger.info('Default email preferences created', { userId });

    return {
      userId: result.user_id,
      reviewResponse: result.review_response,
      newReview: result.new_review,
      weeklySummary: result.weekly_summary,
      promotional: result.promotional,
      accountChanges: result.account_changes,
      preferredChannel: result.preferred_channel
    };
  } catch (error) {
    logger.error('Create default preferences failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Check if user wants to receive notification type
 */
export async function shouldNotify(userId: string, notificationType: NotificationType): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs) {
      return false;
    }

    const notificationMap: Record<NotificationType, keyof EmailPreferences> = {
      review_response: 'reviewResponse',
      new_review: 'newReview',
      weekly_summary: 'weeklySummary',
      promotional: 'promotional',
      account_changes: 'accountChanges'
    };

    const prefKey = notificationMap[notificationType];
    return prefs[prefKey] === true;
  } catch (error) {
    logger.error('Should notify check failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Unsubscribe from all notifications (privacy/compliance)
 */
export async function unsubscribeAll(userId: string): Promise<boolean> {
  try {
    const result = await updateUserPreferences(userId, {
      reviewResponse: false,
      newReview: false,
      weeklySummary: false,
      promotional: false,
      accountChanges: false
    });

    if (result) {
      logger.info('User unsubscribed from all notifications', { userId });
    }

    return result;
  } catch (error) {
    logger.error('Unsubscribe all failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}



