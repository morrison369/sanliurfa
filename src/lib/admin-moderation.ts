/**
 * Admin Moderation Library
 * Content flagging, moderation actions, and queue management
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

export async function getModerationQueue(status: string = 'pending', limit: number = 20, offset: number = 0): Promise<any[]> {
  try {
    const items = await queryRows(`
      SELECT
        mq.id,
        mq.queue_type,
        mq.item_type,
        mq.item_id,
        mq.priority,
        mq.reason,
        mq.submitted_count,
        mq.last_reported_at,
        mq.assigned_to_admin_id,
        mq.status,
        mq.created_at,
        u.email as assigned_admin_email
      FROM moderation_queue mq
      LEFT JOIN users u ON mq.assigned_to_admin_id = u.id
      WHERE mq.status = $1
      ORDER BY mq.priority DESC, mq.created_at ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);
    return items;
  } catch (error) {
    logger.error('Failed to get moderation queue', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getContentFlags(status: string = 'pending', limit: number = 20, offset: number = 0): Promise<any[]> {
  try {
    const flags = await queryRows(`
      SELECT
        cf.id,
        cf.content_type,
        cf.content_id,
        cf.flagged_by_user_id,
        cf.flag_reason,
        cf.flag_description,
        cf.flag_severity,
        cf.status,
        cf.reviewed_by_admin_id,
        cf.review_notes,
        cf.created_at,
        u.email as reporter_email,
        a.email as reviewer_email
      FROM content_flags cf
      LEFT JOIN users u ON cf.flagged_by_user_id = u.id
      LEFT JOIN users a ON cf.reviewed_by_admin_id = a.id
      WHERE cf.status = $1
      ORDER BY cf.flag_severity DESC, cf.created_at ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);
    return flags;
  } catch (error) {
    logger.error('Failed to get content flags', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function assignModerationQueueItem(queueItemId: string, adminId: string): Promise<void> {
  try {
    await update('moderation_queue', { id: queueItemId }, {
      assigned_to_admin_id: adminId,
      status: 'in_review',
      updated_at: new Date()
    });
    logger.info('Queue item assigned', { queueItemId, adminId });
  } catch (error) {
    logger.error('Failed to assign queue item', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function resolveModerationQueueItem(queueItemId: string, adminId: string, resolution: string): Promise<void> {
  try {
    await update('moderation_queue', { id: queueItemId }, {
      status: 'resolved',
      assigned_to_admin_id: adminId,
      updated_at: new Date()
    });
    logger.info('Queue item resolved', { queueItemId, adminId, resolution });
  } catch (error) {
    logger.error('Failed to resolve queue item', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function reviewContentFlag(flagId: string, adminId: string, decision: 'approved' | 'rejected' | 'escalated', notes: string): Promise<void> {
  try {
    const status = decision === 'approved' ? 'resolved' : decision === 'escalated' ? 'escalated' : 'rejected';
    await update('content_flags', { id: flagId }, {
      reviewed_by_admin_id: adminId,
      status: status,
      review_notes: notes,
      resolved_at: new Date(),
      updated_at: new Date()
    });
    logger.info('Content flag reviewed', { flagId, adminId, decision });
  } catch (error) {
    logger.error('Failed to review flag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createModerationAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason: string,
  details?: any,
  durationHours?: number
): Promise<string> {
  try {
    const id = crypto.randomUUID();
    const isPermanent = durationHours === undefined || durationHours === 0;
    const expiresAt = isPermanent ? null : new Date(Date.now() + (durationHours! * 60 * 60 * 1000));

    await insert('moderation_actions', {
      id,
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      action_reason: reason,
      action_details: details ? JSON.stringify(details) : null,
      duration_hours: durationHours,
      is_permanent: isPermanent,
      status: 'active',
      expires_at: expiresAt
    });

    logger.info('Moderation action created', { id, adminId, actionType, targetType, targetId });
    return id;
  } catch (error) {
    logger.error('Failed to create moderation action', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getModerationActions(targetId?: string, status: string = 'active', limit: number = 20): Promise<any[]> {
  try {
    let query = `
      SELECT
        ma.id,
        ma.admin_id,
        ma.action_type,
        ma.target_type,
        ma.target_id,
        ma.action_reason,
        ma.status,
        ma.duration_hours,
        ma.is_permanent,
        ma.expires_at,
        ma.created_at,
        u.email as admin_email
      FROM moderation_actions ma
      LEFT JOIN users u ON ma.admin_id = u.id
      WHERE ma.status = $1
    `;
    const params: any[] = [status];

    if (targetId) {
      query += ` AND ma.target_id = $${params.length + 1}`;
      params.push(targetId);
    }

    query += ` ORDER BY ma.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const actions = await queryRows(query, params);
    return actions;
  } catch (error) {
    logger.error('Failed to get moderation actions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getModerationStats(): Promise<any> {
  try {
    const [queueStats, flagStats, actionStats] = await Promise.all([
      queryOne(`
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
        FROM moderation_queue
      `),
      queryOne(`
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN flag_severity = 'high' THEN 1 END) as high_severity
        FROM content_flags
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `),
      queryOne(`
        SELECT
          COUNT(CASE WHEN action_type = 'warn' THEN 1 END) as warnings,
          COUNT(CASE WHEN action_type = 'suspend' THEN 1 END) as suspensions,
          COUNT(CASE WHEN action_type = 'ban' THEN 1 END) as bans,
          COUNT(*) as total
        FROM moderation_actions
        WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'active'
      `)
    ]);

    return {
      queue: {
        pending: parseInt(queueStats?.pending || '0'),
        inReview: parseInt(queueStats?.in_review || '0'),
        resolved: parseInt(queueStats?.resolved || '0')
      },
      flags: {
        pending: parseInt(flagStats?.pending || '0'),
        resolved: parseInt(flagStats?.resolved || '0'),
        highSeverity: parseInt(flagStats?.high_severity || '0')
      },
      actions: {
        warnings: parseInt(actionStats?.warnings || '0'),
        suspensions: parseInt(actionStats?.suspensions || '0'),
        bans: parseInt(actionStats?.bans || '0'),
        total: parseInt(actionStats?.total || '0')
      }
    };
  } catch (error) {
    logger.error('Failed to get moderation stats', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function addContentFilterRule(ruleType: string, pattern: string, action: string, severity: string, createdByAdminId: string): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('content_filter_rules', {
      id,
      rule_type: ruleType,
      pattern: pattern,
      action: action,
      severity: severity,
      is_active: true,
      created_by_admin_id: createdByAdminId
    });
    return id;
  } catch (error) {
    logger.error('Failed to add filter rule', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getContentFilterRules(isActive: boolean = true): Promise<any[]> {
  try {
    const rules = await queryRows(`
      SELECT * FROM content_filter_rules
      WHERE is_active = $1
      ORDER BY created_at DESC
    `, [isActive]);
    return rules;
  } catch (error) {
    logger.error('Failed to get filter rules', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
