/**
 * Migration 097: Business Dashboard
 * Business owner dashboard settings and configurations
 */

import { Pool } from 'pg';

export const migration_097_business_dashboard = async (pool: Pool) => {
  try {
    // Business dashboard settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_dashboard_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dashboard_theme VARCHAR(50) DEFAULT 'light',
        widgets_config JSONB,
        report_frequency VARCHAR(20) DEFAULT 'weekly',
        auto_response_enabled BOOLEAN DEFAULT false,
        auto_response_template TEXT,
        notification_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, owner_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_settings_owner
      ON business_dashboard_settings(owner_id, created_at DESC)
    `);

    // Performance goals and targets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        goal_name VARCHAR(255) NOT NULL,
        goal_type VARCHAR(100),
        target_value INT,
        current_value INT DEFAULT 0,
        period VARCHAR(20),
        start_date DATE,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        achievement_percentage FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_place
      ON business_goals(place_id, status, end_date DESC)
    `);

    // Weekly/monthly reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        report_type VARCHAR(50),
        period_start DATE,
        period_end DATE,
        report_data JSONB,
        summary TEXT,
        highlights TEXT[],
        recommendations TEXT[],
        generated_at TIMESTAMP DEFAULT NOW(),
        viewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_place_period
      ON business_reports(place_id, period_end DESC)
    `);

    // Comparison with category averages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(100) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        average_value FLOAT,
        median_value FLOAT,
        percentile_75 FLOAT,
        percentile_90 FLOAT,
        period VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category, metric_name, period)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_benchmarks_category
      ON category_benchmarks(category, metric_name)
    `);

    // Business insights and recommendations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        insight_type VARCHAR(100),
        title VARCHAR(255),
        description TEXT,
        priority VARCHAR(20),
        actionable BOOLEAN DEFAULT true,
        action_recommendation TEXT,
        estimated_impact VARCHAR(255),
        generated_at TIMESTAMP DEFAULT NOW(),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_insights_place
      ON business_insights(place_id, priority, generated_at DESC)
    `);

    console.log('✓ Migration 097 completed: Business dashboard tables created');
  } catch (error) {
    console.error('Migration 097 failed:', error);
    throw error;
  }
};

export const rollback_097 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS business_insights CASCADE');
    await pool.query('DROP TABLE IF EXISTS category_benchmarks CASCADE');
    await pool.query('DROP TABLE IF EXISTS business_reports CASCADE');
    await pool.query('DROP TABLE IF EXISTS business_goals CASCADE');
    await pool.query('DROP TABLE IF EXISTS business_dashboard_settings CASCADE');
    console.log('✓ Migration 097 rolled back');
  } catch (error) {
    console.error('Rollback 097 failed:', error);
    throw error;
  }
};
