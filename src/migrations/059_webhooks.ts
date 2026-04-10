/**
 * Migration 059: Webhook System
 * Event-driven webhooks for external integrations
 */

import type { Migration } from '../lib/migrations';

export const migration_059_webhooks: Migration = {
  version: '059_webhooks',
  description: 'Webhook registrations and delivery events',
  up: async (pool: any) => {
    try {
    // Webhooks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(255),
        active BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event);
    `);

    // Webhook events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        data JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        next_retry_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
    `);

    console.log('✓ Migration 059 completed: Webhook system added');
  } catch (error) {
    console.error('Migration 059 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
    try {
    await pool.query('DROP TABLE IF EXISTS webhook_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhooks CASCADE');
    console.log('✓ Migration 059 rolled back');
  } catch (error) {
    console.error('Rollback 059 failed:', error);
    throw error;
  }
  }
};
