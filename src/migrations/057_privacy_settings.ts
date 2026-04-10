/**
 * Migration 057: Privacy & Data Settings
 * Add privacy controls and data management
 */

import type { Migration } from '../lib/migrations';

export const migration_057_privacy_settings: Migration = {
  version: '057_privacy_settings',
  description: 'Privacy controls and data management settings',
  up: async (pool: any) => {
    try {
    // User privacy settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        profile_public BOOLEAN DEFAULT true,
        show_activity BOOLEAN DEFAULT true,
        show_reviews BOOLEAN DEFAULT true,
        show_email BOOLEAN DEFAULT false,
        allow_messages BOOLEAN DEFAULT true,
        show_followers BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON privacy_settings(user_id);
    `);

    // Blocked users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255),
        blocked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, blocked_user_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);
    `);

    // Data deletion requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(500),
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON data_deletion_requests(scheduled_for);
    `);

    // User notification mutes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS muted_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        muted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, muted_user_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_muted_users_user ON muted_users(user_id);
    `);

    console.log('✓ Migration 057 completed: Privacy & data settings added');
  } catch (error) {
    console.error('Migration 057 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
    try {
    await pool.query('DROP TABLE IF EXISTS muted_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS data_deletion_requests CASCADE');
    await pool.query('DROP TABLE IF EXISTS blocked_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS privacy_settings CASCADE');

    console.log('✓ Migration 057 rolled back');
  } catch (error) {
    console.error('Rollback 057 failed:', error);
    throw error;
  }
  }
};
