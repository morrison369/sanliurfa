/**
 * Migration 127: Performance Optimization Indexes
 * Critical indexes for query optimization
 * 
 * NOT: SQL dosyasından TypeScript migrasyonuna dönüştürüldü
 * @see add-performance-indexes.sql
 */

import type { Migration } from '../lib/migrations';

export const migration_127_performance_indexes: Migration = {
  version: '127_performance_indexes',
  description: 'Add 8 critical indexes for query optimization',

  up: async (pool: any) => {
    const canCreate = async (tableName: string, requiredCols: string[]) => {
      const tableCheck = await pool.query(
        `SELECT to_regclass($1) AS table_ref`,
        [tableName],
      );
      if (!tableCheck.rows?.[0]?.table_ref) return false;

      for (const col of requiredCols) {
        const colCheck = await pool.query(
          `
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
            LIMIT 1
          `,
          [tableName, col],
        );
        if (colCheck.rowCount === 0) return false;
      }

      return true;
    };

    const createIndexSafe = async (
      indexSql: string,
      tableName: string,
      requiredCols: string[],
      label: string,
    ) => {
      if (await canCreate(tableName, requiredCols)) {
        await pool.query(indexSql);
      } else {
        console.log(`- Skip ${label}: ${tableName} veya kolonlar mevcut degil`);
      }
    };

    // 1. Loyalty transactions (used in points balance queries)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_created 
      ON loyalty_transactions(user_id, created_at DESC)
      `,
      'loyalty_transactions',
      ['user_id', 'created_at'],
      'idx_loyalty_transactions_user_created',
    );

    // 2. Place daily metrics (used in analytics queries)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_place_daily_metrics_place_date 
      ON place_daily_metrics(place_id, metric_date DESC)
      `,
      'place_daily_metrics',
      ['place_id', 'metric_date'],
      'idx_place_daily_metrics_place_date',
    );

    // 3. Subscriptions (used in admin subscriptions list)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
      ON user_subscriptions(user_id, status)
      `,
      'user_subscriptions',
      ['user_id', 'status'],
      'idx_subscriptions_user_status',
    );

    // 4. Notifications (used in notifications list)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
      ON notifications(user_id, read, created_at DESC)
      `,
      'notifications',
      ['user_id', 'read', 'created_at'],
      'idx_notifications_user_read',
    );

    // 5. User achievements (used in achievements queries)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user_achievement 
      ON user_achievements(user_id, achievement_id)
      `,
      'user_achievements',
      ['user_id', 'achievement_id'],
      'idx_user_achievements_user_achievement',
    );

    // 6. Followers (used in social feed)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_followers_follower_created 
      ON followers(follower_id, created_at DESC)
      `,
      'followers',
      ['follower_id', 'created_at'],
      'idx_followers_follower_created',
    );

    // 7. User activity (used in feed queries)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_created 
      ON user_activity(user_id, created_at DESC)
      `,
      'user_activity',
      ['user_id', 'created_at'],
      'idx_user_activity_user_created',
    );

    // 8. Reviews place index (used in analytics joins)
    await createIndexSafe(
      `
      CREATE INDEX IF NOT EXISTS idx_reviews_place_created 
      ON reviews(place_id, created_at DESC)
      `,
      'reviews',
      ['place_id', 'created_at'],
      'idx_reviews_place_created',
    );

    console.log('✓ Migration 127: Performance indexes created (8 indexes)');
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_loyalty_transactions_user_created`);
    await pool.query(`DROP INDEX IF EXISTS idx_place_daily_metrics_place_date`);
    await pool.query(`DROP INDEX IF EXISTS idx_subscriptions_user_status`);
    await pool.query(`DROP INDEX IF EXISTS idx_notifications_user_read`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_achievements_user_achievement`);
    await pool.query(`DROP INDEX IF EXISTS idx_followers_follower_created`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_activity_user_created`);
    await pool.query(`DROP INDEX IF EXISTS idx_reviews_place_created`);
    console.log('✓ Migration 127 rolled back');
  }
};
