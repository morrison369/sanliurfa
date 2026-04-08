/**
 * Migration 030: User Settings & Preferences
 * Adds settings columns to users table for notifications, privacy, 2FA, language, theme, etc.
 */

import type { Migration } from '../lib/migrations';

export const migration_030_user_settings: Migration = {
  version: '030_user_settings',
  description: 'User settings and preferences (notifications, privacy, 2FA, language, theme, security)',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true, "digest": "weekly"}'::jsonb,
      ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_public": true, "show_email": false, "allow_messages": true}'::jsonb,
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(32),
      ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'tr',
      ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light',
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
      CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC);
      CREATE INDEX IF NOT EXISTS idx_users_language ON users(language_preference)
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS email_verified,
      DROP COLUMN IF EXISTS email_verified_at,
      DROP COLUMN IF EXISTS notification_preferences,
      DROP COLUMN IF EXISTS privacy_settings,
      DROP COLUMN IF EXISTS two_factor_enabled,
      DROP COLUMN IF EXISTS two_factor_secret,
      DROP COLUMN IF EXISTS language_preference,
      DROP COLUMN IF EXISTS theme_preference,
      DROP COLUMN IF EXISTS last_login_at,
      DROP COLUMN IF EXISTS login_attempts,
      DROP COLUMN IF EXISTS account_locked_until
    `);
  }
};
