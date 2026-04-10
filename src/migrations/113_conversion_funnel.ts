/**
 * Migration 113: Conversion Funnel Tracking
 * Track user progression through defined funnels
 */

import type { Migration } from '../lib/migrations';

export const migration_113_conversion_funnel: Migration = {
  version: '113_conversion_funnel',
  description: 'Track user progression through defined funnels',
  up: async (pool: any) => {
  try {
    // Funnel definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversion_funnels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_name VARCHAR(255) UNIQUE NOT NULL,
        funnel_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        goal_description VARCHAR(500),
        funnel_steps JSONB,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversion_funnels_active
      ON conversion_funnels(is_active, created_at DESC)
    `);

    // Funnel entries (users entering funnels)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funnel_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_id UUID NOT NULL REFERENCES conversion_funnels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        entered_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        completed BOOLEAN DEFAULT false,
        drop_step INT,
        drop_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_entries_funnel
      ON funnel_entries(funnel_id, entered_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_entries_user
      ON funnel_entries(user_id, entered_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_entries_completed
      ON funnel_entries(funnel_id, completed) WHERE completed = true
    `);

    // Funnel step completions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funnel_step_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_entry_id UUID NOT NULL REFERENCES funnel_entries(id) ON DELETE CASCADE,
        funnel_id UUID NOT NULL REFERENCES conversion_funnels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        step_number INT NOT NULL,
        step_name VARCHAR(255),
        completed_at TIMESTAMP DEFAULT NOW(),
        time_from_previous_step_seconds INT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(funnel_entry_id, step_number)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_steps_entry
      ON funnel_step_completions(funnel_entry_id, step_number ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel
      ON funnel_step_completions(funnel_id, completed_at DESC)
    `);

    // Funnel analytics (aggregated metrics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funnel_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_id UUID NOT NULL REFERENCES conversion_funnels(id) ON DELETE CASCADE,
        analytics_date DATE NOT NULL,
        total_entries INT DEFAULT 0,
        completed_entries INT DEFAULT 0,
        completion_rate FLOAT,
        avg_completion_time_seconds INT,
        drop_off_by_step JSONB,
        funnel_visualization JSONB,
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(funnel_id, analytics_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_funnel_analytics_date
      ON funnel_analytics(funnel_id, analytics_date DESC)
    `);

    console.log('✓ Migration 113 completed: Conversion funnel tracking tables created');
  } catch (error) {
    console.error('Migration 113 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS funnel_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS funnel_step_completions CASCADE');
    await pool.query('DROP TABLE IF EXISTS funnel_entries CASCADE');
    await pool.query('DROP TABLE IF EXISTS conversion_funnels CASCADE');
    console.log('✓ Migration 113 rolled back');
  } catch (error) {
    console.error('Rollback 113 failed:', error);
    throw error;
  }
  }
};
