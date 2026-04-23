/**
 * Migration 132: Social match moderation logs
 * Adds audit log table for user/admin match state actions.
 */

import type { Migration } from '../lib/migrations';

export const migration_132_social_match_moderation_logs: Migration = {
  version: '132_social_match_moderation_logs',
  description: 'Create social match moderation audit log table',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_match_moderation_logs (
        id BIGSERIAL PRIMARY KEY,
        match_id BIGINT NOT NULL REFERENCES social_matches(id) ON DELETE CASCADE,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(40) NOT NULL CHECK (action IN ('unmatch_by_user', 'deactivate_by_admin', 'reactivate_by_admin')),
        reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_social_match_logs_match_id ON social_match_moderation_logs(match_id, created_at DESC);'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_social_match_logs_actor ON social_match_moderation_logs(actor_user_id, created_at DESC);'
    );
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS social_match_moderation_logs');
  }
};
