/**
 * Admin User Management Library
 * User management, audit logging, and account flags
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

export async function getAllUsers(limit: number = 50, offset: number = 0, searchQuery?: string): Promise<any[]> {
  try {
    let query = `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.created_at,
        u.updated_at,
        uas.last_login_at,
        uas.last_activity_at,
        uas.post_count,
        uas.review_count,
        uas.warning_count,
        uas.suspension_count,
        (SELECT COUNT(*) FROM account_flags WHERE user_id = u.id AND is_active = true) as active_flags
      FROM users u
      LEFT JOIN user_activity_summary uas ON u.id = uas.user_id
    `;
    const params: any[] = [];

    if (searchQuery) {
      query += ` WHERE u.email ILIKE $1 OR u.full_name ILIKE $1`;
      params.push(`%${searchQuery}%`);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const users = await queryMany(query, params);
    return users;
  } catch (error) {
    logger.error('Failed to get all users', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserDetails(userId: string): Promise<any> {
  try {
    const [user, flags, recentActivity, auditLogs] = await Promise.all([
      queryOne(`
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.role,
          u.created_at,
          u.updated_at,
          u.last_login_at,
          uas.last_activity_at,
          uas.post_count,
          uas.review_count,
          uas.comment_count,
          uas.warning_count,
          uas.suspension_count,
          uas.flagged_count
        FROM users u
        LEFT JOIN user_activity_summary uas ON u.id = uas.user_id
        WHERE u.id = $1
      `, [userId]),
      queryMany(`
        SELECT * FROM account_flags
        WHERE user_id = $1 AND is_active = true
      `, [userId]),
      queryMany(`
        SELECT * FROM moderation_actions
        WHERE target_id = $1 AND target_type = 'user'
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]),
      queryMany(`
        SELECT * FROM user_audit_log
        WHERE target_user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId])
    ]);

    return {
      user,
      activeFlags: flags,
      recentModeration: recentActivity,
      auditLog: auditLogs
    };
  } catch (error) {
    logger.error('Failed to get user details', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function flagUserAccount(userId: string, adminId: string, flagType: string, reason: string, severity: string, expiresAt?: Date): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('account_flags', {
      id,
      user_id: userId,
      flag_type: flagType,
      reason: reason,
      severity: severity,
      flagged_by_admin_id: adminId,
      is_active: true,
      expires_at: expiresAt || null
    });

    // Log to audit
    await logAdminAction(adminId, userId, 'flag_account', { flagType, reason, severity });

    logger.info('User account flagged', { userId, flagType, severity });
    return id;
  } catch (error) {
    logger.error('Failed to flag user account', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function removeUserFlag(flagId: string, adminId: string): Promise<void> {
  try {
    const flag = await queryOne('SELECT user_id FROM account_flags WHERE id = $1', [flagId]);
    if (!flag) throw new Error('Flag not found');

    await update('account_flags', { id: flagId }, {
      is_active: false,
      updated_at: new Date()
    });

    await logAdminAction(adminId, flag.user_id, 'remove_flag', { flagId });
    logger.info('User flag removed', { flagId, adminId });
  } catch (error) {
    logger.error('Failed to remove flag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function changeUserRole(userId: string, adminId: string, newRole: string): Promise<void> {
  try {
    const oldUser = await queryOne('SELECT role FROM users WHERE id = $1', [userId]);
    if (!oldUser) throw new Error('User not found');

    await update('users', { id: userId }, {
      role: newRole,
      updated_at: new Date()
    });

    await logAdminAction(adminId, userId, 'change_role', { oldRole: oldUser.role, newRole });
    logger.info('User role changed', { userId, from: oldUser.role, to: newRole, by: adminId });
  } catch (error) {
    logger.error('Failed to change user role', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function logAdminAction(
  adminId: string,
  targetUserId: string,
  actionType: string,
  changes?: any,
  metadata?: any
): Promise<void> {
  try {
    await insert('user_audit_log', {
      admin_id: adminId,
      target_user_id: targetUserId,
      action_type: actionType,
      changes: changes ? JSON.stringify(changes) : null,
      action_details: metadata ? JSON.stringify(metadata) : null,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null
    });
  } catch (error) {
    logger.error('Failed to log admin action', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getUserAuditLog(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const logs = await queryMany(`
      SELECT
        ual.id,
        ual.admin_id,
        ual.action_type,
        ual.changes,
        ual.action_details,
        ual.created_at,
        u.email as admin_email
      FROM user_audit_log ual
      LEFT JOIN users u ON ual.admin_id = u.id
      WHERE ual.target_user_id = $1
      ORDER BY ual.created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return logs;
  } catch (error) {
    logger.error('Failed to get audit log', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserActivitySummary(userId: string): Promise<any> {
  try {
    const summary = await queryOne(`
      SELECT * FROM user_activity_summary
      WHERE user_id = $1
    `, [userId]);
    return summary;
  } catch (error) {
    logger.error('Failed to get activity summary', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getAdminSessions(adminId: string): Promise<any[]> {
  try {
    const sessions = await queryMany(`
      SELECT
        id,
        ip_address,
        user_agent,
        location,
        country,
        city,
        last_activity_at,
        logged_out_at,
        created_at
      FROM admin_sessions
      WHERE admin_id = $1
      ORDER BY last_activity_at DESC
      LIMIT 20
    `, [adminId]);
    return sessions;
  } catch (error) {
    logger.error('Failed to get admin sessions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function createAdminSession(adminId: string, token: string, metadata?: any): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('admin_sessions', {
      id,
      admin_id: adminId,
      session_token: token,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null,
      location: metadata?.location || null,
      country: metadata?.country || null,
      city: metadata?.city || null
    });
    return id;
  } catch (error) {
    logger.error('Failed to create admin session', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function logoutAdminSession(sessionId: string): Promise<void> {
  try {
    await update('admin_sessions', { id: sessionId }, {
      logged_out_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to logout admin session', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateUserActivitySummary(userId: string, updates: any): Promise<void> {
  try {
    const existing = await queryOne('SELECT id FROM user_activity_summary WHERE user_id = $1', [userId]);

    if (existing) {
      await update('user_activity_summary', { user_id: userId }, {
        ...updates,
        updated_at: new Date()
      });
    } else {
      await insert('user_activity_summary', {
        user_id: userId,
        ...updates
      });
    }
  } catch (error) {
    logger.error('Failed to update activity summary', error instanceof Error ? error : new Error(String(error)));
  }
}
