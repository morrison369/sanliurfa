/**
 * Migration 055: OAuth Support
 * Add OAuth provider columns to users table
 */

import type { Migration } from '../lib/migrations';

export const migration_055_oauth_support: Migration = {
  version: '055_oauth_support',
  description: 'OAuth provider columns and oauth link records',
  up: async (pool: any) => {
    try {
    // Add OAuth columns to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_verified BOOLEAN DEFAULT false;
    `);

    // Create unique indexes for OAuth IDs
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;
    `);

    // OAuth links table (for users linking multiple OAuth providers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        provider_email VARCHAR(255),
        linked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_links_user ON oauth_links(user_id);
    `);

    console.log('✓ Migration 055 completed: OAuth support added');
  } catch (error) {
    console.error('Migration 055 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
    try {
    await pool.query('DROP TABLE IF EXISTS oauth_links CASCADE');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS oauth_verified');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS github_id');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS facebook_id');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS google_id');

    console.log('✓ Migration 055 rolled back');
  } catch (error) {
    console.error('Rollback 055 failed:', error);
    throw error;
  }
  }
};
