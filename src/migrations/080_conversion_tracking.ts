/**
 * Migration 080: Conversion Tracking
 * Goal tracking and conversion funnel analytics
 */

import { Pool } from 'pg';

export const migration_080_conversion_tracking = async (pool: Pool) => {
  try {
    // Goals/conversions tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversion_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_name VARCHAR(255) NOT NULL,
        goal_type VARCHAR(50) NOT NULL,
        goal_description TEXT,
        goal_url_pattern TEXT,
        goal_event_type VARCHAR(100),
        value_cents INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversion_goals_user
      ON conversion_goals(user_id, is_active)
    `);

    // Conversions (goal completions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id UUID NOT NULL REFERENCES conversion_goals(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        conversion_value_cents INT,
        conversion_data JSONB,
        converted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversions_goal
      ON conversions(goal_id, converted_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversions_user
      ON conversions(user_id, converted_at DESC)
    `);

    // Funnel steps
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funnel_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        funnel_name VARCHAR(255) NOT NULL,
        step_order INT NOT NULL,
        step_name VARCHAR(255) NOT NULL,
        step_url_pattern TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, funnel_name, step_order)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_steps_user
      ON funnel_steps(user_id, funnel_name)
    `);

    // Funnel completions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funnel_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_name VARCHAR(255) NOT NULL,
        session_id VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        completed_steps INT DEFAULT 0,
        total_steps INT NOT NULL,
        completion_percentage INT,
        time_to_complete_seconds INT,
        completed_at TIMESTAMP,
        started_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_completions_funnel
      ON funnel_completions(funnel_name, started_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_completions_user
      ON funnel_completions(user_id, started_at DESC)
    `);

    // Attribution tracking (multi-touch attribution)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attribution_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        touchpoint_type VARCHAR(50) NOT NULL,
        touchpoint_source VARCHAR(255),
        touchpoint_medium VARCHAR(100),
        touchpoint_campaign VARCHAR(255),
        touchpoint_content TEXT,
        position_in_path INT,
        attributed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_attribution_events_session
      ON attribution_events(session_id, attributed_at DESC)
    `);

    console.log('✓ Migration 080 completed: Conversion tracking tables created');
  } catch (error) {
    console.error('Migration 080 failed:', error);
    throw error;
  }
};

export const rollback_080 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS attribution_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS funnel_completions CASCADE');
    await pool.query('DROP TABLE IF EXISTS funnel_steps CASCADE');
    await pool.query('DROP TABLE IF EXISTS conversions CASCADE');
    await pool.query('DROP TABLE IF EXISTS conversion_goals CASCADE');
    console.log('✓ Migration 080 rolled back');
  } catch (error) {
    console.error('Rollback 080 failed:', error);
    throw error;
  }
};
