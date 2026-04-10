/**
 * Migration 125: Advanced Analytics & Business Intelligence
 * Real-time dashboards, KPI tracking, data warehousing, business metrics
 */

import type { Migration } from '../lib/migrations';

export const migration_125_advanced_analytics: Migration = {
  version: '125_advanced_analytics',
  description: 'Real-time dashboards, KPI tracking, data warehousing, business metrics',
  up: async (pool: any) => {
  try {
    // KPI Definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kpi_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        formula VARCHAR(500),
        unit VARCHAR(50),
        target_value FLOAT,
        alert_threshold FLOAT,
        category VARCHAR(100),
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_active
      ON kpi_definitions(is_active, category)
    `);

    // KPI Values (time-series)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kpi_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        value FLOAT NOT NULL,
        target_value FLOAT,
        period_date DATE NOT NULL,
        period_type VARCHAR(50) DEFAULT 'daily',
        is_final BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(kpi_id, period_date, period_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_values_date
      ON kpi_values(kpi_id, period_date DESC)
    `);

    // Business Metrics Snapshots
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_date DATE NOT NULL,
        revenue FLOAT DEFAULT 0,
        user_count INT DEFAULT 0,
        active_users INT DEFAULT 0,
        new_users INT DEFAULT 0,
        engagement_rate FLOAT DEFAULT 0,
        churn_rate FLOAT DEFAULT 0,
        retention_rate FLOAT DEFAULT 0,
        conversion_rate FLOAT DEFAULT 0,
        avg_session_duration INT DEFAULT 0,
        page_views INT DEFAULT 0,
        bounce_rate FLOAT DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(metric_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_date
      ON business_metrics(metric_date DESC)
    `);

    // Dashboard Layouts (customizable dashboards)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT false,
        layout JSONB,
        widgets JSONB,
        refresh_interval INT DEFAULT 300,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_owner
      ON dashboards(owner_id)
    `);

    // Dashboard Widgets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
        widget_type VARCHAR(50) NOT NULL,
        kpi_id UUID REFERENCES kpi_definitions(id) ON DELETE SET NULL,
        position_x INT DEFAULT 0,
        position_y INT DEFAULT 0,
        width INT DEFAULT 4,
        height INT DEFAULT 3,
        config JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_widgets_dashboard
      ON dashboard_widgets(dashboard_id)
    `);

    // Reports (scheduled or manual)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_type VARCHAR(50),
        metric_ids UUID[],
        filters JSONB,
        schedule VARCHAR(50),
        next_run_at TIMESTAMP,
        format VARCHAR(50) DEFAULT 'pdf',
        recipients VARCHAR(255)[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_owner
      ON reports(owner_id)
    `);

    // Report Executions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        execution_time TIMESTAMP DEFAULT NOW(),
        duration_ms INT,
        status VARCHAR(50),
        data_rows INT DEFAULT 0,
        file_path TEXT,
        sent_to VARCHAR(255)[],
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_executions_report
      ON report_executions(report_id, execution_time DESC)
    `);

    // Data Segments (cohorts for analysis)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        segment_type VARCHAR(50),
        filters JSONB NOT NULL,
        member_count INT DEFAULT 0,
        last_updated TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_segments_type
      ON data_segments(segment_type)
    `);

    // Alerts (threshold violations)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metric_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        alert_type VARCHAR(50),
        threshold_value FLOAT,
        condition VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        notify_users UUID[],
        triggered_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_kpi
      ON metric_alerts(kpi_id, is_active)
    `);

    // Export Templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS export_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        export_format VARCHAR(50),
        columns VARCHAR(255)[],
        filters JSONB,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Data Warehouse Dimensions (for OLAP cubes)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_dimensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dimension_name VARCHAR(100) NOT NULL,
        hierarchy_level INT DEFAULT 1,
        members JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✓ Migration 125 completed: Advanced analytics tables created');
  } catch (error) {
    console.error('Migration 125 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS warehouse_dimensions CASCADE');
    await pool.query('DROP TABLE IF EXISTS export_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS metric_alerts CASCADE');
    await pool.query('DROP TABLE IF EXISTS data_segments CASCADE');
    await pool.query('DROP TABLE IF EXISTS report_executions CASCADE');
    await pool.query('DROP TABLE IF EXISTS reports CASCADE');
    await pool.query('DROP TABLE IF EXISTS dashboard_widgets CASCADE');
    await pool.query('DROP TABLE IF EXISTS dashboards CASCADE');
    await pool.query('DROP TABLE IF EXISTS business_metrics CASCADE');
    await pool.query('DROP TABLE IF EXISTS kpi_values CASCADE');
    await pool.query('DROP TABLE IF EXISTS kpi_definitions CASCADE');
    console.log('✓ Migration 125 rolled back');
  } catch (error) {
    console.error('Rollback 125 failed:', error);
    throw error;
  }
  }
};
