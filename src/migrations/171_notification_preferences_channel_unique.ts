/**
 * Migration 171: Notification Preferences Channel Uniqueness
 * Align legacy notification_preferences with channel-based atomic upserts.
 */

import { Pool } from 'pg';

export const migration_171_notification_preferences_channel_unique = async (pool: Pool) => {
  try {
    await pool.query(`
      ALTER TABLE notification_preferences
      ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
    `);

    await pool.query(`
      ALTER TABLE notification_preferences
      ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
    `);

    await pool.query(`
      ALTER TABLE notification_preferences
      ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'immediate';
    `);

    await pool.query(`
      ALTER TABLE notification_preferences
      DROP CONSTRAINT IF EXISTS notification_preferences_user_id_key;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_channel_idx
      ON notification_preferences(user_id, channel);
    `);

    console.log('✓ Migration 171 completed: notification preference channel uniqueness aligned');
  } catch (error) {
    console.error('Migration 171 failed:', error);
    throw error;
  }
};

export const rollback_171 = async (pool: Pool) => {
  try {
    await pool.query('DROP INDEX IF EXISTS notification_preferences_user_channel_idx');
    console.log('✓ Migration 171 rolled back');
  } catch (error) {
    console.error('Rollback 171 failed:', error);
    throw error;
  }
};
