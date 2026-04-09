/**
 * Migration 127: Webhook replay idempotency
 * Prevent duplicate pending/completed replay requests for same webhook+event pair.
 */

import type { Migration } from '../lib/migrations';

export const migration_127_webhook_replay_idempotency: Migration = {
  version: '127_webhook_replay_idempotency',
  description: 'Add partial unique index for webhook replay idempotency',

  up: async (pool: any) => {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_replays_idempotent_active
      ON webhook_replays(webhook_id, event_id)
      WHERE status IN ('pending', 'completed');
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP INDEX IF EXISTS idx_webhook_replays_idempotent_active;
    `);
  },
};
