/**
 * Migration 054: Email Notifications
 * Add email template and notification tracking tables
 */

import { Pool } from 'pg';

export const migration_054_email_notifications = async (pool: Pool) => {
  try {
    // Email templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        subject VARCHAR(255) NOT NULL,
        html_body TEXT NOT NULL,
        text_body TEXT,
        variables JSONB,
        category VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_name
      ON email_templates(name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_category
      ON email_templates(category)
    `);

    // Email preferences (user opt-out)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        marketing_emails BOOLEAN DEFAULT true,
        billing_emails BOOLEAN DEFAULT true,
        subscription_emails BOOLEAN DEFAULT true,
        notification_emails BOOLEAN DEFAULT true,
        digest_frequency VARCHAR(20) DEFAULT 'weekly',
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_preferences_user
      ON email_preferences(user_id)
    `);

    // Email sent logs (for tracking and analytics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sent_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_email VARCHAR(255) NOT NULL,
        template_name VARCHAR(100),
        subject VARCHAR(255),
        event_type VARCHAR(50),
        event_id UUID,
        status VARCHAR(20) DEFAULT 'sent',
        error_message TEXT,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        unsubscribed_at TIMESTAMP,
        metadata JSONB,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sent_logs_user
      ON email_sent_logs(user_id, sent_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sent_logs_event
      ON email_sent_logs(event_type, sent_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sent_logs_status
      ON email_sent_logs(status, sent_at DESC)
    `);

    // Email queue (for delayed sending)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_email VARCHAR(255) NOT NULL,
        template_name VARCHAR(100) NOT NULL,
        template_variables JSONB,
        priority INTEGER DEFAULT 5,
        scheduled_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status
      ON email_queue(status, priority DESC, scheduled_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_user
      ON email_queue(user_id, created_at DESC)
    `);

    // Unsubscribe tokens (for email unsubscribe links)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_token
      ON email_unsubscribe_tokens(token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_user
      ON email_unsubscribe_tokens(user_id)
    `);

    console.log('✓ Migration 054 completed: Email notification tables created');
  } catch (error) {
    console.error('Migration 054 failed:', error);
    throw error;
  }
};

export const rollback_054 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS email_unsubscribe_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_queue CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_sent_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_templates CASCADE');

    console.log('✓ Migration 054 rolled back');
  } catch (error) {
    console.error('Rollback 054 failed:', error);
    throw error;
  }
};
