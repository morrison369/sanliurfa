import type { Migration } from '../lib/migrations';

export const migration_165_users_ban_suspend_columns: Migration = {
  version: '165_users_ban_suspend_columns',
  description: 'users ban/suspend kolonları + reviews owner_response kolonları',

  up: async (pool: any) => {
    // users: ban/suspend/block alanları (moderation, bulk-action, fraud-detection)
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS ban_reason TEXT,
        ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
        ADD COLUMN IF NOT EXISTS blocked_reason TEXT
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true
    `);

    // reviews: işletme sahibi yanıt alanları (business-portal)
    await pool.query(`
      ALTER TABLE reviews
        ADD COLUMN IF NOT EXISTS owner_response TEXT,
        ADD COLUMN IF NOT EXISTS owner_responded_at TIMESTAMP
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS is_banned,
        DROP COLUMN IF EXISTS ban_reason,
        DROP COLUMN IF EXISTS banned_at,
        DROP COLUMN IF EXISTS ban_expires_at,
        DROP COLUMN IF EXISTS is_suspended,
        DROP COLUMN IF EXISTS suspension_reason,
        DROP COLUMN IF EXISTS blocked_reason
    `);

    await pool.query(`
      ALTER TABLE reviews
        DROP COLUMN IF EXISTS owner_response,
        DROP COLUMN IF EXISTS owner_responded_at
    `);
  },
};
