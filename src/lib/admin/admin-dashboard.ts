/**
 * Admin Dashboard Library
 * Dashboard widgets, metrics, and configuration
 */
import { queryOne, queryMany, insert, update } from '../postgres';
import { logger } from '../logger';

type JsonObject = Record<string, unknown>;

interface DashboardOverview {
  users: { total: number; new: number; active: number };
  content: { places: number; reviews: number; comments: number; newReviews: number };
  flags: { pending: number; resolved: number; total: number };
  moderation: { totalActions: number; warnings: number; suspensions: number; bans: number };
  period: number;
}

interface DashboardWidgetRow {
  id: string;
  admin_id: string;
  widget_type: string;
  widget_config: string | null;
  position_order: number;
  created_at?: string;
  updated_at?: string;
}

interface SystemMetrics {
  database: { totalUsers: number; totalPlaces: number; totalReviews: number };
  users: { total: number; newThisWeek: number; activeToday: number };
  moderation: { pendingItems: number; activeCases: number };
  timestamp: string;
}

interface RecentActivityRow {
  type: string;
  actor_id: string | null;
  action: string;
  target: string;
  created_at: string;
}

export async function getDashboardOverview(days: number = 30): Promise<DashboardOverview | null> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [userStats, contentStats, flagStats, actionStats] = await Promise.all([
      queryOne(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_users,
          COUNT(CASE WHEN last_login_at >= $1 THEN 1 END) as active_users
        FROM users
      `, [startDate]),
      queryOne(`
        SELECT
          COUNT(DISTINCT p.id) as total_places,
          COUNT(DISTINCT r.id) as total_reviews,
          COUNT(DISTINCT c.id) as total_comments,
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= $1) as new_reviews
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        LEFT JOIN comments c ON r.id = c.review_id
      `, [startDate]),
      queryOne(`
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_flags,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_flags,
          COUNT(*) as total_flags
        FROM content_flags
        WHERE created_at >= $1
      `, [startDate]),
      queryOne(`
        SELECT
          COUNT(*) as total_actions,
          COUNT(CASE WHEN action_type = 'warn' THEN 1 END) as warnings,
          COUNT(CASE WHEN action_type = 'suspend' THEN 1 END) as suspensions,
          COUNT(CASE WHEN action_type = 'ban' THEN 1 END) as bans
        FROM moderation_actions
        WHERE created_at >= $1 AND status = 'active'
      `, [startDate])
    ]);

    return {
      users: {
        total: parseInt(userStats?.total_users || '0', 10),
        new: parseInt(userStats?.new_users || '0', 10),
        active: parseInt(userStats?.active_users || '0', 10)
      },
      content: {
        places: parseInt(contentStats?.total_places || '0', 10),
        reviews: parseInt(contentStats?.total_reviews || '0', 10),
        comments: parseInt(contentStats?.total_comments || '0', 10),
        newReviews: parseInt(contentStats?.new_reviews || '0', 10)
      },
      flags: {
        pending: parseInt(flagStats?.pending_flags || '0', 10),
        resolved: parseInt(flagStats?.resolved_flags || '0', 10),
        total: parseInt(flagStats?.total_flags || '0', 10)
      },
      moderation: {
        totalActions: parseInt(actionStats?.total_actions || '0', 10),
        warnings: parseInt(actionStats?.warnings || '0', 10),
        suspensions: parseInt(actionStats?.suspensions || '0', 10),
        bans: parseInt(actionStats?.bans || '0', 10)
      },
      period: days
    };
  } catch (error) {
    logger.error('Failed to get dashboard overview', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getAdminDashboardWidgets(adminId: string): Promise<DashboardWidgetRow[]> {
  try {
    const widgets = await queryMany<DashboardWidgetRow>(`
      SELECT * FROM admin_dashboard_widgets
      WHERE admin_id = $1
      ORDER BY position_order ASC
    `, [adminId]);
    return widgets;
  } catch (error) {
    logger.error('Failed to get dashboard widgets', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function saveAdminDashboardWidget(
  adminId: string,
  widgetType: string,
  config: JsonObject,
  positionOrder: number,
): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('admin_dashboard_widgets', {
      id,
      admin_id: adminId,
      widget_type: widgetType,
      widget_config: JSON.stringify(config),
      position_order: positionOrder
    });
    return id;
  } catch (error) {
    logger.error('Failed to save widget', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateAdminDashboardWidget(
  widgetId: string,
  adminId: string,
  config: JsonObject,
): Promise<void> {
  try {
    await update('admin_dashboard_widgets', { id: widgetId, admin_id: adminId }, {
      widget_config: JSON.stringify(config),
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to update widget', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const [dbMetrics, userMetrics, modMetrics] = await Promise.all([
      queryOne(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM places) as total_places,
          (SELECT COUNT(*) FROM reviews) as total_reviews
      `),
      queryOne(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_today
        FROM users
      `),
      queryOne(`
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cases
        FROM moderation_queue
      `)
    ]);

    return {
      database: {
        totalUsers: parseInt(dbMetrics?.total_users || '0', 10),
        totalPlaces: parseInt(dbMetrics?.total_places || '0', 10),
        totalReviews: parseInt(dbMetrics?.total_reviews || '0', 10)
      },
      users: {
        total: parseInt(userMetrics?.total_users || '0', 10),
        newThisWeek: parseInt(userMetrics?.new_users_week || '0', 10),
        activeToday: parseInt(userMetrics?.active_today || '0', 10)
      },
      moderation: {
        pendingItems: parseInt(modMetrics?.pending_items || '0', 10),
        activeCases: parseInt(modMetrics?.active_cases || '0', 10)
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get system metrics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getRecentActivity(limit: number = 20): Promise<RecentActivityRow[]> {
  try {
    const activities = await queryMany<RecentActivityRow>(`
      SELECT
        'moderation' as type,
        admin_id as actor_id,
        action_type as action,
        target_type as target,
        created_at
      FROM moderation_actions
      UNION ALL
      SELECT
        'flag' as type,
        reviewed_by_admin_id as actor_id,
        status as action,
        content_type as target,
        updated_at as created_at
      FROM content_flags
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    return activities;
  } catch (error) {
    logger.error('Failed to get recent activity', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getDashboardSetting(
  adminId: string | null,
  settingKey: string,
): Promise<JsonObject | null> {
  try {
    const setting = await queryOne<{ setting_value?: string | null }>(`
      SELECT setting_value FROM admin_dashboard_settings
      WHERE setting_key = $1 AND (admin_id = $2 OR is_global = true)
      ORDER BY is_global ASC
      LIMIT 1
    `, [settingKey, adminId]);
    return setting?.setting_value ? (JSON.parse(setting.setting_value) as JsonObject) : null;
  } catch (error) {
    logger.error('Failed to get dashboard setting', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function saveDashboardSetting(
  adminId: string | null,
  settingKey: string,
  settingValue: JsonObject,
  isGlobal: boolean = false,
): Promise<void> {
  try {
    await insert('admin_dashboard_settings', {
      admin_id: adminId,
      setting_key: settingKey,
      setting_value: JSON.stringify(settingValue),
      is_global: isGlobal
    }, true);
  } catch (error) {
    logger.error('Failed to save dashboard setting', error instanceof Error ? error : new Error(String(error)));
  }
}


