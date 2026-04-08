/**
 * Content Moderation & Reporting System
 * Manage user reports, moderation actions, and bans
 */

import { query, queryOne, queryMany } from './postgres';
import { deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  content_type: 'comment' | 'review' | 'message' | 'user' | 'place';
  content_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ModerationAction {
  id: string;
  report_id?: string;
  target_user_id: string;
  action_type: 'warning' | 'content_removed' | 'suspend' | 'ban' | 'appeal_granted';
  reason: string;
  duration_days?: number;
  created_by: string;
  expires_at?: string;
  created_at: string;
}

export interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  duration_days?: number;
  appeal_reason?: string;
  appeal_status?: 'pending' | 'granted' | 'denied';
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

/**
 * Submit a report for content or user
 */
export async function submitReport(
  reporterId: string,
  contentType: 'comment' | 'review' | 'message' | 'user' | 'place',
  contentId: string,
  reason: string,
  description?: string,
  reportedUserId?: string
): Promise<Report> {
  try {
    if (!['comment', 'review', 'message', 'user', 'place'].includes(contentType)) {
      throw new Error('Invalid content type');
    }

    const validReasons = [
      'spam',
      'harassment',
      'hate_speech',
      'misinformation',
      'explicit_content',
      'copyright',
      'scam',
      'impersonation',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      throw new Error('Invalid reason');
    }

    const result = await queryOne(
      `INSERT INTO reports (reporter_id, reported_user_id, content_type, content_id, reason, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reporterId, reportedUserId || null, contentType, contentId, reason, description || null]
    );

    // Update moderation queue priority based on reason
    const priority = ['hate_speech', 'misinformation', 'explicit_content'].includes(reason) ? 'high' : 'normal';

    await query(
      `INSERT INTO moderation_queue (content_type, content_id, reason, priority)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (content_type, content_id) DO UPDATE SET report_count = report_count + 1, priority = $4`,
      [contentType, contentId, reason, priority]
    );

    logger.info('Report submitted', {
      reporterId,
      contentType,
      contentId,
      reason
    });

    return {
      id: result.id,
      reporter_id: result.reporter_id,
      reported_user_id: result.reported_user_id,
      content_type: result.content_type,
      content_id: result.content_id,
      reason: result.reason,
      description: result.description,
      status: result.status,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to submit report', error instanceof Error ? error : new Error(String(error)), {
      reporterId,
      contentType,
      contentId
    });
    throw error;
  }
}

/**
 * Get reports for admin review
 */
export async function getReports(
  status?: 'pending' | 'under_review' | 'resolved' | 'dismissed',
  limit: number = 50,
  offset: number = 0
): Promise<Report[]> {
  try {
    let query_str = `SELECT * FROM reports`;
    const params: any[] = [];

    if (status) {
      query_str += ` WHERE status = $1`;
      params.push(status);
      params.push(limit);
      params.push(offset);
      query_str += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    } else {
      params.push(limit);
      params.push(offset);
      query_str += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    }

    const result = await queryMany(query_str, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      reporter_id: row.reporter_id,
      reported_user_id: row.reported_user_id,
      content_type: row.content_type,
      content_id: row.content_id,
      reason: row.reason,
      description: row.description,
      status: row.status,
      resolved_by: row.resolved_by,
      resolution_note: row.resolution_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at
    }));
  } catch (error) {
    logger.error('Failed to get reports', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  newStatus: 'pending' | 'under_review' | 'resolved' | 'dismissed',
  resolvedBy?: string,
  resolutionNote?: string
): Promise<Report> {
  try {
    const updates = [newStatus];
    let query_str = `UPDATE reports SET status = $1`;

    let paramIndex = 2;

    if (newStatus === 'resolved') {
      query_str += `, resolved_by = $${paramIndex++}, resolution_note = $${paramIndex++}, resolved_at = NOW()`;
      updates.push(resolvedBy || null);
      updates.push(resolutionNote || '');
    }

    query_str += `, updated_at = NOW() WHERE id = $${paramIndex++} RETURNING *`;
    updates.push(reportId);

    const result = await queryOne(query_str, updates);

    logger.info('Report status updated', { reportId, newStatus });

    return {
      id: result.id,
      reporter_id: result.reporter_id,
      reported_user_id: result.reported_user_id,
      content_type: result.content_type,
      content_id: result.content_id,
      reason: result.reason,
      description: result.description,
      status: result.status,
      resolved_by: result.resolved_by,
      resolution_note: result.resolution_note,
      created_at: result.created_at,
      updated_at: result.updated_at,
      resolved_at: result.resolved_at
    };
  } catch (error) {
    logger.error('Failed to update report status', error instanceof Error ? error : new Error(String(error)), {
      reportId
    });
    throw error;
  }
}

/**
 * Take moderation action on a user or content
 */
export async function takeModerationAction(
  reportId: string,
  targetUserId: string,
  actionType: 'warning' | 'content_removed' | 'suspend' | 'ban' | 'appeal_granted',
  reason: string,
  createdBy: string,
  durationDays?: number
): Promise<ModerationAction> {
  try {
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

    // Create moderation action record
    const result = await queryOne(
      `INSERT INTO moderation_actions (report_id, target_user_id, action_type, reason, duration_days, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [reportId, targetUserId, actionType, reason, durationDays || null, createdBy, expiresAt]
    );

    // If ban action, also create/update ban record
    if (actionType === 'ban') {
      await query(
        `INSERT INTO user_bans (user_id, banned_by, reason, duration_days, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [targetUserId, createdBy, reason, durationDays || null, expiresAt]
      );
    }

    // Update report status
    await updateReportStatus(reportId, 'resolved', createdBy, `Action taken: ${actionType}`);

    // Clear relevant caches
    await deleteCache(`sanliurfa:user:profile:${targetUserId}`);
    await deleteCachePattern(`sanliurfa:moderation:*`);

    logger.info('Moderation action taken', {
      reportId,
      targetUserId,
      actionType,
      createdBy
    });

    return {
      id: result.id,
      report_id: result.report_id,
      target_user_id: result.target_user_id,
      action_type: result.action_type,
      reason: result.reason,
      duration_days: result.duration_days,
      created_by: result.created_by,
      expires_at: result.expires_at,
      created_at: result.created_at
    };
  } catch (error) {
    logger.error('Failed to take moderation action', error instanceof Error ? error : new Error(String(error)), {
      reportId,
      targetUserId,
      actionType
    });
    throw error;
  }
}

/**
 * Check if user is currently banned
 */
export async function isUserBanned(userId: string): Promise<UserBan | null> {
  try {
    const result = await queryOne(
      `SELECT * FROM user_bans WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      banned_by: result.banned_by,
      reason: result.reason,
      duration_days: result.duration_days,
      appeal_reason: result.appeal_reason,
      appeal_status: result.appeal_status,
      expires_at: result.expires_at,
      created_at: result.created_at,
      is_active: true
    };
  } catch (error) {
    logger.error('Failed to check user ban', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get user's ban history
 */
export async function getUserBanHistory(userId: string): Promise<UserBan[]> {
  try {
    const result = await queryMany(
      `SELECT * FROM user_bans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      banned_by: row.banned_by,
      reason: row.reason,
      duration_days: row.duration_days,
      appeal_reason: row.appeal_reason,
      appeal_status: row.appeal_status,
      expires_at: row.expires_at,
      created_at: row.created_at,
      is_active: !row.expires_at || new Date(row.expires_at) > new Date()
    }));
  } catch (error) {
    logger.error('Failed to get ban history', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get moderation queue items
 */
export async function getModerationQueue(
  status?: 'pending' | 'in_review' | 'resolved',
  priority?: 'low' | 'normal' | 'high' | 'urgent',
  limit: number = 50
): Promise<any[]> {
  try {
    let query_str = `SELECT * FROM moderation_queue WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query_str += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      query_str += ` AND priority = $${paramIndex++}`;
      params.push(priority);
    }

    query_str += ` ORDER BY priority DESC, created_at ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await queryMany(query_str, params);

    return result.rows;
  } catch (error) {
    logger.error('Failed to get moderation queue', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<any> {
  try {
    const stats = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'under_review') as in_review_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'resolved') as resolved_reports,
        (SELECT COUNT(*) FROM user_bans WHERE expires_at > NOW()) as active_bans,
        (SELECT COUNT(*) FROM moderation_actions WHERE action_type = 'warning') as total_warnings,
        (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as queue_items`
    );

    return {
      pending_reports: parseInt(stats.pending_reports || '0'),
      in_review_reports: parseInt(stats.in_review_reports || '0'),
      resolved_reports: parseInt(stats.resolved_reports || '0'),
      active_bans: parseInt(stats.active_bans || '0'),
      total_warnings: parseInt(stats.total_warnings || '0'),
      queue_items: parseInt(stats.queue_items || '0')
    };
  } catch (error) {
    logger.error('Failed to get moderation stats', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
