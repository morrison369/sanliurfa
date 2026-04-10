/**
 * Migration 086: Notification Delivery Tracking
 * Multi-channel delivery status and analytics
 */

import type { Migration } from '../lib/migrations';

export const migration_086_notification_delivery: Migration = {
  version: '086_notification_delivery',
  description: 'Multi-channel delivery status and analytics',
  up: async (pool: any) => {
  try {
    // Delivery tracking across channels
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID NOT NULL REFERENCES notification_history(id) ON DELETE CASCADE,
        delivery_channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        status_message TEXT,
        attempt_count INT DEFAULT 1,
        last_attempt_at TIMESTAMP,
        delivered_at TIMESTAMP,
        failed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_log_notification
      ON notification_delivery_log(notification_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_log_status
      ON notification_delivery_log(status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_log_channel
      ON notification_delivery_log(delivery_channel, status)
    `);

    // Notification channel preferences per user
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_channel_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        priority INT DEFAULT 0,
        retry_count INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, channel)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_prefs_user
      ON notification_channel_preferences(user_id, is_enabled)
    `);

    // Notification type preferences (opt-in/out for specific types)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_type_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        in_app_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT true,
        email_enabled BOOLEAN DEFAULT true,
        frequency VARCHAR(50) DEFAULT 'immediate',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, notification_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_type_prefs_user
      ON notification_type_preferences(user_id)
    `);

    // Daily digest for batching notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_digests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        digest_date DATE NOT NULL,
        notification_count INT DEFAULT 0,
        is_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, digest_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_digests_sent
      ON notification_digests(is_sent, digest_date)
    `);

    console.log('✓ Migration 086 completed: Notification delivery tables created');
  } catch (error) {
    console.error('Migration 086 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notification_digests CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_type_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_channel_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_delivery_log CASCADE');
    console.log('✓ Migration 086 rolled back');
  } catch (error) {
    console.error('Rollback 086 failed:', error);
    throw error;
  }
  }
};
