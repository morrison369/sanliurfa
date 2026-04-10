/**
 * Migration 075: Notification Preferences
 * User email and notification preference settings
 */

import type { Migration } from '../lib/migrations';

export const migration_075_notification_preferences: Migration = {
  version: '075_notification_preferences',
  description: 'User email and notification preference settings',
  up: async (pool: any) => {
  try {
    // Notification preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        email_digest_frequency VARCHAR(50) DEFAULT 'daily',
        marketing_emails_enabled BOOLEAN DEFAULT true,
        product_updates_enabled BOOLEAN DEFAULT true,
        review_notifications_enabled BOOLEAN DEFAULT true,
        message_notifications_enabled BOOLEAN DEFAULT true,
        comment_notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
      ON notification_preferences(user_id)
    `);

    console.log('✓ Migration 075 completed: Notification preferences created');
  } catch (error) {
    console.error('Migration 075 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notification_preferences CASCADE');
    console.log('✓ Migration 075 rolled back');
  } catch (error) {
    console.error('Rollback 075 failed:', error);
    throw error;
  }
  }
};
