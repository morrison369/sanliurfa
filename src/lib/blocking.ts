/**
 * User Blocking & Muting System
 * Manage blocked and muted users
 */

import { query, queryOne, queryMany } from './postgres';
import { deleteCache } from './cache';
import { logger } from './logging';

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
}

export interface UserMute {
  id: string;
  muter_id: string;
  muted_id: string;
  reason?: string;
  created_at: string;
}

/**
 * Block a user
 */
export async function blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock> {
  try {
    if (blockerId === blockedId) {
      throw new Error('Kendinizi engelleyemezsiniz');
    }

    const result = await queryOne(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING
       RETURNING *`,
      [blockerId, blockedId, reason || null]
    );

    if (!result) {
      // Already blocked
      const existing = await queryOne(
        'SELECT * FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
        [blockerId, blockedId]
      );
      if (existing) {
        return {
          id: existing.id,
          blocker_id: existing.blocker_id,
          blocked_id: existing.blocked_id,
          reason: existing.reason,
          created_at: existing.created_at
        };
      }
      throw new Error('Engelleme başarısız oldu');
    }

    // Clear caches
    await deleteCache(`sanliurfa:user:blocks:${blockerId}`);
    await deleteCache(`sanliurfa:user:blocked_by:${blockedId}`);

    logger.info('User blocked', { blockerId, blockedId });

    return {
      id: result.id,
      blocker_id: result.blocker_id,
      blocked_id: result.blocked_id,
      reason: result.reason,
      created_at: result.created_at
    };
  } catch (error) {
    logger.error('Failed to block user', error instanceof Error ? error : new Error(String(error)), {
      blockerId,
      blockedId
    });
    throw error;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(`sanliurfa:user:blocks:${blockerId}`);
      await deleteCache(`sanliurfa:user:blocked_by:${blockedId}`);
      logger.info('User unblocked', { blockerId, blockedId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to unblock user', error instanceof Error ? error : new Error(String(error)), {
      blockerId,
      blockedId
    });
    throw error;
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1',
      [blockerId, blockedId]
    );
    return !!result;
  } catch (error) {
    logger.error('Failed to check if user is blocked', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(blockerId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const result = await queryMany(
      `SELECT
        ub.id, ub.blocked_id, ub.reason, ub.created_at,
        u.full_name, u.username, u.avatar_url, u.level, u.points
       FROM user_blocks ub
       INNER JOIN users u ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC
       LIMIT $2 OFFSET $3`,
      [blockerId, limit, offset]
    );

    return result.rows.map((row: any) => ({
      block_id: row.id,
      blocked_user: {
        id: row.blocked_id,
        full_name: row.full_name,
        username: row.username,
        avatar_url: row.avatar_url,
        level: row.level,
        points: row.points
      },
      reason: row.reason,
      created_at: row.created_at
    }));
  } catch (error) {
    logger.error('Failed to get blocked users', error instanceof Error ? error : new Error(String(error)), {
      blockerId
    });
    throw error;
  }
}

/**
 * Get list of users blocking this user
 */
export async function getBlockedByUsers(userId: string): Promise<string[]> {
  try {
    const result = await queryMany(
      'SELECT blocker_id FROM user_blocks WHERE blocked_id = $1',
      [userId]
    );

    return result.rows.map((row: any) => row.blocker_id);
  } catch (error) {
    logger.error('Failed to get blocked by users', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Mute a user (hide their content from feed)
 */
export async function muteUser(muterId: string, mutedId: string, reason?: string): Promise<UserMute> {
  try {
    if (muterId === mutedId) {
      throw new Error('Kendinizi susturabilirsiniz');
    }

    const result = await queryOne(
      `INSERT INTO user_mutes (muter_id, muted_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (muter_id, muted_id) DO NOTHING
       RETURNING *`,
      [muterId, mutedId, reason || null]
    );

    if (!result) {
      const existing = await queryOne(
        'SELECT * FROM user_mutes WHERE muter_id = $1 AND muted_id = $2',
        [muterId, mutedId]
      );
      if (existing) {
        return {
          id: existing.id,
          muter_id: existing.muter_id,
          muted_id: existing.muted_id,
          reason: existing.reason,
          created_at: existing.created_at
        };
      }
      throw new Error('Susturma başarısız oldu');
    }

    await deleteCache(`sanliurfa:user:mutes:${muterId}`);
    logger.info('User muted', { muterId, mutedId });

    return {
      id: result.id,
      muter_id: result.muter_id,
      muted_id: result.muted_id,
      reason: result.reason,
      created_at: result.created_at
    };
  } catch (error) {
    logger.error('Failed to mute user', error instanceof Error ? error : new Error(String(error)), {
      muterId,
      mutedId
    });
    throw error;
  }
}

/**
 * Unmute a user
 */
export async function unmuteUser(muterId: string, mutedId: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM user_mutes WHERE muter_id = $1 AND muted_id = $2',
      [muterId, mutedId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(`sanliurfa:user:mutes:${muterId}`);
      logger.info('User unmuted', { muterId, mutedId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to unmute user', error instanceof Error ? error : new Error(String(error)), {
      muterId,
      mutedId
    });
    throw error;
  }
}

/**
 * Check if user is muted
 */
export async function isUserMuted(muterId: string, mutedId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM user_mutes WHERE muter_id = $1 AND muted_id = $2 LIMIT 1',
      [muterId, mutedId]
    );
    return !!result;
  } catch (error) {
    logger.error('Failed to check if user is muted', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Record a blocked message attempt
 */
export async function recordBlockedMessageAttempt(senderId: string, recipientId: string): Promise<void> {
  try {
    await query(
      'INSERT INTO blocked_message_attempts (sender_id, recipient_id) VALUES ($1, $2)',
      [senderId, recipientId]
    );
  } catch (error) {
    logger.error(
      'Failed to record blocked message attempt',
      error instanceof Error ? error : new Error(String(error)),
      {
        senderId,
        recipientId
      }
    );
    // Don't throw - this is non-critical
  }
}

/**
 * Get muted users list
 */
export async function getMutedUsers(muterId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const result = await queryMany(
      `SELECT
        um.id, um.muted_id, um.reason, um.created_at,
        u.full_name, u.username, u.avatar_url, u.level, u.points
       FROM user_mutes um
       INNER JOIN users u ON um.muted_id = u.id
       WHERE um.muter_id = $1
       ORDER BY um.created_at DESC
       LIMIT $2 OFFSET $3`,
      [muterId, limit, offset]
    );

    return result.rows.map((row: any) => ({
      mute_id: row.id,
      muted_user: {
        id: row.muted_id,
        full_name: row.full_name,
        username: row.username,
        avatar_url: row.avatar_url,
        level: row.level,
        points: row.points
      },
      reason: row.reason,
      created_at: row.created_at
    }));
  } catch (error) {
    logger.error('Failed to get muted users', error instanceof Error ? error : new Error(String(error)), {
      muterId
    });
    throw error;
  }
}
