/**
 * User Activity Log System
 * Track and query user activities
 */

import { query } from '../postgres';

export type ActivityType =
  | 'place_view'
  | 'place_create'
  | 'place_edit'
  | 'review_create'
  | 'review_edit'
  | 'review_delete'
  | 'comment_create'
  | 'comment_edit'
  | 'comment_delete'
  | 'favorite_add'
  | 'favorite_remove'
  | 'collection_create'
  | 'collection_edit'
  | 'collection_delete'
  | 'follow_user'
  | 'unfollow_user'
  | 'search'
  | 'share'
  | 'login'
  | 'logout'
  | 'profile_update';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  entityType?: 'place' | 'review' | 'comment' | 'user' | 'collection';
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ActivityFeedItem extends Activity {
  userName?: string;
  userAvatar?: string;
  entityName?: string;
  entityImage?: string;
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  type: ActivityType,
  options: {
    entityType?: Activity['entityType'];
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> {
  const { entityType, entityId, metadata, ipAddress, userAgent } = options;

  await query(
    `INSERT INTO user_activities (user_id, type, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [userId, type, entityType, entityId, metadata ? JSON.stringify(metadata) : null, ipAddress, userAgent]
  );

  // Update activity summary for faster queries
  await updateActivitySummary(userId, type);
}

/**
 * Update activity summary for user
 */
async function updateActivitySummary(userId: string, type: ActivityType): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await query(
    `INSERT INTO activity_summaries (user_id, date, activity_type, count, last_activity_at)
     VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (user_id, date, activity_type)
     DO UPDATE SET count = activity_summaries.count + 1, last_activity_at = NOW()`,
    [userId, today, type]
  );
}

/**
 * Get user activity feed
 */
export async function getUserActivityFeed(
  userId: string,
  options: {
    types?: ActivityType[];
    limit?: number;
    offset?: number;
    includeFollowed?: boolean;
  } = {}
): Promise<{ activities: ActivityFeedItem[]; total: number }> {
  const { types, limit = 20, offset = 0, includeFollowed = true } = options;

  let userIds = [userId];

  // Include followed users if requested
  if (includeFollowed) {
    const followedResult = await query(
      'SELECT following_id FROM user_follows WHERE follower_id = $1',
      [userId]
    );
    userIds = [...userIds, ...followedResult.rows.map(r => r.following_id)];
  }

  // Build query
  let sql = `
    SELECT a.*, 
      u.full_name as user_name, 
      u.avatar_url as user_avatar,
      CASE 
        WHEN a.entity_type = 'place' THEN (SELECT name FROM places WHERE id = a.entity_id)
        WHEN a.entity_type = 'collection' THEN (SELECT name FROM collections WHERE id = a.entity_id::uuid)
        ELSE NULL
      END as entity_name,
      CASE
        WHEN a.entity_type = 'place' THEN (SELECT file_path FROM place_photos WHERE place_id = a.entity_id LIMIT 1)
        ELSE NULL
      END as entity_image
    FROM user_activities a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id = ANY($1)
  `;
  const params: any[] = [userIds];

  if (types && types.length > 0) {
    sql += ` AND a.type = ANY($${params.length + 1})`;
    params.push(types);
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM user_activities WHERE user_id = ANY($1)${types ? ' AND type = ANY($2)' : ''}`,
    params
  );

  sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const activities = result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    userName: row.user_name,
    userAvatar: row.user_avatar,
    entityName: row.entity_name,
    entityImage: row.entity_image,
  }));

  return {
    activities,
    total: parseInt(countResult.rows[0].count),
  };
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userId: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<Record<string, number>> {
  const daysMap: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };
  const days = daysMap[period] || 30;

  const result = await query(
    `SELECT type, COUNT(*) as count
    FROM user_activities
    WHERE user_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')
    GROUP BY type`,
    [userId, days]
  );

  const summary: Record<string, number> = {};
  result.rows.forEach(row => {
    summary[row.type] = parseInt(row.count);
  });

  return summary;
}

/**
 * Get recent activity for a specific entity
 */
export async function getEntityActivity(
  entityType: Activity['entityType'],
  entityId: string,
  limit = 10
): Promise<Activity[]> {
  const result = await query(
    `SELECT * FROM user_activities
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
    LIMIT $3`,
    [entityType, entityId, limit]
  );

  return result.rows.map(mapActivityRow);
}

