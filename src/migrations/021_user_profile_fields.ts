/**
 * Migration 021: User Profile Fields
 * Adds missing columns to users table (avatar_url, bio, points, level, username, reset_token)
 */

import type { Migration } from '../lib/migrations';

export const migration_021_user_profile_fields: Migration = {
  version: '021_user_profile_fields',
  description: 'User profile fields and account recovery columns',
  async up(pool: any) {
    // Add missing columns
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username
      ON users(username)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_points
      ON users(points DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_level
      ON users(level DESC)
    `);
  },

  async down(pool: any) {
    // Rollback (optional, migrations typically don't rollback in production)
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS username,
      DROP COLUMN IF EXISTS avatar_url,
      DROP COLUMN IF EXISTS bio,
      DROP COLUMN IF EXISTS points,
      DROP COLUMN IF EXISTS level,
      DROP COLUMN IF EXISTS reset_token,
      DROP COLUMN IF EXISTS reset_token_expires
    `);
  }
};
