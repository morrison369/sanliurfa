/**
 * Migration 034: Account Deletion System
 * Adds account_deletions table and deleted_at column to users table
 */

import type { Migration } from '../lib/migrations';

export const migration_034_account_deletion: Migration = {
  version: '034_account_deletion',
  description: 'Account deletion with grace period and anonymization',

  up: async (pool: any) => {
    // Add deleted_at column to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `);

    // Create account deletions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_deletions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
        scheduled_for TIMESTAMP NOT NULL,
        cancelled_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for efficient lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_account_deletions_user ON account_deletions(user_id);
      CREATE INDEX IF NOT EXISTS idx_account_deletions_status ON account_deletions(status);
      CREATE INDEX IF NOT EXISTS idx_account_deletions_scheduled ON account_deletions(scheduled_for) WHERE status = 'pending';
    `);

    // Create unique constraint - only one pending deletion per user
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletions_pending
      ON account_deletions(user_id) WHERE status = 'pending'
    `);

    // Add index for deleted_at on users table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS account_deletions CASCADE
    `);

    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS deleted_at
    `);
  }
};
