/**
 * Migration 129: Webhook delivery retry and status indexes
 * Adds indexes aligned with runtime lookup/retry query patterns.
 */

import type { Migration } from '../lib/migrations';

export const migration_129_webhook_delivery_retry_indexes: Migration = {
  version: '129_webhook_delivery_retry_indexes',
  description: 'Add webhook delivery indexes for status/retry/event query patterns',
  up: async (pool: any) => {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_last_tried_retry
      ON webhook_deliveries(status, last_tried_at, retry_count);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_status
      ON webhook_deliveries(stripe_event_id, status)
      WHERE stripe_event_id IS NOT NULL;
    `);
  },
  down: async (pool: any) => {
    await pool.query(`
      DROP INDEX IF EXISTS idx_webhook_deliveries_event_status;
      DROP INDEX IF EXISTS idx_webhook_deliveries_status_last_tried_retry;
    `);
  },
};
