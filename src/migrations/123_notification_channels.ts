/**
 * Migration 123: Notification Channels & Delivery Tracking
 * Multi-channel notifications (push, SMS, email), delivery tracking, preferences
 */

import { Pool } from 'pg';

export const migration_123_notification_channels = async (pool: Pool) => {
  try {
    // Notification channels (push, email, SMS)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_type VARCHAR(50) NOT NULL,
        identifier VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, channel_type, identifier)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_channels_user
      ON notification_channels(user_id, channel_type)
    `);

    // Push subscriptions (Web Push API)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        auth_key VARCHAR(255) NOT NULL,
        p256dh_key VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
      ON push_subscriptions(user_id, is_active)
    `);

    // Notification delivery log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        failed_reason TEXT,
        retry_count INT DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_notification
      ON notification_deliveries(notification_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_user_status
      ON notification_deliveries(user_id, status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_channel
      ON notification_deliveries(channel_type, status)
    `);

    // SMS messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        provider VARCHAR(50) DEFAULT 'twilio',
        provider_message_id VARCHAR(255),
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        failed_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_user
      ON sms_messages(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_status
      ON sms_messages(status, created_at DESC)
    `);

    // Email templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables VARCHAR(255)[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_active
      ON email_templates(is_active)
    `);

    // Email sending queue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        template_key VARCHAR(100) NOT NULL,
        variables JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        failed_reason TEXT,
        retry_count INT DEFAULT 0,
        priority INT DEFAULT 5,
        scheduled_for TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status
      ON email_queue(status, priority DESC, created_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_user
      ON email_queue(user_id, created_at DESC)
    `);

    // Notification preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        push_enabled BOOLEAN DEFAULT true,
        email_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT false,
        digest_enabled BOOLEAN DEFAULT true,
        digest_frequency VARCHAR(50) DEFAULT 'daily',
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        muted_categories VARCHAR(100)[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prefs_user
      ON notification_preferences(user_id)
    `);

    // Notification digest (daily/weekly summary)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_digests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        digest_type VARCHAR(50),
        content JSONB,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_digests_user
      ON notification_digests(user_id, created_at DESC)
    `);

    console.log('✓ Migration 123 completed: Notification channels and delivery tracking created');
  } catch (error) {
    console.error('Migration 123 failed:', error);
    throw error;
  }
};

export const rollback_123 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notification_digests CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_queue CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS sms_messages CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_deliveries CASCADE');
    await pool.query('DROP TABLE IF EXISTS push_subscriptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_channels CASCADE');
    console.log('✓ Migration 123 rolled back');
  } catch (error) {
    console.error('Rollback 123 failed:', error);
    throw error;
  }
};
