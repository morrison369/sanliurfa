/**
 * PostgreSQL Database Client
 * Real connection pool with parameterized queries, slow query detection,
 * and automatic reconnection.
 */

import pg from 'pg';
import { logger } from './logging';
const { Pool: PgPool } = pg;

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

const DATABASE_URL = process.env.DATABASE_URL
  || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'sanliurfa'}`;

// CWP shared hosting: max 5-10 connections. VPS/dedicated: up to 20.
const pool = new PgPool({
  connectionString: DATABASE_URL,
  max: isProduction ? 8 : 5,
  min: isProduction ? 2 : 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: !isProduction,
});

// Connection error handling — log but don't crash
pool.on('error', (err) => {
  logger.error('[postgres] Unexpected pool error:', err.message);
});

// Graceful shutdown: PM2 SIGTERM gönderdiğinde in-flight query'ler bitince pool drain et.
// Test ortamında lifecycle import'u skip — test runner kendi cleanup'ını yapar.
if (process.env.NODE_ENV !== 'test') {
  // Async import to avoid circular dep risk; lifecycle imports logger which imports nothing else.
  void import('./lifecycle').then(({ registerShutdownHandler }) => {
    registerShutdownHandler(async () => {
      logger.info('[postgres] Draining pool...');
      await pool.end();
      logger.info('[postgres] Pool closed');
    });
  });
}

// Slow query threshold (ms)
const SLOW_QUERY_THRESHOLD = 1000;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

/**
 * Execute a SQL query with parameterized values
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn(`[postgres] Slow query (${duration}ms):`, text.substring(0, 120));
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      command: result.command,
    };
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      `[postgres] Query failed (${duration}ms):`,
      text.substring(0, 120),
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Execute a query and return single result or null
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all results
 */
export async function queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Read-only query via replica pool (falls back to primary when READ_REPLICA_URL not set).
 * Use for SELECT-only endpoints to offload read traffic when a replica is configured.
 */
export async function queryRead<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const result = await readReplicaPool.query(text, params ?? []);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0, command: result.command };
}

export async function queryReadMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await queryRead<T>(text, params);
  return result.rows;
}

export async function queryReadOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await queryRead<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute insert query and return inserted row
 */
export async function insert<T = any>(
  table: string,
  data: Record<string, any>,
  upsert?: boolean
): Promise<T | null> {
  validateTable(table);
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  let text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

  if (upsert) {
    const updateClause = keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ');
    text += ` ON CONFLICT (id) DO UPDATE SET ${updateClause}`;
  }

  text += ' RETURNING *';
  return queryOne<T>(text, values);
}

/**
 * Execute update query and return updated row
 */
export async function update<T = any>(
  table: string,
  where: Record<string, any> | string | number,
  data: Record<string, any>
): Promise<T | null> {
  validateTable(table);
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  if (typeof where === 'object' && where !== null) {
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((k, i) => `${k} = $${values.length + i + 1}`).join(' AND ');
    const text = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE ${whereClause} RETURNING *`;
    return queryOne<T>(text, [...values, ...Object.values(where)]);
  }

  const text = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`;
  return queryOne<T>(text, [...values, where]);
}

/**
 * Execute delete query
 */
export async function deleteQuery<T = any>(
  table: string,
  where: Record<string, any> | string | number
): Promise<T | null> {
  validateTable(table);
  if (typeof where === 'object' && where !== null) {
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    const text = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    return queryOne<T>(text, Object.values(where));
  }

  const text = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
  return queryOne<T>(text, [where]);
}

export {deleteQuery as delete};
export {deleteQuery as remove};
/**
 * Execute queries within a transaction
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get the raw pool instance (for sitemap-dynamic.xml.ts and similar)
 */
export function getPool() {
  return pool;
}

/**
 * Pool status for monitoring
 */
export function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Update pool status (compat with existing code)
 */
export function updatePoolStatus(_status: string): void {
  // No-op — pool status is read from getPoolStatus()
}

// Table allowlist to prevent SQL injection on table names
const ALLOWED_TABLES = new Set([
  'users', 'places', 'reviews', 'comments', 'favorites',
  'blog_posts', 'blog_comments', 'blog_subscribers',
  'events', 'event_rsvps',
  'historical_sites', 'foods',
  'categories', 'place_daily_analytics',
  'districts', 'neighborhoods', 'pharmacies', 'seo_pages',
  'notifications',
  'loyalty_points', 'loyalty_tiers', 'loyalty_transactions', 'user_badges', 'user_achievements',
  'rewards', 'reward_inventory', 'user_tier_history',
  'user_activity', 'followers', 'mentions',
  'user_subscriptions', 'subscription_usage',
  'webhooks', 'webhook_logs',
  'reservations', 'promotions',
  'support_tickets', 'support_messages',
  'collections', 'collection_items',
  'user_blocks', 'content_reports',
  'system_logs', 'migration_tracking',
  'photos', 'photo_albums',
  'messages', 'conversations', 'direct_messages', 'conversation_deletions',
  'coupons', 'coupon_usage',
  'featured_listings',
  'search_history',
  'email_subscriptions',
  'contact_submissions',
  'notification_broadcasts', 'notification_drafts',
  'client_errors', 'client_performance_metrics',
  's3_files', 'push_subscriptions',
  'two_factor_audit', 'trusted_devices',
  'place_hours', 'place_analytics_events', 'place_claims',
  'sms_logs', 'phone_verifications', 'feature_flags',
  // 2FA
  'user_2fa_methods', 'user_2fa_sessions',
  'two_fa_verification_attempts', 'two_fa_recovery_codes',
  // Notifications
  'notification_history', 'notification_delivery_log',
  'notification_type_preferences', 'notification_preferences',
  // File management
  'file_access_logs', 'file_variants', 'cdn_cache_settings',
  // Security
  'security_events', 'login_history', 'ddos_attempts',
  // Auth / sessions
  'user_sessions', 'admin_sessions', 'oauth_states', 'user_oauth_accounts',
  // Email system
  'email_campaigns', 'email_queue', 'email_preferences',
  'email_sequence_enrollments', 'email_verifications', 'marketing_campaigns',
  // Search & analytics
  'search_analytics', 'search_suggestions', 'autocomplete_index',
  'zero_result_searches', 'share_analytics', 'funnel_entries',
  // User profiles & activity
  'user_sessions', 'user_loyalty', 'user_reputation',
  'user_recommendations', 'user_predictions', 'user_cohorts',
  'user_activity_summary', 'user_journey_sessions', 'saved_searches',
  // Social & content
  'hashtags', 'leaderboards', 'moderation_queue',
  'content_flags', 'account_flags', 'content_items',
  'journey_paths',
  // Marketplace / vendor
  'vendor_profiles',
  // Admin & infrastructure
  'admin_dashboard_widgets', 'push_subscription_stats',
  'transcoding_jobs',
  // Monitoring & alerts
  'alert_rules', 'active_alerts', 'alert_notifications',
  'push_notification_logs',
  // Backup
  'backup_configs', 'backups',
  // AI / recommendations
  'recommendation_feedback', 'recommendation_weights',
  // Analytics execution
  'report_executions',
  // Error tracking
  'error_fingerprints',
  // Social matchmaking
  'user_match_profiles',
  // Webhook queue
  'webhook_delivery_queue', 'webhook_dlq_alerts',
  // Monitoring & logging
  'performance_metrics', 'notification_logs', 'notification_drafts',
  // Blog extensions
  'blog_post_tags', 'blog_tags', 'blog_reading_history',
  // Place extensions
  'place_visits', 'place_visitors', 'place_verification',
  // Review extensions
  'review_flags', 'review_moderation_actions', 'review_reactions', 'review_responses',
  // User extensions
  'blocked_users', 'user_follows', 'user_mentions', 'user_activities',
  'user_interests', 'user_interactions', 'user_preferences', 'user_audit_log',
  'user_loyalty_balance', 'user_points_transactions', 'user_tier_membership',
  'user_reward_achievements',
  // Subscriptions & billing
  'subscriptions', 'subscription_tiers', 'subscription_events', 'billing_history',
  'admin_subscription_logs',
  // Rewards & points
  'reward_redemptions', 'points_transactions',
  // Content & social
  'comment_votes', 'content_shares', 'content_tags', 'content_versions',
  'content_analytics', 'content_audit_trail', 'content_filter_rules', 'content_popularity',
  'discovery_feeds', 'shares',
  // Analytics & conversion
  'analytics_snapshots', 'conversion_funnels', 'conversion_goals', 'conversions',
  'retention_cohorts', 'cohort_members', 'trending_scores', 'request_metrics', 'search_clicks',
  // Admin
  'admin_dashboard_settings',
  // Promotions
  'promotion_redemptions', 'discount_codes',
  // Tier system
  'tier_history', 'tier_reset_schedule',
  // Privacy
  'privacy_settings', 'data_deletion_requests',
  // Video
  'video_captions', 'video_metadata', 'video_streaming_settings', 'video_thumbnails',
  // Webhooks
  'webhook_events',
  // Bus / transit
  'bus_routes', 'bus_schedules',
  // Email templates & newsletters
  'email_templates', 'newsletter_subscribers',
  // Site & admin settings
  'site_settings',
  // Place lifecycle
  'place_sla_alert_state', 'place_lifecycle_events',
  // Recipes
  'recipes',
  // Chat (migration 166)
  'chat_rooms', 'chat_messages', 'chat_participants', 'chat_message_status',
  // Social messaging (migration 167)
  'conversation_participants', 'messages',
  // Search logs (migration 166)
  'search_logs',
  // Reports
  'scheduled_reports',
  // Multi-tenant social
  'tenant_social_policies',
  // Support tickets
  'ticket_responses',
  // Search & user favorites
  'user_searches', 'user_favorites',
  // Email campaigns & sequences
  'campaign_subscribers', 'campaign_targeting', 'campaign_targeting_rules',
  'email_sent_logs', 'email_sequence_steps', 'email_sequences',
  // Events
  'event_attendees',
  // Security / IP filtering
  'encryption_keys', 'ip_blacklist', 'ip_whitelist',
  // Analytics & engagement
  'engagement_events', 'featured_listing_clicks', 'funnel_step_completions',
  'page_views', 'leaderboard_snapshots',
  // Social / community
  'hashtag_usage', 'moderation_actions', 'muted_users',
  'place_badges', 'place_followers', 'place_likes',
  // Notifications
  'notification_channels', 'notification_deliveries',
  // Journeys
  'journey_steps',
  // Analytics & tracking
  'activity_summaries', 'analytics_events_realtime', 'analytics_reports',
  'api_request_logs', 'error_logs', 'heatmap_events', 'tracked_events',
  // Blog & content interactions
  'blog_likes', 'comment_likes', 'review_helpful', 'review_photos',
  'social_shares', 'share_counts',
  // Events
  'event_tickets',
  // Payments & billing
  'invoices', 'payments',
  // Operations & jobs
  'bulk_operations', 'job_executions', 'job_logs',
  'scheduled_jobs', 'scheduled_notifications',
  // Presence & interactions
  'interactions', 'user_presence',
  // Newsletters
  'newsletter_campaigns',
  // Blog extensions
  'blog_categories', 'blog_subscriptions',
  // Admin & audit
  'audit_logs', 'request_logs', 'site_change_audit', 'site_setting_versions', 'user_actions',
  // Business intelligence
  'business_insights', 'business_trends', 'satisfaction_scores',
  // Collections
  'collection_followers', 'place_collections',
  // Content & media
  'content_generation_jobs', 'place_photos',
  // Reviews
  'review_votes',
  // Social
  'social_event_store',
  // Webhooks
  'webhook_deliveries',
  // Memberships
  'memberships',
  // SSR performance metrics (migration 177)
  'ssr_perf_metrics',
]);

function validateTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Table "${table}" is not in the allowed tables list. Add it to ALLOWED_TABLES in postgres.ts if this is a new table.`);
  }
}

