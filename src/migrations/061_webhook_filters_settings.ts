/**
 * Migration 061: Webhook Filters and Settings
 * Add filtering and advanced configuration for webhooks
 */

import { Pool } from 'pg';

export const migration_061_webhook_filters_settings = async (pool: Pool) => {
  try {
    // Webhook filters table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        filter_type VARCHAR(50) NOT NULL,
        filter_key VARCHAR(255) NOT NULL,
        operator VARCHAR(50) NOT NULL,
        filter_value JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_filters_webhook
      ON webhook_filters(webhook_id);
    `);

    // Webhook settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_settings (
        webhook_id UUID PRIMARY KEY REFERENCES webhooks(id) ON DELETE CASCADE,
        timeout_seconds INT DEFAULT 30,
        max_retries INT DEFAULT 3,
        retry_delay_ms INT DEFAULT 60000,
        rate_limit INT DEFAULT 0,
        rate_limit_window INT DEFAULT 3600,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create default settings for all existing webhooks
    await pool.query(`
      INSERT INTO webhook_settings (webhook_id)
      SELECT id FROM webhooks
      WHERE id NOT IN (SELECT webhook_id FROM webhook_settings)
      ON CONFLICT (webhook_id) DO NOTHING;
    `);

    console.log('✓ Migration 061 completed: Webhook filters and settings added');
  } catch (error) {
    console.error('Migration 061 failed:', error);
    throw error;
  }
};

export const rollback_061 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS webhook_filters CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhook_settings CASCADE');
    console.log('✓ Migration 061 rolled back');
  } catch (error) {
    console.error('Rollback 061 failed:', error);
    throw error;
  }
};
