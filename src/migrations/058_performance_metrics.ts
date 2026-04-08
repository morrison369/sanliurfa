/**
 * Migration 058: Client Performance Metrics
 * Track client-side performance metrics for monitoring
 */

import { Pool } from 'pg';

export const migration_058_performance_metrics = async (pool: Pool) => {
  try {
    // Client performance metrics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP DEFAULT NOW(),
        metrics JSONB,
        url TEXT,
        user_agent VARCHAR(500),
        connection_type VARCHAR(50),
        ttfb NUMERIC,
        fcp NUMERIC,
        lcp NUMERIC,
        dcl NUMERIC,
        load NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON client_performance_metrics(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_perf_metrics_url ON client_performance_metrics(url);
    `);

    console.log('✓ Migration 058 completed: Client performance metrics tracking added');
  } catch (error) {
    console.error('Migration 058 failed:', error);
    throw error;
  }
};

export const rollback_058 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS client_performance_metrics CASCADE');
    console.log('✓ Migration 058 rolled back');
  } catch (error) {
    console.error('Rollback 058 failed:', error);
    throw error;
  }
};
