/**
 * Migration 081: Admin Dashboard Widgets & Settings
 * Dashboard customization and configuration
 */

import { Pool } from 'pg';

export const migration_081_admin_dashboard = async (pool: Pool) => {
  try {
    // Admin dashboard widget preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_dashboard_widgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        widget_type VARCHAR(100) NOT NULL,
        widget_config JSONB DEFAULT '{}',
        position_order INT DEFAULT 0,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_admin
      ON admin_dashboard_widgets(admin_id)
    `);

    // Admin dashboard settings (global/per-admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_dashboard_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB NOT NULL,
        is_global BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(admin_id, setting_key)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_settings_admin
      ON admin_dashboard_settings(admin_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_settings_key
      ON admin_dashboard_settings(setting_key)
    `);

    // Dashboard refresh events (for real-time updates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_refresh_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_events_type
      ON dashboard_refresh_events(event_type, created_at DESC)
    `);

    console.log('✓ Migration 081 completed: Admin dashboard tables created');
  } catch (error) {
    console.error('Migration 081 failed:', error);
    throw error;
  }
};

export const rollback_081 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS dashboard_refresh_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS admin_dashboard_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS admin_dashboard_widgets CASCADE');
    console.log('✓ Migration 081 rolled back');
  } catch (error) {
    console.error('Rollback 081 failed:', error);
    throw error;
  }
};