// Read replica pool — uses READ_REPLICA_URL when configured, falls back to primary.
// Set READ_REPLICA_URL env var to activate a real replica and halve primary write load.
const READ_REPLICA_URL = process.env.READ_REPLICA_URL;
export const readReplicaPool = READ_REPLICA_URL
  ? (() => {
      const replicaPool = new PgPool({
        connectionString: READ_REPLICA_URL,
        max: isProduction ? 8 : 5,
        min: isProduction ? 1 : 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        allowExitOnIdle: !isProduction,
      });
      replicaPool.on('error', (err) => {
        logger.error('[postgres:replica] Unexpected pool error:', err.message);
      });
      if (process.env.NODE_ENV !== 'test') {
        void import('./lifecycle').then(({ registerShutdownHandler }) => {
          registerShutdownHandler(async () => {
            logger.info('[postgres:replica] Draining pool...');
            await replicaPool.end();
          });
        });
      }
      logger.info('[postgres] Read replica pool connected');
      return replicaPool;
    })()
  : pool;

export {pool, ALLOWED_TABLES};
export default {
  pool,
  query,
  queryOne,
  queryMany,
  insert,
  update,
  delete: deleteQuery,
  remove: deleteQuery,
  transaction,
  getPool,
  getPoolStatus,
  updatePoolStatus,
};
