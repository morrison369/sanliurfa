/**
 * Migration 060: Webhook Analytics Enhancements
 * Add columns for better webhook tracking and analytics
 */

import { Pool } from 'pg';

export const migration_060_webhook_analytics = async (pool: Pool) => {
  try {
    // Add analytics columns to webhook_events
    await pool.query(`
      ALTER TABLE webhook_events
      ADD COLUMN IF NOT EXISTS response_code INT,
      ADD COLUMN IF NOT EXISTS response_body TEXT,
      ADD COLUMN IF NOT EXISTS delivery_time_ms INT,
      ADD COLUMN IF NOT EXISTS error_message TEXT;
    `);

    // Add retry tracking
    await pool.query(`
      ALTER TABLE webhooks
      ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error TEXT;
    `);

    // Add index for analytics queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created
      ON webhook_events(status, created_at DESC);
    `);

    // Add index for delivery time analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_time
      ON webhook_events(delivery_time_ms) WHERE delivery_time_ms IS NOT NULL;
    `);

    console.log('✓ Migration 060 completed: Webhook analytics enhancements added');
  } catch (error) {
    console.error('Migration 060 failed:', error);
    throw error;
  }
};

export const rollback_060 = async (pool: Pool) => {
  try {
    // Remove analytics columns
    await pool.query(`
      ALTER TABLE webhook_events
      DROP COLUMN IF EXISTS response_code,
      DROP COLUMN IF EXISTS response_body,
      DROP COLUMN IF EXISTS delivery_time_ms,
      DROP COLUMN IF EXISTS error_message;
    `);

    await pool.query(`
      ALTER TABLE webhooks
      DROP COLUMN IF EXISTS retry_count,
      DROP COLUMN IF EXISTS last_error;
    `);

    // Drop indexes
    await pool.query('DROP INDEX IF EXISTS idx_webhook_events_status_created');
    await pool.query('DROP INDEX IF EXISTS idx_webhook_events_delivery_time');

    console.log('✓ Migration 060 rolled back');
  } catch (error) {
    console.error('Rollback 060 failed:', error);
    throw error;
  }
};