/**
 * Get trending activities (most common recent activities)
 */
export async function getTrendingActivities(
  limit = 10
): Promise<Array<{ type: ActivityType; count: number }>> {
  const result = await query(
    `SELECT type, COUNT(*) as count
    FROM user_activities
    WHERE created_at >= NOW() - INTERVAL '1 day'
    GROUP BY type
    ORDER BY count DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    type: row.type,
    count: parseInt(row.count),
  }));
}

/**
 * Delete old activities (GDPR compliance)
 */
export async function deleteOldActivities(
  olderThanDays: number = 365
): Promise<number> {
  const result = await query(
    `DELETE FROM user_activities
    WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
    RETURNING id`,
    [olderThanDays]
  );

  return result.rows.length;
}

/**
 * Get activity streak for user
 */
export async function getActivityStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}> {
  const result = await query(
    `WITH daily_activity AS (
      SELECT DISTINCT DATE(created_at) as date
      FROM user_activities
      WHERE user_id = $1
      ORDER BY date DESC
    ),
    streaks AS (
      SELECT 
        date,
        date - (ROW_NUMBER() OVER (ORDER BY date))::int as streak_group
      FROM daily_activity
    )
    SELECT 
      COUNT(*) FILTER (WHERE streak_group = (SELECT streak_group FROM streaks ORDER BY date DESC LIMIT 1)) as current_streak,
      MAX(streak_count) as longest_streak,
      (SELECT MAX(date) FROM daily_activity) as last_active_date
    FROM (
      SELECT streak_group, COUNT(*) as streak_count
      FROM streaks
      GROUP BY streak_group
    ) streak_counts`,
    [userId]
  );

  const row = result.rows[0];
  return {
    currentStreak: parseInt(row.current_streak) || 0,
    longestStreak: parseInt(row.longest_streak) || 0,
    lastActiveDate: row.last_active_date ? new Date(row.last_active_date) : null,
  };
}

function mapActivityRow(row: any): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  };
}

// Alias for API compatibility
export async function getUserActivity(
  userId: string,
  options: Parameters<typeof getUserActivityFeed>[1]
): Promise<ReturnType<typeof getUserActivityFeed>> {
  return getUserActivityFeed(userId, options);
}

export function getActivityDescription(type: ActivityType): string {
  const descriptions: Record<ActivityType, string> = {
    place_view: 'Mekan goruntuledi',
    place_create: 'Yeni mekan ekledi',
    place_edit: 'Mekan duzenledi',
    review_create: 'Degerlendirme yazdi',
    review_edit: 'Degerlendirme duzenledi',
    review_delete: 'Degerlendirme sildi',
    comment_create: 'Yorum yapti',
    comment_edit: 'Yorum duzenledi',
    comment_delete: 'Yorum sildi',
    favorite_add: 'Favorilere ekledi',
    favorite_remove: 'Favorilerden kaldirdi',
    collection_create: 'Koleksiyon olusturdu',
    collection_edit: 'Koleksiyon duzenledi',
    collection_delete: 'Koleksiyon sildi',
    follow_user: 'Kullanici takip etti',
    unfollow_user: 'Kullanici takibi birakti',
    search: 'Arama yapti',
    share: 'Paylasim yapti',
    login: 'Giris yapti',
    logout: 'Cikis yapti',
    profile_update: 'Profil guncelledi',
  };
  return descriptions[type] || type;
}

export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    place_view: 'MapPin',
    place_create: 'Plus',
    place_edit: 'Edit',
    review_create: 'Star',
    review_edit: 'Edit',
    review_delete: 'Trash',
    comment_create: 'MessageCircle',
    comment_edit: 'Edit',
    comment_delete: 'Trash',
    favorite_add: 'Heart',
    favorite_remove: 'HeartOff',
    collection_create: 'FolderPlus',
    collection_edit: 'Edit',
    collection_delete: 'Trash',
    follow_user: 'UserPlus',
    unfollow_user: 'UserMinus',
    search: 'Search',
    share: 'Share',
    login: 'LogIn',
    logout: 'LogOut',
    profile_update: 'User',
  };
  return icons[type] || 'Activity';
}
