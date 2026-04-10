/**
 * Migration 087: Search History & Saved Searches
 * User search history and saved search queries
 */

import type { Migration } from '../lib/migrations';

export const migration_087_search_history: Migration = {
  version: '087_search_history',
  description: 'User search history and saved search queries',
  up: async (pool: any) => {
  try {
    // Search history for each user
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        search_query VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) DEFAULT 'places',
        result_count INT DEFAULT 0,
        filters JSONB,
        result_ids UUID[] DEFAULT ARRAY[]::UUID[],
        clicked_result_id UUID,
        session_id VARCHAR(255),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_history_user
      ON search_history(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_history_query
      ON search_history(search_query, user_id)
    `);

    // Saved searches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        search_name VARCHAR(255) NOT NULL,
        search_query VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) DEFAULT 'places',
        filters JSONB,
        sort_by VARCHAR(50) DEFAULT 'relevance',
        is_favorite BOOLEAN DEFAULT false,
        notification_enabled BOOLEAN DEFAULT false,
        last_run_at TIMESTAMP,
        last_result_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user
      ON saved_searches(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_favorite
      ON saved_searches(user_id, is_favorite) WHERE is_favorite = true
    `);

    // Search alerts for saved searches with new results
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        new_result_count INT DEFAULT 0,
        alert_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_alerts_search
      ON search_alerts(saved_search_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_alerts_sent
      ON search_alerts(alert_sent, created_at DESC)
    `);

    console.log('✓ Migration 087 completed: Search history tables created');
  } catch (error) {
    console.error('Migration 087 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS search_alerts CASCADE');
    await pool.query('DROP TABLE IF EXISTS saved_searches CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_history CASCADE');
    console.log('✓ Migration 087 rolled back');
  } catch (error) {
    console.error('Rollback 087 failed:', error);
    throw error;
  }
  }
};
