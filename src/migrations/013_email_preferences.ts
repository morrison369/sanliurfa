/**
 * Migration 013: Email Preferences Table
 * Creates email_preferences table for user notification settings
 */

import type { Migration } from '../lib/migrations';

export const migration_013_email_preferences: Migration = {
  version: '013_email_preferences',
  description: 'Email preferences table for user notification settings',
  async up(pool: any) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_preferences (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        review_response BOOLEAN DEFAULT true,
        new_review BOOLEAN DEFAULT true,
        weekly_summary BOOLEAN DEFAULT true,
        promotional BOOLEAN DEFAULT false,
        account_changes BOOLEAN DEFAULT true,
        preferred_channel VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for user lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id
      ON email_preferences(user_id)
    `);

    console.log('✓ Migration 013: Email preferences table created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS email_preferences CASCADE');
    console.log('✓ Migration 013 rolled back');
  }
};
