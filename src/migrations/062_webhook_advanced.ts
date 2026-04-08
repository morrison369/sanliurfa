/**
 * Migration 062: Webhook Advanced Features
 * Event replay, templates, and audit logging
 */

import { Pool } from 'pg';

export const migration_062_webhook_advanced = async (pool: Pool) => {
  try {
    // Webhook replays table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_replays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        requested_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        error_message TEXT
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_replays_webhook
      ON webhook_replays(webhook_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_replays_status
      ON webhook_replays(status);
    `);

    // Webhook templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        event VARCHAR(100) NOT NULL,
        timeout_seconds INT DEFAULT 30,
        max_retries INT DEFAULT 3,
        retry_delay_ms INT DEFAULT 60000,
        rate_limit INT DEFAULT 0,
        rate_limit_window INT DEFAULT 3600,
        enabled BOOLEAN DEFAULT true,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, name)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_templates_user
      ON webhook_templates(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_templates_usage
      ON webhook_templates(usage_count DESC);
    `);

    // Webhook audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_audit_webhook
      ON webhook_audit_logs(webhook_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_audit_user
      ON webhook_audit_logs(user_id, created_at DESC);
    `);

    console.log('✓ Migration 062 completed: Webhook advanced features added');
  } catch (error) {
    console.error('Migration 062 failed:', error);
    throw error;
  }
};

export const rollback_062 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS webhook_replays CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhook_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhook_audit_logs CASCADE');
    console.log('✓ Migration 062 rolled back');
  } catch (error) {
    console.error('Rollback 062 failed:', error);
    throw error;
  }
};
