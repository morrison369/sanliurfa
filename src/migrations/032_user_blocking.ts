/**
 * Migration 032: User Blocking & Muting System
 * Adds tables for managing blocked and muted users
 */

import type { Migration } from '../lib/migrations';

export const migration_032_user_blocking: Migration = {
  version: '032_user_blocking',
  description: 'User blocking and muting functionality',

  up: async (pool: any) => {
    // User blocks - prevents communication and interaction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id),
        CHECK (blocker_id != blocked_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
      CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
      CREATE INDEX IF NOT EXISTS idx_user_blocks_created ON user_blocks(created_at DESC);
    `);

    -- User mutes - hides user's content from feed without blocking messaging
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_mutes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        muter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(muter_id, muted_id),
        CHECK (muter_id != muted_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
      CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON user_mutes(muted_id);
    `);

    -- Blocked message attempts - audit log of attempts to message blocked users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_message_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempted_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_blocked_attempts_sender ON blocked_message_attempts(sender_id, attempted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_blocked_attempts_recipient ON blocked_message_attempts(recipient_id, attempted_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS blocked_message_attempts CASCADE;
      DROP TABLE IF EXISTS user_mutes CASCADE;
      DROP TABLE IF EXISTS user_blocks CASCADE;
    `);
  }
};
