/**
 * Privacy & Data Management
 * User privacy settings, blocking, muting, and account deletion
 */

import { query, queryOne, queryRows, insert, update as updateDb } from './postgres';
import { deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_public: boolean;
  show_activity: boolean;
  show_reviews: boolean;
  show_email: boolean;
  allow_messages: boolean;
  show_followers: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocked_user_id: string;
  reason?: string;
  blocked_at: string;
}

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  reason?: string;
  scheduled_for: string;
  status: 'scheduled' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
}

/**
 * Get or create user's privacy settings (with defaults)
 */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  try {
    let settings = await queryOne(
      'SELECT * FROM privacy_settings WHERE user_id = $1',
      [userId]
    );

    if (!settings) {
      // Create default privacy settings if they don't exist
      settings = await insert('privacy_settings', {
        user_id: userId,
        profile_public: true,
        show_activity: true,
        show_reviews: true,
        show_email: false,
        allow_messages: true,
        show_followers: true
      });
    }

    return {
      id: settings.id,
      user_id: settings.user_id,
      profile_public: settings.profile_public,
      show_activity: settings.show_activity,
      show_reviews: settings.show_reviews,
      show_email: settings.show_email,
      allow_messages: settings.allow_messages,
      show_followers: settings.show_followers,
      created_at: settings.created_at,
      updated_at: settings.updated_at
    };
  } catch (error) {
    logger.error('Failed to get privacy settings', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
}

/**
 * Update user's privacy settings
 */
export async function updatePrivacySettings(
  userId: string,
  settings: Partial<Omit<PrivacySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<PrivacySettings> {
  try {
    // Ensure settings exist
    await getPrivacySettings(userId);

    const updateData = {
      ...settings,
      updated_at: new Date().toISOString()
    };

    const updated = await updateDb('privacy_settings', userId, updateData, 'user_id');

    // Invalidate cache
    await deleteCache(`sanliurfa:privacy:${userId}`);

    logger.info('Privacy settings updated', { userId, changedFields: Object.keys(settings) });

    return {
      id: updated.id,
      user_id: updated.user_id,
      profile_public: updated.profile_public,
      show_activity: updated.show_activity,
      show_reviews: updated.show_reviews,
      show_email: updated.show_email,
      allow_messages: updated.allow_messages,
      show_followers: updated.show_followers,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    };
  } catch (error) {
    logger.error('Failed to update privacy settings', error instanceof Error ? error : new Error(String(error)), {
      userId,
      settings
    });
    throw error;
  }
}

/**
 * Block a user
 */
export async function blockUser(userId: string, blockedUserId: string, reason?: string): Promise<boolean> {
  try {
    if (userId === blockedUserId) {
      throw new Error('Kendinizi engelleyemezsiniz');
    }

    // Check if already blocked
    const existing = await queryOne(
      'SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [userId, blockedUserId]
    );

    if (existing) {
      return true; // Already blocked
    }

    await insert('blocked_users', {
      user_id: userId,
      blocked_user_id: blockedUserId,
      reason: reason || null
    });

    // Clear blocking cache
    await deleteCache(`sanliurfa:blocked:${userId}`);

    logger.info('User blocked', { userId, blockedUserId, reason });
    return true;
  } catch (error) {
    logger.error('Failed to block user', error instanceof Error ? error : new Error(String(error)), {
      userId,
      blockedUserId
    });
    throw error;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
  try {
    await query(
      'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [userId, blockedUserId]
    );

    // Clear blocking cache
    await deleteCache(`sanliurfa:blocked:${userId}`);

    logger.info('User unblocked', { userId, blockedUserId });
    return true;
  } catch (error) {
    logger.error('Failed to unblock user', error instanceof Error ? error : new Error(String(error)), {
      userId,
      blockedUserId
    });
    throw error;
  }
}

/**
 * Check if a user is blocked by another user
 */
export async function isUserBlocked(userId: string, blockedByUserId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [blockedByUserId, userId]
    );

    return !!result;
  } catch (error) {
    logger.error('Failed to check if user is blocked', error instanceof Error ? error : new Error(String(error)), {
      userId,
      blockedByUserId
    });
    return false;
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(userId: string): Promise<BlockedUser[]> {
  try {
    const results = await queryRows(
      `SELECT id, blocked_user_id, reason, blocked_at
       FROM blocked_users
       WHERE user_id = $1
       ORDER BY blocked_at DESC`,
      [userId]
    );

    return results.map((row: any) => ({
      id: row.id,
      blocked_user_id: row.blocked_user_id,
      reason: row.reason,
      blocked_at: row.blocked_at
    }));
  } catch (error) {
    logger.error('Failed to get blocked users', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
}

/**
 * Mute notifications from a user
 */
export async function muteUser(userId: string, mutedUserId: string): Promise<boolean> {
  try {
    if (userId === mutedUserId) {
      throw new Error('Kendinizi susturabilirsiniz');
    }

    const existing = await queryOne(
      'SELECT id FROM muted_users WHERE user_id = $1 AND muted_user_id = $2',
      [userId, mutedUserId]
    );

    if (existing) {
      return true; // Already muted
    }

    await insert('muted_users', {
      user_id: userId,
      muted_user_id: mutedUserId
    });

    await deleteCache(`sanliurfa:muted:${userId}`);

    logger.info('User notifications muted', { userId, mutedUserId });
    return true;
  } catch (error) {
    logger.error('Failed to mute user', error instanceof Error ? error : new Error(String(error)), {
      userId,
      mutedUserId
    });
    throw error;
  }
}

/**
 * Unmute a user
 */
export async function unmuteUser(userId: string, mutedUserId: string): Promise<boolean> {
  try {
    await query(
      'DELETE FROM muted_users WHERE user_id = $1 AND muted_user_id = $2',
      [userId, mutedUserId]
    );

    await deleteCache(`sanliurfa:muted:${userId}`);

    logger.info('User notifications unmuted', { userId, mutedUserId });
    return true;
  } catch (error) {
    logger.error('Failed to unmute user', error instanceof Error ? error : new Error(String(error)), {
      userId,
      mutedUserId
    });
    throw error;
  }
}

/**
 * Check if notifications from a user are muted
 */
export async function isUserMuted(userId: string, mutedByUserId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM muted_users WHERE user_id = $1 AND muted_user_id = $2',
      [mutedByUserId, userId]
    );

    return !!result;
  } catch (error) {
    logger.error('Failed to check if user is muted', error instanceof Error ? error : new Error(String(error)), {
      userId,
      mutedByUserId
    });
    return false;
  }
}

/**
 * Request account data deletion (GDPR right to be forgotten)
 * Schedules deletion 30 days in the future to allow cancellation
 */
export async function requestDataDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
  try {
    // Check if deletion already requested
    const existing = await queryOne(
      `SELECT id FROM data_deletion_requests
       WHERE user_id = $1 AND status = 'scheduled'`,
      [userId]
    );

    if (existing) {
      throw new Error('Zaten bir silme isteği var. Lütfen mevcut isteğinizi iptal edin veya bekleyin.');
    }

    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30); // 30 days from now

    const request = await insert('data_deletion_requests', {
      user_id: userId,
      reason: reason || null,
      scheduled_for: scheduledFor.toISOString(),
      status: 'scheduled'
    });

    logger.info('Data deletion requested', { userId, scheduledFor: scheduledFor.toISOString(), reason });

    return {
      id: request.id,
      user_id: request.user_id,
      reason: request.reason,
      scheduled_for: request.scheduled_for,
      status: request.status,
      created_at: request.created_at
    };
  } catch (error) {
    logger.error('Failed to request data deletion', error instanceof Error ? error : new Error(String(error)), {
      userId,
      reason
    });
    throw error;
  }
}

/**
 * Cancel account deletion request
 */
export async function cancelDataDeletion(userId: string): Promise<boolean> {
  try {
    const request = await queryOne(
      'SELECT id FROM data_deletion_requests WHERE user_id = $1 AND status = $2',
      [userId, 'scheduled']
    );

    if (!request) {
      throw new Error('Etkin bir silme isteği bulunamadı');
    }

    await updateDb(
      'data_deletion_requests',
      request.id,
      { status: 'cancelled' }
    );

    logger.info('Data deletion cancelled', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to cancel data deletion', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get data deletion request status
 */
export async function getDataDeletionStatus(userId: string): Promise<DataDeletionRequest | null> {
  try {
    const request = await queryOne(
      'SELECT * FROM data_deletion_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!request) {
      return null;
    }

    return {
      id: request.id,
      user_id: request.user_id,
      reason: request.reason,
      scheduled_for: request.scheduled_for,
      status: request.status,
      created_at: request.created_at
    };
  } catch (error) {
    logger.error('Failed to get data deletion status', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Check if user's profile is public
 */
export async function isProfilePublic(userId: string): Promise<boolean> {
  try {
    const settings = await getPrivacySettings(userId);
    return settings.profile_public;
  } catch (error) {
    logger.error('Failed to check if profile is public', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return false;
  }
}

/**
 * Check if user allows messages from others
 */
export async function allowsMessages(userId: string): Promise<boolean> {
  try {
    const settings = await getPrivacySettings(userId);
    return settings.allow_messages;
  } catch (error) {
    logger.error('Failed to check message settings', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return true; // Default to allowing
  }
}
