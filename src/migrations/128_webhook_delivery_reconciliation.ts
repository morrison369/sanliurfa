/**
 * Migration 128: Webhook delivery schema reconciliation
 * Reconciles legacy and newer webhook_deliveries / webhook_replays schemas.
 */

import type { Migration } from '../lib/migrations';

export const migration_128_webhook_delivery_reconciliation: Migration = {
  version: '128_webhook_delivery_reconciliation',
  description: 'Reconcile webhook deliveries and replays schema variants',
  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE webhook_deliveries
      ADD COLUMN IF NOT EXISTS webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS stripe_event_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS status_code INTEGER,
      ADD COLUMN IF NOT EXISTS http_status INTEGER,
      ADD COLUMN IF NOT EXISTS response_body TEXT,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_tried_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id
      ON webhook_deliveries(webhook_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_created
      ON webhook_deliveries(status, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_stripe_event
      ON webhook_deliveries(stripe_event_id)
      WHERE stripe_event_id IS NOT NULL;
    `);

    await pool.query(`
      ALTER TABLE webhook_replays
      ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 8,
      ADD COLUMN IF NOT EXISTS last_tried_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_replays_retry_schedule
      ON webhook_replays(status, next_retry_at, retry_count);
    `);
  },
  down: async (pool: any) => {
    await pool.query(`
      DROP INDEX IF EXISTS idx_webhook_replays_retry_schedule;
      DROP INDEX IF EXISTS idx_webhook_deliveries_stripe_event;
      DROP INDEX IF EXISTS idx_webhook_deliveries_status_created;
    `);
  },
};
