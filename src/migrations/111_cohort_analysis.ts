/**
 * Migration 111: Cohort Analysis
 * User cohorts and retention tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_111_cohort_analysis: Migration = {
  version: '111_cohort_analysis',
  description: 'User cohorts and retention tracking',
  up: async (pool: any) => {
  try {
    // User cohorts (grouped by signup date, properties, behavior)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_cohorts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_name VARCHAR(255) UNIQUE NOT NULL,
        cohort_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        cohort_type VARCHAR(50),
        creation_criteria JSONB,
        member_count INT DEFAULT 0,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_cohorts_active
      ON user_cohorts(is_active, created_at DESC)
    `);

    // Cohort members (users in each cohort)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cohort_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_id UUID NOT NULL REFERENCES user_cohorts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cohort_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort
      ON cohort_members(cohort_id, joined_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cohort_members_user
      ON cohort_members(user_id, cohort_id)
    `);

    // Retention tracking (weekly/monthly retention rates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS retention_cohorts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_id UUID NOT NULL REFERENCES user_cohorts(id) ON DELETE CASCADE,
        week_number INT,
        period_type VARCHAR(50),
        total_users INT DEFAULT 0,
        active_users INT DEFAULT 0,
        retention_rate FLOAT,
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cohort_id, week_number, period_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_retention_cohorts_cohort
      ON retention_cohorts(cohort_id, week_number DESC)
    `);

    // Cohort activity metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cohort_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_id UUID NOT NULL REFERENCES user_cohorts(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        metric_type VARCHAR(100),
        metric_value FLOAT,
        user_count INT,
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cohort_id, metric_date, metric_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cohort_metrics_date
      ON cohort_metrics(cohort_id, metric_date DESC)
    `);

    console.log('✓ Migration 111 completed: Cohort analysis tables created');
  } catch (error) {
    console.error('Migration 111 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS cohort_metrics CASCADE');
    await pool.query('DROP TABLE IF EXISTS retention_cohorts CASCADE');
    await pool.query('DROP TABLE IF EXISTS cohort_members CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_cohorts CASCADE');
    console.log('✓ Migration 111 rolled back');
  } catch (error) {
    console.error('Rollback 111 failed:', error);
    throw error;
  }
  }
};
