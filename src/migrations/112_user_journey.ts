/**
 * Migration 112: User Journey Mapping
 * Track user paths and interactions through the app
 */

import type { Migration } from '../lib/migrations';

export const migration_112_user_journey: Migration = {
  version: '112_user_journey',
  description: 'Track user paths and interactions through the app',
  up: async (pool: any) => {
  try {
    // User journey sessions (tracking user paths)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_journey_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        referrer_source VARCHAR(100),
        landing_page VARCHAR(500),
        utm_source VARCHAR(255),
        utm_medium VARCHAR(255),
        utm_campaign VARCHAR(255),
        utm_content VARCHAR(255),
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        duration_seconds INT,
        page_views INT DEFAULT 0,
        interactions INT DEFAULT 0,
        bounce BOOLEAN DEFAULT false,
        conversion BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_journey_user
      ON user_journey_sessions(user_id, start_time DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_journey_session
      ON user_journey_sessions(session_id, start_time DESC)
    `);

    // User journey steps (individual page/action visits)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journey_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journey_session_id UUID NOT NULL REFERENCES user_journey_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        step_number INT NOT NULL,
        page_url VARCHAR(500),
        page_title VARCHAR(255),
        action_type VARCHAR(100),
        action_label VARCHAR(255),
        action_value VARCHAR(255),
        time_on_page_seconds INT,
        timestamp TIMESTAMP DEFAULT NOW(),
        UNIQUE(journey_session_id, step_number)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_steps_session
      ON journey_steps(journey_session_id, step_number ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_steps_user
      ON journey_steps(user_id, timestamp DESC)
    `);

    // Journey paths (common user paths)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journey_paths (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        path_hash VARCHAR(255) UNIQUE NOT NULL,
        path_sequence TEXT,
        path_length INT,
        user_count INT DEFAULT 0,
        conversion_count INT DEFAULT 0,
        conversion_rate FLOAT,
        avg_duration_seconds INT,
        first_seen TIMESTAMP,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_paths_conversion
      ON journey_paths(conversion_rate DESC, user_count DESC)
    `);

    // User behavior patterns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_behavior_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        behavior_type VARCHAR(100),
        engagement_level VARCHAR(50),
        page_preference JSONB,
        action_frequency JSONB,
        peak_activity_time VARCHAR(50),
        preferred_device VARCHAR(50),
        churn_risk FLOAT DEFAULT 0,
        lifetime_value FLOAT DEFAULT 0,
        last_analyzed TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user
      ON user_behavior_patterns(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_behavior_patterns_risk
      ON user_behavior_patterns(churn_risk DESC)
    `);

    console.log('✓ Migration 112 completed: User journey mapping tables created');
  } catch (error) {
    console.error('Migration 112 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS user_behavior_patterns CASCADE');
    await pool.query('DROP TABLE IF EXISTS journey_paths CASCADE');
    await pool.query('DROP TABLE IF EXISTS journey_steps CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_journey_sessions CASCADE');
    console.log('✓ Migration 112 rolled back');
  } catch (error) {
    console.error('Rollback 112 failed:', error);
    throw error;
  }
  }
};
