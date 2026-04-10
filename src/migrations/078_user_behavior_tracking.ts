/**
 * Migration 078: User Behavior Tracking
 * Session tracking, page views, and user journey analytics
 */

import type { Migration } from '../lib/migrations';

export const migration_078_user_behavior_tracking: Migration = {
  version: '078_user_behavior_tracking',
  description: 'Session tracking, page views, and user journey analytics',
  up: async (pool: any) => {
  try {
    // User sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        ip_address INET,
        user_agent TEXT,
        country VARCHAR(100),
        city VARCHAR(100),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        referrer TEXT,
        utm_source VARCHAR(255),
        utm_medium VARCHAR(255),
        utm_campaign VARCHAR(255),
        started_at TIMESTAMP DEFAULT NOW(),
        last_activity_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        duration_seconds INT,
        page_view_count INT DEFAULT 0,
        interaction_count INT DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user
      ON user_sessions(user_id, started_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id
      ON user_sessions(session_id)
    `);

    // Page views
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        page_url TEXT NOT NULL,
        page_title TEXT,
        referrer_url TEXT,
        time_on_page_seconds INT,
        scroll_depth INT,
        event_count INT DEFAULT 0,
        viewed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_page_views_session
      ON page_views(session_id, viewed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_page_views_user
      ON page_views(user_id, viewed_at DESC)
    `);

    // User interactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        interaction_type VARCHAR(50) NOT NULL,
        interaction_target VARCHAR(255),
        interaction_data JSONB,
        page_url TEXT,
        occurred_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_session
      ON user_interactions(session_id, interaction_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_user
      ON user_interactions(user_id, interaction_type, occurred_at DESC)
    `);

    // Search tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) REFERENCES user_sessions(session_id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        search_query TEXT NOT NULL,
        search_filters JSONB,
        result_count INT,
        clicked_result_index INT,
        clicked_result_id UUID,
        search_duration_seconds INT,
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_user
      ON search_analytics(user_id, searched_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_query
      ON search_analytics(search_query, searched_at DESC)
    `);

    console.log('✓ Migration 078 completed: User behavior tracking tables created');
  } catch (error) {
    console.error('Migration 078 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS search_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_interactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS page_views CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE');
    console.log('✓ Migration 078 rolled back');
  } catch (error) {
    console.error('Rollback 078 failed:', error);
    throw error;
  }
  }
};
